import { supabase } from '../supabase.js';
import { getCurrentUser, getProfile, signOut } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import { logoIcon, shieldIcon, usersIcon, childrenIcon, closeIcon } from '../icons.js';

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
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
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
            const teacher = profiles.find(p => p.id === g.teacher_id);
            const groupChildren = childrenList.filter(c => c.group_id === g.id);
            return `
              <div class="child-card" style="padding: 15px;">
                <h3 style="margin: 0 0 10px 0;">${g.name} (Код: <strong>${g.invite_code}</strong>)</h3>
                <p style="margin: 5px 0;">Воспитатель: ${teacher ? teacher.first_name + ' ' + teacher.last_name : 'Неизвестен'}</p>
                <p style="margin: 5px 0; font-size: 0.9rem; color: var(--color-text-secondary);">Детей: ${groupChildren.length}</p>
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
            </div>
          `).join('')}
        </div>
      `;
    }

    app.innerHTML = `
      <div class="app-container">
        <header class="app-header">
          <div class="header-logo">${logoIcon(32)} BalaQ Admin</div>
          <div class="header-actions">
            <button class="btn-icon" id="btn-logout" title="Выйти">${closeIcon(24)}</button>
          </div>
        </header>

        <main class="app-main">
          <h2 style="margin-bottom: 15px;">Панель управления</h2>
          ${tabHtml}
        </main>

        <nav class="bottom-nav">
          <button class="nav-btn ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
            ${shieldIcon(24)}
            <span>Обзор</span>
          </button>
          <button class="nav-btn ${currentTab === 'groups' ? 'active' : ''}" data-tab="groups">
            ${childrenIcon(24)}
            <span>Группы</span>
          </button>
          <button class="nav-btn ${currentTab === 'users' ? 'active' : ''}" data-tab="users">
            ${usersIcon(24)}
            <span>Люди</span>
          </button>
        </nav>
      </div>
    `;

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await signOut();
      navigate('/login');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
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
