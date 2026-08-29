import { supabase } from '../supabase.js';
import { getCurrentUser, getProfile, signOut } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import { logoIcon, shieldIcon, usersIcon, childrenIcon, closeIcon, avatarInitials } from '../icons.js';

let currentTab = 'overview';
let profiles = [];
let groups = [];
let childrenList = [];

export async function renderAdmin() {
  const app = document.getElementById('app');

  const user = await getCurrentUser();
  if (!user) {
    navigate('/login');
    return;
  }

  const { profile } = await getProfile(user.id);
  if (profile?.role !== 'admin') {
    navigate('/welcome');
    return;
  }

  async function loadData() {
    const [pRes, gRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('children').select('*')
    ]);
    profiles = pRes.data || [];
    groups = gRes.data || [];
    childrenList = cRes.data || [];
  }

  function renderApp() {
    let tabHtml = '';

    if (currentTab === 'overview') {
      const teachersCount = profiles.filter(p => p.role === 'teacher').length;
      const parentsCount = profiles.filter(p => p.role === 'parent').length;
      const adminsCount = profiles.filter(p => p.role === 'admin').length;

      tabHtml = `
        <div class="admin-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-accent);">${groups.length}</div>
            <div style="font-weight: 600;">Групп</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-blue);">${childrenList.length}</div>
            <div style="font-weight: 600;">Детей</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-teal);">${teachersCount}</div>
            <div style="font-weight: 600;">Воспитателей</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-purple);">${parentsCount}</div>
            <div style="font-weight: 600;">Родителей</div>
          </div>
        </div>
      `;
    } else if (currentTab === 'groups') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 15px;">
          ${groups.length === 0 ? '<p>Нет групп.</p>' : groups.map(g => {
            const teacher = profiles.find(p => p.id === g.created_by);
            const groupChildren = childrenList.filter(c => c.group_id === g.id);
            return `
              
              <div class="child-card" style="padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h3 style="margin: 0 0 10px 0;">${g.name} (Код: <strong>${g.invite_code}</strong>)</h3>
                    <p style="margin: 5px 0;">Воспитатель: ${teacher ? teacher.first_name + ' ' + teacher.last_name : 'Неизвестен'}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: var(--color-text-secondary);">Детей: ${groupChildren.length}</p>
                  </div>
                  <button class="btn btn-secondary btn-sm btn-delete-group" data-id="${g.id}" style="color: red; border-color: red;">Удалить</button>
                </div>
              </div>

            `;
          }).join('')}
        </div>
      `;
    } else if (currentTab === 'users') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 10px;">
          ${profiles.map(p => `
            
            <div class="child-card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="display: block;">${p.first_name} ${p.last_name}</strong>
                <span style="font-size: 0.8rem; color: var(--color-text-secondary); text-transform: capitalize;">${p.role}</span>
              </div>
              <button class="btn btn-secondary btn-sm btn-delete-user" data-id="${p.id}" style="color: red; border-color: red;">Удалить</button>
            </div>

            </div>
          `).join('')}
        </div>
      `;
    }

    app.innerHTML = `
    <header class="app-header">
      <div class="header-inner">
        <div class="header-title">
          <span class="header-logo">${logoIcon(30)}</span>
          <div>
            <h1>Панель управления</h1>
            <div class="header-subtitle">BalaQ Admin</div>
          </div>
        </div>
        
        <button class="header-profile-btn" id="btn-profile">
          ${profile.avatar_url 
            ? `<img src="${profile.avatar_url}" alt="Profile" class="header-avatar-img" />`
            : `<div class="header-avatar" style="--avatar-hue: ${(profile.first_name.charCodeAt(0) * 37) % 360}">${profile.first_name[0] || ''}${profile.last_name[0] || ''}</div>`
          }
        </button>

      </div>
    </header>

    <div class="tabs">
      <button class="tab-btn ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">${shieldIcon(16)} Обзор</button>
      <button class="tab-btn ${currentTab === 'groups' ? 'active' : ''}" data-tab="groups">${childrenIcon(16)} Группы</button>
      <button class="tab-btn ${currentTab === 'users' ? 'active' : ''}" data-tab="users">${usersIcon(16)} Люди</button>
    </div>

    <main class="dashboard">
      <div id="main-content">
        ${tabHtml}
      </div>
    </main>
    `;

    document.getElementById('btn-profile')?.addEventListener('click', () => {
      navigate('/profile');
    });

    document.querySelectorAll('.btn-delete-group').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Вы уверены, что хотите удалить эту группу? Это действие нельзя отменить.')) return;
        const id = e.target.dataset.id;
        await supabase.from('groups').delete().eq('id', id);
        groups = groups.filter(g => g.id !== id);
        renderApp();
        showToast('Группа удалена');
      });
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Вы уверены, что хотите удалить этот профиль? Вход для пользователя будет сломан.')) return;
        const id = e.target.dataset.id;
        await supabase.from('profiles').delete().eq('id', id);
        profiles = profiles.filter(p => p.id !== id);
        renderApp();
        showToast('Профиль удален');
      });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        renderApp();
      });
    });
  }

  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-spinner-lg"></div>
      <div class="loading-text">Загрузка данных администратора...</div>
    </div>
  `;

  await loadData();
  renderApp();

  return () => {
    // Cleanup if needed
  };
}
