import { supabase } from '../supabase.js';
import { signOut, getCurrentUser, getProfile } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import {
  logoIcon, calendarIcon, childIcon, clipboardIcon,
  activityIcon, activityClass, avatarInitials,
  messageCircleIcon, alertTriangleIcon, imageIcon,
  bookOpenIcon, trophyIcon, cameraIcon, calendarIcon2,
  clockIcon, utensilsIcon, heartIcon, noteIcon
} from '../icons.js';
import {
  renderHomework, renderAchievements, renderGallery,
  renderEvents, renderSchedule, renderMealMenu
} from './features.js';

let currentTab = 'feed'; // 'feed' | 'group' | 'health'
let activeChild = null;
let currentProfile = null;

export async function renderParent() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-spinner-lg"></div>
      <div class="loading-text">Загрузка...</div>
    </div>
  `;

  const user = await getCurrentUser();
  if (!user) return navigate('/login');

  const { profile, error: profileError } = await getProfile(user.id);
  if (profileError || !profile || profile.role !== 'parent') return navigate('/login');
  currentProfile = profile;

  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, first_name, last_name, group_name, allergies')
    .eq('parent_id', user.id);

  if (childrenError || !children || children.length === 0) {
    app.innerHTML = `<div class="empty-state"><div class="empty-state-text">Ребёнок не найден</div></div>`;
    return;
  }

  activeChild = children[0];
  renderApp(app);
}

async function renderApp(app) {
  const av = avatarInitials(currentProfile.first_name, currentProfile.last_name);

  // Fetch activities
  let feedHtml = '';
  if (currentTab === 'feed') {
    const { data: activities } = await supabase
      .from('daily_activities')
      .select('id, title, status, created_at')
      .eq('child_id', activeChild.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    const grouped = groupByDay(activities || []);
    feedHtml = (activities && activities.length > 0) ? `
      ${Object.entries(grouped).map(([day, items]) => `
        <div class="day-section">
          <div class="day-label"><span class="day-label-icon">${calendarIcon()}</span> ${formatDayLabel(day)}</div>
          ${items.map((item, i) => {
            const iconClass = activityClass(item.title);
            return `
              <div class="activity-card animate-slide-up delay-${Math.min(i + 1, 6)}">
                <div class="activity-icon ${iconClass}">${activityIcon(item.title)}</div>
                <div class="activity-info">
                  <div class="activity-title">${item.title}</div>
                  <div class="activity-status">${item.status}</div>
                </div>
                <div class="activity-time">${formatTime(item.created_at)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('')}
    ` : `<div class="empty-state"><div class="empty-state-icon">${clipboardIcon(48)}</div><div class="empty-state-text">Пока нет записей.</div></div>`;
  } else if (currentTab === 'group') {
    const { data: messages } = await supabase
      .from('group_messages')
      .select('id, sender_id, message, image_url, is_emergency, created_at, profiles(first_name, last_name, role)')
      .eq('group_name', activeChild.group_name)
      .order('created_at', { ascending: true });
    
    feedHtml = `
      <div class="chat-container">
        <div class="chat-messages" id="chat-scroll">
          ${messages?.map(msg => `
            <div class="chat-msg ${msg.is_emergency ? 'emergency' : ''} ${msg.sender_id === currentProfile.id ? 'own' : ''}">
              ${msg.sender_id !== currentProfile.id ? `
              <div class="chat-header">
                ${msg.profiles.first_name} ${msg.profiles.last_name} <span class="chat-role">${msg.profiles.role === 'teacher' ? 'Воспитатель' : 'Родитель'}</span>
              </div>
              ` : ''}
              ${msg.is_emergency ? `<div class="emergency-badge">${alertTriangleIcon(16)} ВАЖНОЕ СООБЩЕНИЕ</div>` : ''}
              <div class="chat-body">${msg.message}</div>
              ${msg.image_url ? `<img src="${msg.image_url}" class="chat-image" />` : ''}
              <div class="chat-time">${formatTime(msg.created_at)}</div>
            </div>
          `).join('') || '<div class="empty-state">Нет сообщений</div>'}
        </div>
        
        <div class="chat-composer">
          <textarea id="chat-input" class="form-input" rows="2" placeholder="Напишите сообщение в группу..."></textarea>
          
          <div class="chat-composer-actions">
            <label class="btn-icon">
              <input type="file" id="chat-image-upload" accept="image/*" style="display:none;" />
              ${imageIcon()} Фото
            </label>
            <!-- Parents shouldn't usually send emergency alerts, but we'll leave it as a regular message button for them -->
            <button class="btn btn-primary" id="btn-send-msg">Отправить</button>
          </div>
        </div>
      </div>
    `;
  } else if (currentTab === 'health') {
    feedHtml = `
      <div class="health-section animate-fade-in">
        <div class="card">
          <h3>Аллергии и особенности питания</h3>
          <textarea id="allergies-input" placeholder="Например: аллергия на цитрусовые, нельзя молоко..." class="form-input" rows="3">${activeChild.allergies || ''}</textarea>
          <button id="btn-save-allergies" class="btn btn-primary" style="margin-top:10px;">Сохранить</button>
        </div>
        <div class="card" style="margin-top: 20px;">
          <h3>Пропуски</h3>
          <p class="text-muted">Если ребенок сегодня не придет, отметьте это здесь.</p>
          <select id="absence-reason" class="form-input">
            <option value="Заболели">Заболели</option>
            <option value="По семейным обстоятельствам">По семейным обстоятельствам</option>
          </select>
          <button id="btn-absent" class="btn btn-warning" style="margin-top:10px; width: 100%;">Сегодня не приедем</button>
        </div>
      </div>
    `;
  }

  app.innerHTML = `
    <header class="app-header">
      <div class="header-inner">
        <div class="header-title">
          <span class="header-logo">${logoIcon(30)}</span>
          <div>
            <h1>Sadik</h1>
            <div class="header-subtitle">${currentProfile.first_name} ${currentProfile.last_name}</div>
          </div>
        </div>
        <button class="header-profile-btn" id="btn-profile">
          ${currentProfile.avatar_url 
            ? `<img src="${currentProfile.avatar_url}" alt="Profile" class="header-avatar-img" />`
            : `<div class="header-avatar" style="--avatar-hue: ${av.hue}">${av.initials}</div>`
          }
        </button>
      </div>
    </header>

    <div class="tabs">
      <button class="tab-btn ${currentTab === 'feed' ? 'active' : ''}" data-tab="feed">${clipboardIcon(16)} Лента</button>
      <button class="tab-btn ${currentTab === 'group' ? 'active' : ''}" data-tab="group">${messageCircleIcon(16)} Чат</button>
      <button class="tab-btn ${currentTab === 'health' ? 'active' : ''}" data-tab="health">${heartIcon(16)} Здоровье</button>
    </div>

    ${currentTab === 'feed' ? `
    <div class="nav-tiles">
      <button class="nav-tile" data-feature="homework"><span class="nav-tile-icon tile-purple">${bookOpenIcon(28)}</span><span class="nav-tile-label">Домашка</span></button>
      <button class="nav-tile" data-feature="achievements"><span class="nav-tile-icon tile-gold">${trophyIcon(28)}</span><span class="nav-tile-label">Достижения</span></button>
      <button class="nav-tile" data-feature="gallery"><span class="nav-tile-icon tile-pink">${cameraIcon(28)}</span><span class="nav-tile-label">Фото</span></button>
      <button class="nav-tile" data-feature="events"><span class="nav-tile-icon tile-blue">${calendarIcon2(28)}</span><span class="nav-tile-label">Календарь</span></button>
      <button class="nav-tile" data-feature="schedule"><span class="nav-tile-icon tile-teal">${clockIcon(28)}</span><span class="nav-tile-label">Расписание</span></button>
      <button class="nav-tile" data-feature="menu"><span class="nav-tile-icon tile-orange">${utensilsIcon(28)}</span><span class="nav-tile-label">Меню</span></button>
    </div>
    ` : ''}

    <main class="dashboard">
      <div class="child-banner animate-slide-up">
        <div class="child-banner-name">${activeChild.first_name} ${activeChild.last_name}</div>
        <div class="child-banner-group">Группа: ${activeChild.group_name || '—'}</div>
      </div>

      <div id="feature-container" style="display:none;"></div>
      <div id="main-content">
        <div class="feed-content">
          ${feedHtml}
        </div>
      </div>
    </main>
  `;

  // Bindings
  document.getElementById('btn-profile')?.addEventListener('click', () => navigate('/profile'));
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      currentTab = tab;
      renderApp(app);
    });
  });

  // Feature tiles
  const featureContainer = document.getElementById('feature-container');
  const mainContent = document.getElementById('main-content');

  function showFeature(renderFn) {
    featureContainer.style.display = '';
    mainContent.style.display = 'none';
    document.querySelector('.nav-tiles')?.classList.add('hidden');
    renderFn(featureContainer);
  }

  function goBackToMain() {
    featureContainer.style.display = 'none';
    mainContent.style.display = '';
    document.querySelector('.nav-tiles')?.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const feature = tile.dataset.feature;
      const childId = activeChild?.id;
      const renderers = {
        homework: renderHomework(activeChild.group_name, 'parent', goBackToMain),
        achievements: renderAchievements(activeChild.group_name, 'parent', [], goBackToMain, childId),
        gallery: renderGallery(activeChild.group_name, 'parent', goBackToMain),
        events: renderEvents(activeChild.group_name, 'parent', goBackToMain),
        schedule: renderSchedule(activeChild.group_name, 'parent', goBackToMain),
        menu: renderMealMenu(activeChild.group_name, 'parent', goBackToMain),
      };
      if (renderers[feature]) showFeature(renderers[feature]);
    });
  });

  if (currentTab === 'group') {
    const chatScroll = document.getElementById('chat-scroll');
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;

    let chatImageBase64 = null;
    document.getElementById('chat-image-upload')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        chatImageBase64 = ev.target.result;
        showToast('Фото прикреплено');
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-send-msg')?.addEventListener('click', async () => {
      const msg = document.getElementById('chat-input').value.trim();
      
      if (!msg && !chatImageBase64) return;

      const { error } = await supabase.from('group_messages').insert([{
        group_name: activeChild.group_name,
        sender_id: currentProfile.id,
        message: msg,
        image_url: chatImageBase64,
        is_emergency: false
      }]);

      if (error) {
        showToast('Ошибка отправки: ' + error.message, 'error');
      } else {
        showToast('Отправлено');
        renderParent();
      }
    });
  }

  if (currentTab === 'health') {
    document.getElementById('btn-save-allergies')?.addEventListener('click', async () => {
      const val = document.getElementById('allergies-input').value;
      const { error } = await supabase.from('children').update({ allergies: val }).eq('id', activeChild.id);
      if (error) showToast('Ошибка сохранения', 'error');
      else {
        activeChild.allergies = val;
        showToast('Аллергии сохранены');
      }
    });

    document.getElementById('btn-absent')?.addEventListener('click', async () => {
      const reason = document.getElementById('absence-reason').value;
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('absences').insert([{
        child_id: activeChild.id,
        date: today,
        reason: reason
      }]);
      if (error) showToast('Ошибка: возможно вы уже отмечали сегодня', 'error');
      else showToast('Отмечено. Воспитатель уведомлен.');
    });
  }
}

// Helpers
function groupByDay(activities) {
  const groups = {};
  for (const a of activities) {
    const dayKey = new Date(a.created_at).toISOString().split('T')[0];
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(a);
  }
  return groups;
}

function formatDayLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Сегодня';
  if (date.getTime() === yesterday.getTime()) return 'Вчера';

  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
