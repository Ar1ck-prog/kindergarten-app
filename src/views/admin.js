import { supabase } from '../supabase.js';
import { getCurrentUser, getProfile } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import { logoIcon, shieldIcon, usersIcon, childrenIcon, buildingIcon } from '../icons.js';

let currentTab = 'overview';
let profiles = [];
let groups = [];
let childrenList = [];
let kindergartens = [];

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
    const [pRes, gRes, cRes, kRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('groups').select('*'),
      supabase.from('children').select('*'),
      supabase.from('kindergartens').select('*')
    ]);
    profiles = pRes.data || [];
    groups = gRes.data || [];
    childrenList = cRes.data || [];
    kindergartens = kRes.data || [];
  }

  function renderApp() {
    const directors = profiles.filter(p => p.role === 'director');
    const teachers = profiles.filter(p => p.role === 'teacher');
    const parents = profiles.filter(p => p.role === 'parent');

    let tabHtml = '';

    if (currentTab === 'overview') {
      tabHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; margin-top: 20px;">
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-accent);">${kindergartens.length}</div>
            <div style="font-weight: 600;">Садиков</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-blue);">${directors.length}</div>
            <div style="font-weight: 600;">Директоров</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-teal);">${groups.length}</div>
            <div style="font-weight: 600;">Групп</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-purple);">${teachers.length}</div>
            <div style="font-weight: 600;">Воспитателей</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-blue);">${childrenList.length}</div>
            <div style="font-weight: 600;">Детей</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-teal);">${parents.length}</div>
            <div style="font-weight: 600;">Родителей</div>
          </div>
        </div>
      `;
    } else if (currentTab === 'kindergartens') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 15px;">
          ${kindergartens.length === 0 ? '<p style="color: var(--color-text-secondary);">Нет садиков.</p>' : kindergartens.map(kg => {
            const director = profiles.find(p => p.id === kg.created_by);
            const kgGroups = groups.filter(g => g.kindergarten_id === kg.id);
            const kgTeachers = profiles.filter(p => p.role === 'teacher' && p.kindergarten_id === kg.id);
            const kgGroupNames = kgGroups.map(g => g.name);
            const kgChildren = childrenList.filter(c => kgGroupNames.includes(c.group_name));
            return `
              <div class="child-card" style="padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h3 style="margin: 0 0 8px 0;">${buildingIcon(18)} ${kg.name}</h3>
                    <p style="margin: 4px 0; font-size: 0.9rem;">Директор: <strong>${director ? director.first_name + ' ' + director.last_name : 'Неизвестен'}</strong></p>
                    <p style="margin: 4px 0; font-size: 0.85rem; color: var(--color-text-secondary);">
                      Код: <strong>${kg.invite_code}</strong> · Групп: ${kgGroups.length} · Воспитателей: ${kgTeachers.length} · Детей: ${kgChildren.length}
                    </p>
                  </div>
                  <button class="btn btn-secondary btn-sm btn-delete-kg" data-id="${kg.id}" style="color: red; border-color: red;">Удалить</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (currentTab === 'groups') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 15px;">
          ${groups.length === 0 ? '<p style="color: var(--color-text-secondary);">Нет групп.</p>' : groups.map(g => {
            const kg = kindergartens.find(k => k.id === g.kindergarten_id);
            const teacher = profiles.find(p => p.id === g.created_by);
            const groupChildren = childrenList.filter(c => c.group_name === g.name);
            return `
              <div class="child-card" style="padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h3 style="margin: 0 0 8px 0;">${g.name} <span style="font-size: 0.85rem; color: var(--color-text-secondary);">(Код: <strong>${g.invite_code}</strong>)</span></h3>
                    <p style="margin: 4px 0; font-size: 0.9rem;">Садик: ${kg ? kg.name : '—'}</p>
                    <p style="margin: 4px 0; font-size: 0.9rem;">Создал: ${teacher ? teacher.first_name + ' ' + teacher.last_name : 'Неизвестен'}</p>
                    <p style="margin: 4px 0; font-size: 0.85rem; color: var(--color-text-secondary);">Детей: ${groupChildren.length}</p>
                  </div>
                  <button class="btn btn-secondary btn-sm btn-delete-group" data-id="${g.id}" style="color: red; border-color: red;">Удалить</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (currentTab === 'people') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 10px;">
          ${profiles.filter(p => p.role !== 'admin').map(p => {
            const roleLabel = p.role === 'director' ? 'Директор' : p.role === 'teacher' ? 'Воспитатель' : 'Родитель';
            const kg = kindergartens.find(k => k.id === p.kindergarten_id);
            return `
              <div class="child-card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="display: block;">${p.first_name} ${p.last_name}</strong>
                  <span style="font-size: 0.8rem; color: var(--color-text-secondary);">
                    ${roleLabel}${kg ? ' · ' + kg.name : ''}${p.group_name ? ' · Группа: ' + p.group_name : ''}
                  </span>
                </div>
                <button class="btn btn-secondary btn-sm btn-delete-user" data-id="${p.id}" style="color: red; border-color: red;">Удалить</button>
              </div>
            `;
          }).join('')}
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
      <button class="tab-btn ${currentTab === 'kindergartens' ? 'active' : ''}" data-tab="kindergartens">${buildingIcon(16)} Садики</button>
      <button class="tab-btn ${currentTab === 'groups' ? 'active' : ''}" data-tab="groups">${childrenIcon(16)} Группы</button>
      <button class="tab-btn ${currentTab === 'people' ? 'active' : ''}" data-tab="people">${usersIcon(16)} Люди</button>
    </div>

    <main class="dashboard">
      <div id="main-content">
        ${tabHtml}
      </div>
    </main>
    `;

    // Event listeners
    document.getElementById('btn-profile')?.addEventListener('click', () => {
      navigate('/profile');
    });

    document.querySelectorAll('.btn-delete-kg').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Вы уверены? Удаление садика удалит ВСЕ его группы и данные!')) return;
        const id = e.target.dataset.id;
        // Delete groups in this kindergarten first
        await supabase.from('groups').delete().eq('kindergarten_id', id);
        await supabase.from('kindergartens').delete().eq('id', id);
        kindergartens = kindergartens.filter(k => k.id !== id);
        groups = groups.filter(g => g.kindergarten_id !== id);
        renderApp();
        showToast('Садик удалён');
      });
    });

    document.querySelectorAll('.btn-delete-group').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Вы уверены, что хотите удалить эту группу?')) return;
        const id = e.target.dataset.id;
        await supabase.from('groups').delete().eq('id', id);
        groups = groups.filter(g => g.id !== id);
        renderApp();
        showToast('Группа удалена');
      });
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
        const id = e.target.dataset.id;
        await supabase.from('profiles').delete().eq('id', id);
        profiles = profiles.filter(p => p.id !== id);
        renderApp();
        showToast('Профиль удалён');
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

  return () => {};
}
