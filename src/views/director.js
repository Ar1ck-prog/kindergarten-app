import { supabase } from '../supabase.js';
import { getCurrentUser, getProfile, signOut } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import { logoIcon, buildingIcon, usersIcon, childrenIcon, closeIcon, shieldIcon } from '../icons.js';

let currentTab = 'overview';
let profiles = [];
let groups = [];
let childrenList = [];
let kindergarten = null;

export async function renderDirector() {
  const app = document.getElementById('app');

  const user = await getCurrentUser();
  if (!user) {
    navigate('/login');
    return;
  }

  const { profile } = await getProfile(user.id);
  if (profile?.role !== 'director') {
    navigate('/welcome');
    return;
  }

  async function loadData() {
    // Get the director's kindergarten
    const { data: kgData } = await supabase
      .from('kindergartens')
      .select('*')
      .eq('id', profile.kindergarten_id)
      .single();
    
    kindergarten = kgData;

    if (!kindergarten) return;

    // Get all profiles in this kindergarten
    const { data: pData } = await supabase
      .from('profiles')
      .select('*')
      .eq('kindergarten_id', kindergarten.id);
    profiles = pData || [];

    // Get all groups in this kindergarten
    const { data: gData } = await supabase
      .from('groups')
      .select('*')
      .eq('kindergarten_id', kindergarten.id);
    groups = gData || [];

    // Get all children in these groups
    const groupNames = groups.map(g => g.name);
    if (groupNames.length > 0) {
      const { data: cData } = await supabase
        .from('children')
        .select('*')
        .in('group_name', groupNames);
      childrenList = cData || [];
    } else {
      childrenList = [];
    }
  }

  function renderApp() {
    if (!kindergarten) {
      app.innerHTML = `<div class="loading-screen"><div class="loading-text">Садик не найден</div></div>`;
      return;
    }

    const teachers = profiles.filter(p => p.role === 'teacher');
    const parents = profiles.filter(p => p.role === 'parent');
    let tabHtml = '';

    if (currentTab === 'overview') {
      tabHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-accent);">${groups.length}</div>
            <div style="font-weight: 600;">Групп</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-blue);">${childrenList.length}</div>
            <div style="font-weight: 600;">Детей</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-teal);">${teachers.length}</div>
            <div style="font-weight: 600;">Воспитателей</div>
          </div>
          <div class="child-card" style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: var(--color-purple);">${parents.length}</div>
            <div style="font-weight: 600;">Родителей</div>
          </div>
        </div>
        <div class="child-card" style="margin-top: 20px; padding: 20px;">
          <h3 style="margin: 0 0 10px 0;">Код приглашения для воспитателей</h3>
          <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-accent); letter-spacing: 3px;">${kindergarten.invite_code}</p>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 5px;">
            Передайте этот код воспитателям, чтобы они могли присоединиться к вашему садику.
          </p>
        </div>
      `;
    } else if (currentTab === 'groups') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 15px;">
          ${groups.length === 0 ? '<p style="color: var(--color-text-secondary);">Нет групп. Воспитатели могут создавать группы после присоединения к садику.</p>' : groups.map(g => {
            const teacher = profiles.find(p => p.id === g.created_by);
            const groupTeachers = profiles.filter(p => p.role === 'teacher' && p.group_name === g.name);
            const groupChildren = childrenList.filter(c => c.group_name === g.name);
            return `
              <div class="child-card" style="padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h3 style="margin: 0 0 10px 0;">${g.name} <span style="font-size: 0.85rem; color: var(--color-text-secondary);">(Код: <strong>${g.invite_code}</strong>)</span></h3>
                    <p style="margin: 5px 0; font-size: 0.9rem;">Создал: ${teacher ? teacher.first_name + ' ' + teacher.last_name : 'Неизвестен'}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem;">Воспитатели: ${groupTeachers.map(t => t.first_name + ' ' + t.last_name).join(', ') || 'Нет'}</p>
                    <p style="margin: 5px 0; font-size: 0.85rem; color: var(--color-text-secondary);">Детей: ${groupChildren.length}</p>
                  </div>
                  <button class="btn btn-secondary btn-sm btn-delete-group" data-id="${g.id}" style="color: red; border-color: red;">Удалить</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (currentTab === 'staff') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 10px;">
          ${teachers.length === 0 ? '<p style="color: var(--color-text-secondary);">Нет воспитателей.</p>' : teachers.map(t => `
            <div class="child-card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="display: block;">${t.first_name} ${t.last_name}</strong>
                <span style="font-size: 0.8rem; color: var(--color-text-secondary);">Группа: ${t.group_name || 'Без группы'}</span>
              </div>
              <button class="btn btn-secondary btn-sm btn-delete-user" data-id="${t.id}" style="color: red; border-color: red;">Удалить</button>
            </div>
          `).join('')}
        </div>
      `;
    } else if (currentTab === 'parents') {
      tabHtml = `
        <div style="margin-top: 20px; display: grid; gap: 10px;">
          ${parents.length === 0 ? '<p style="color: var(--color-text-secondary);">Нет родителей.</p>' : parents.map(p => {
            const pChildren = childrenList.filter(c => c.parent_id === p.id);
            return `
              <div class="child-card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="display: block;">${p.first_name} ${p.last_name}</strong>
                  <span style="font-size: 0.8rem; color: var(--color-text-secondary);">
                    Дети: ${pChildren.map(c => c.first_name).join(', ') || 'Нет'} · Группа: ${p.group_name || '—'}
                  </span>
                </div>
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
            <h1>${kindergarten.name}</h1>
            <div class="header-subtitle">Директор</div>
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
      <button class="tab-btn ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">${buildingIcon(16)} Обзор</button>
      <button class="tab-btn ${currentTab === 'groups' ? 'active' : ''}" data-tab="groups">${childrenIcon(16)} Группы</button>
      <button class="tab-btn ${currentTab === 'staff' ? 'active' : ''}" data-tab="staff">${usersIcon(16)} Сотрудники</button>
      <button class="tab-btn ${currentTab === 'parents' ? 'active' : ''}" data-tab="parents">${shieldIcon(16)} Родители</button>
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
      <div class="loading-text">Загрузка данных садика...</div>
    </div>
  `;

  await loadData();
  renderApp();

  return () => {};
}
