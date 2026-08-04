import { supabase } from '../supabase.js';
import { getCurrentUser, getProfile } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import {
  logoIcon, mealIcon, sleepIcon, paletteIcon, walkIcon,
  noteIcon, closeIcon, checkIcon, avatarInitials,
  smileIcon, zapIcon, moonIcon, cloudRainIcon, alertTriangleIcon, imageIcon,
  checkCircleIcon, bookOpenIcon, trophyIcon, cameraIcon, calendarIcon2,
  clockIcon, utensilsIcon, heartIcon, childrenIcon, messageCircleIcon
} from '../icons.js';
import {
  renderHomework, renderAchievements, renderGallery,
  renderEvents, renderSchedule, renderMealMenu
} from './features.js';

/** Activity presets with statuses */
const ACTIVITIES = [
  {
    title: 'Настроение',
    icon: smileIcon,
    statuses: ['Счастливый 😊', 'Активный ⚡', 'Сонный 😴', 'Капризный 🌧️'],
  },
  {
    title: 'Обед',
    icon: mealIcon,
    statuses: ['Съел всё', 'Съел половину', 'Не ел', 'Ел с аппетитом'],
  },
  {
    title: 'Сон',
    icon: sleepIcon,
    statuses: ['Спит', 'Уснул быстро', 'Не спал', 'Спал плохо'],
  },
  {
    title: 'Занятие',
    icon: paletteIcon,
    statuses: ['Участвовал активно', 'Выполнил задание', 'Нужна помощь', 'Отличная работа'],
  },
  {
    title: 'Прогулка',
    icon: walkIcon,
    statuses: ['Гулял на улице', 'Играл активно', 'Спокойная прогулка', 'Не гулял'],
  },
];

let currentTab = 'dashboard';
let selectedChild = null;
let selectedActivity = null;
let selectedStatus = null;
let isSubmitting = false;
let currentProfile = null;
let childrenList = [];
let absencesList = [];
let feedMessages = [];
let journalData = {};
let groupNameStr = '';
let inviteCodeStr = '';
let currentUser = null;

// Attendance Mode State
let isAttendanceMode = false;
let selectedForAttendance = new Set();
let selectedJournalDate = null;
let showAddChildModal = false;

export async function renderTeacher() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-spinner-lg"></div>
      <div class="loading-text">Загрузка...</div>
    </div>
  `;

  currentUser = await getCurrentUser();
  if (!currentUser) return navigate('/login');

  const { profile, error: profileError } = await getProfile(currentUser.id);
  if (profileError || !profile || profile.role !== 'teacher') return navigate('/login');
  currentProfile = profile;

  // Load children
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, first_name, last_name, group_name, allergies')
    .order('first_name');

  if (childrenError) {
    app.innerHTML = `<div class="empty-state"><div class="empty-state-text">Ошибка загрузки: ${childrenError.message}</div></div>`;
    return;
  }
  
  childrenList = children;
  groupNameStr = currentProfile.group_name || (children[0]?.group_name || 'Group');

  // Load group invite code
  inviteCodeStr = '';
  if (groupNameStr) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('invite_code')
      .eq('name', groupNameStr)
      .single();
    if (groupData) {
      inviteCodeStr = groupData.invite_code;
    }
  }

  // Load absences for today
  const today = new Date().toISOString().split('T')[0];
  const { data: absences } = await supabase
    .from('absences')
    .select('child_id, reason')
    .eq('date', today);
  
  absencesList = absences || [];

  renderApp(app);
}

async function renderApp(app) {
  const av = avatarInitials(currentProfile.first_name, currentProfile.last_name);

  let tabHtml = '';

  if (currentTab === 'dashboard') {
    tabHtml = `
      <div class="teacher-actions" style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
        ${!isAttendanceMode ? `
          <button class="btn btn-primary" id="btn-toggle-attendance">Отметить присутствующих</button>
          <button class="btn btn-secondary" id="btn-add-child">+ Добавить ребёнка</button>
        ` : `
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-secondary" id="btn-select-all-attendance">Выбрать всех</button>
            <button class="btn btn-primary" id="btn-save-attendance">Сохранить (${selectedForAttendance.size})</button>
            <button class="btn btn-outline" id="btn-cancel-attendance">Отмена</button>
          </div>
        `}
      </div>
      <div class="children-grid ${isAttendanceMode ? 'attendance-mode' : ''}">
        ${childrenList.map((child, i) => {
          const childAv = avatarInitials(child.first_name, child.last_name);
          const isAbsent = absencesList.find(a => a.child_id === child.id);
          const isSelected = selectedForAttendance.has(child.id);
          
          return `
          <div class="child-card ${selectedChild?.id === child.id ? 'selected' : ''} ${isAbsent ? 'absent' : ''} ${isSelected ? 'attendance-selected' : ''} animate-slide-up delay-${Math.min(i + 1, 6)}"
               data-child-id="${child.id}">
            ${isAttendanceMode && !isAbsent ? `
              <div class="attendance-check">
                ${isSelected ? checkCircleIcon(30) : `<div class="attendance-uncheck"></div>`}
              </div>
            ` : ''}
            <div class="child-avatar" style="--avatar-hue: ${childAv.hue}">${childAv.initials}</div>
            <div class="child-name">${child.first_name} ${child.last_name}</div>
            ${child.allergies ? `<div class="allergy-badge">Аллергия: ${child.allergies}</div>` : ''}
            ${isAbsent ? `<div class="absence-badge">Отсутствует (${isAbsent.reason})</div>` : ''}
          </div>
        `;}).join('')}
      </div>
      ${selectedChild && !isAttendanceMode ? renderActivityForm() : ''}
    `;
  } else if (currentTab === 'group') {
    // Load feed
    const { data: messages } = await supabase
      .from('group_messages')
      .select('id, sender_id, message, image_url, is_emergency, created_at, profiles(first_name, last_name, role)')
      .eq('group_name', groupNameStr)
      .order('created_at', { ascending: true });
    
    feedMessages = messages || [];

    tabHtml = `
      <div class="chat-container">
        <div class="chat-messages" id="chat-scroll">
          ${feedMessages.map(msg => `
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
            <label class="emergency-toggle">
              <input type="checkbox" id="chat-emergency-checkbox" />
              Экстренно!
            </label>
            <button class="btn btn-primary" id="btn-send-msg">Отправить</button>
          </div>
          <img id="chat-image-preview" class="chat-image" style="display:none; max-width: 100px; margin-top: 10px;" />
        </div>
      </div>
    `;
  } else if (currentTab === 'journal') {
    // We fetch dates from activities where title='Присутствие'
    const { data: attendances } = await supabase
      .from('daily_activities')
      .select('child_id, created_at')
      .eq('title', 'Присутствие')
      .order('created_at', { ascending: false });

    const groupedDates = {};
    if (attendances) {
      attendances.forEach(a => {
        const d = new Date(a.created_at).toISOString().split('T')[0];
        if (!groupedDates[d]) groupedDates[d] = new Set();
        groupedDates[d].add(a.child_id);
      });
    }
    
    // Sort dates descending
    const dateKeys = Object.keys(groupedDates).sort((a, b) => new Date(b) - new Date(a));
    
    if (!selectedJournalDate && dateKeys.length > 0) {
      selectedJournalDate = dateKeys[0];
    }

    tabHtml = `
      <div class="journal-layout">
        <div class="journal-sidebar">
          <h3>Даты</h3>
          ${dateKeys.length === 0 ? '<p class="text-muted">Нет записей</p>' : ''}
          ${dateKeys.map(date => `
            <button class="journal-date-btn ${selectedJournalDate === date ? 'active' : ''}" data-date="${date}">
              ${formatDayLabel(date)}
            </button>
          `).join('')}
        </div>
        <div class="journal-content">
          ${selectedJournalDate ? `
            <div class="journal-header">
              <h3>Присутствующие (${groupedDates[selectedJournalDate].size})</h3>
            </div>
            <div class="journal-list">
              ${childrenList.filter(c => groupedDates[selectedJournalDate].has(c.id)).map(c => {
                const childAv = avatarInitials(c.first_name, c.last_name);
                return `
                <div class="journal-item">
                  <div class="child-avatar" style="--avatar-hue: ${childAv.hue}; width: 32px; height: 32px; font-size: 14px;">${childAv.initials}</div>
                  <div class="journal-item-name">${c.first_name} ${c.last_name}</div>
                  <div class="journal-item-icon success">${checkCircleIcon(20)}</div>
                </div>
              `;}).join('')}
            </div>
            
            <div class="journal-header" style="margin-top: var(--space-xl);">
              <h3>Отсутствующие (${childrenList.length - groupedDates[selectedJournalDate].size})</h3>
            </div>
            <div class="journal-list">
              ${childrenList.filter(c => !groupedDates[selectedJournalDate].has(c.id)).map(c => {
                const childAv = avatarInitials(c.first_name, c.last_name);
                return `
                <div class="journal-item absent">
                  <div class="child-avatar" style="--avatar-hue: ${childAv.hue}; width: 32px; height: 32px; font-size: 14px;">${childAv.initials}</div>
                  <div class="journal-item-name">${c.first_name} ${c.last_name}</div>
                  <div class="journal-item-icon error">${alertTriangleIcon(20)}</div>
                </div>
              `;}).join('')}
            </div>
          ` : '<div class="empty-state">Выберите дату слева</div>'}
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
            <h1>Воспитатель</h1>
            <div class="header-subtitle">
              ${currentProfile.first_name} ${currentProfile.last_name} 
              ${inviteCodeStr ? `&bull; Группа: ${groupNameStr} (Код: <b>${inviteCodeStr}</b>)` : ''}
            </div>
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
      <button class="tab-btn ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">${childrenIcon(16)} Дети</button>
      <button class="tab-btn ${currentTab === 'group' ? 'active' : ''}" data-tab="group">${messageCircleIcon(16)} Чат</button>
      <button class="tab-btn ${currentTab === 'journal' ? 'active' : ''}" data-tab="journal">${noteIcon()} Журнал</button>
    </div>

    ${currentTab === 'dashboard' ? `
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
      <div id="feature-container" style="display:none;"></div>
      <div id="main-content">
        ${tabHtml}
      </div>
    </main>
    
    ${showAddChildModal ? `
      <div class="modal-overlay">
        <div class="modal animate-slide-up" style="max-width: 400px; padding: var(--space-xl); background: var(--bg-card); border-radius: var(--radius-lg); margin: 50px auto;">
          <h2 style="margin-bottom: 1rem;">Новый ребёнок</h2>
          <div class="form-group">
            <label>Имя</label>
            <input type="text" id="new-child-first" class="form-input" placeholder="Иван" />
          </div>
          <div class="form-group">
            <label>Фамилия</label>
            <input type="text" id="new-child-last" class="form-input" placeholder="Иванов" />
          </div>
          <div class="form-group">
            <label>Аллергии (необязательно)</label>
            <input type="text" id="new-child-allergies" class="form-input" placeholder="Орехи, цитрусовые..." />
          </div>
          <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
            <button class="btn btn-primary" id="btn-submit-child" style="flex: 1;">Добавить</button>
            <button class="btn btn-outline" id="btn-close-child-modal" style="flex: 1;">Отмена</button>
          </div>
        </div>
      </div>
    ` : ''}
  `;

  bindEvents(app);
}

function bindEvents(app) {
  document.getElementById('btn-profile')?.addEventListener('click', () => navigate('/profile'));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      currentTab = tab;
      selectedChild = null;
      isAttendanceMode = false;
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
      const renderers = {
        homework: renderHomework(groupNameStr, 'teacher', goBackToMain),
        achievements: renderAchievements(groupNameStr, 'teacher', childrenList, goBackToMain),
        gallery: renderGallery(groupNameStr, 'teacher', goBackToMain),
        events: renderEvents(groupNameStr, 'teacher', goBackToMain),
        schedule: renderSchedule(groupNameStr, 'teacher', goBackToMain),
        menu: renderMealMenu(groupNameStr, 'teacher', goBackToMain),
      };
      if (renderers[feature]) showFeature(renderers[feature]);
    });
  });

  if (currentTab === 'dashboard') {
    // Attendance mode logic
    document.getElementById('btn-toggle-attendance')?.addEventListener('click', () => {
      isAttendanceMode = true;
      selectedForAttendance.clear();
      renderApp(app);
    });

    document.getElementById('btn-add-child')?.addEventListener('click', () => {
      showAddChildModal = true;
      renderApp(app);
    });

    document.getElementById('btn-close-child-modal')?.addEventListener('click', () => {
      showAddChildModal = false;
      renderApp(app);
    });

    document.getElementById('btn-submit-child')?.addEventListener('click', async () => {
      const first_name = document.getElementById('new-child-first').value.trim();
      const last_name = document.getElementById('new-child-last').value.trim();
      const allergies = document.getElementById('new-child-allergies').value.trim();

      if (!first_name || !last_name) {
        alert('Введите имя и фамилию');
        return;
      }

      const btn = document.getElementById('btn-submit-child');
      btn.disabled = true;
      btn.textContent = 'Добавление...';

      const { data, error } = await supabase
        .from('children')
        .insert([{ first_name, last_name, allergies, group_name: groupNameStr }])
        .select()
        .single();

      if (error) {
        alert('Ошибка добавления: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Добавить';
        return;
      }

      childrenList.push(data);
      // Sort to keep alphabetical order
      childrenList.sort((a, b) => a.first_name.localeCompare(b.first_name));
      
      showAddChildModal = false;
      renderApp(app);
    });

    document.getElementById('btn-cancel-attendance')?.addEventListener('click', () => {
      isAttendanceMode = false;
      selectedForAttendance.clear();
      renderApp(app);
    });

    document.getElementById('btn-select-all-attendance')?.addEventListener('click', () => {
      childrenList.forEach(c => {
        if (!absencesList.find(a => a.child_id === c.id)) {
          selectedForAttendance.add(c.id);
        }
      });
      renderApp(app);
    });

    document.getElementById('btn-save-attendance')?.addEventListener('click', handleSaveAttendance);

    document.querySelectorAll('.child-card:not(.absent)').forEach(card => {
      card.addEventListener('click', () => {
        const childId = parseInt(card.dataset.childId, 10);
        
        if (isAttendanceMode) {
          if (selectedForAttendance.has(childId)) {
            selectedForAttendance.delete(childId);
          } else {
            selectedForAttendance.add(childId);
          }
        } else {
          selectedChild = childrenList.find(c => c.id === childId) || null;
          selectedActivity = null;
          selectedStatus = null;
        }
        renderApp(app);
      });
    });

    document.querySelectorAll('.chip[data-activity]').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedActivity = chip.dataset.activity;
        selectedStatus = null;
        renderApp(app);
      });
    });

    document.querySelectorAll('.chip[data-status]').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedStatus = chip.dataset.status;
        renderApp(app);
      });
    });

    document.getElementById('btn-close-form')?.addEventListener('click', () => {
      selectedChild = null;
      selectedActivity = null;
      selectedStatus = null;
      renderApp(app);
    });

    document.getElementById('btn-submit')?.addEventListener('click', handleSubmitActivity);
  }

  if (currentTab === 'group') {
    // Scroll to bottom
    const scroll = document.getElementById('chat-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;

    let chatImageBase64 = null;
    
    document.getElementById('chat-image-upload')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        chatImageBase64 = event.target.result;
        const preview = document.getElementById('chat-image-preview');
        if (preview) {
          preview.src = chatImageBase64;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-send-msg')?.addEventListener('click', async () => {
      const msg = document.getElementById('chat-input').value;
      const isEmergency = document.getElementById('chat-emergency-checkbox').checked;
      
      if (!msg && !chatImageBase64) return;

      const { error } = await supabase.from('group_messages').insert([{
        group_name: groupNameStr,
        sender_id: currentUser.id,
        message: msg,
        image_url: chatImageBase64,
        is_emergency: isEmergency
      }]);

      if (error) {
        showToast('Ошибка отправки: ' + error.message, 'error');
      } else {
        showToast('Отправлено');
        renderApp(app);
      }
    });
  }

  if (currentTab === 'journal') {
    document.querySelectorAll('.journal-date-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedJournalDate = e.target.dataset.date;
        renderApp(app);
      });
    });
  }
}

function renderActivityForm() {
  const activityObj = ACTIVITIES.find(a => a.title === selectedActivity);

  return `
    <div class="activity-form">
      <div class="activity-form-header">
        <div class="activity-form-title">
          <span class="form-title-icon">${noteIcon()}</span>
          ${selectedChild.first_name}
        </div>
        <button class="btn-close-form" id="btn-close-form">${closeIcon()}</button>
      </div>

      <span class="chips-label">Активность</span>
      <div class="chips-group">
        ${ACTIVITIES.map(a => `
          <button class="chip ${selectedActivity === a.title ? 'active' : ''}" data-activity="${a.title}">
            <span class="chip-icon">${a.icon()}</span> ${a.title}
          </button>
        `).join('')}
      </div>

      ${activityObj ? `
        <span class="chips-label">Статус</span>
        <div class="chips-group">
          ${activityObj.statuses.map(s => `
            <button class="chip ${selectedStatus === s ? 'active' : ''}" data-status="${s}">
              ${s}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <button class="btn-submit-activity" id="btn-submit" ${(!selectedActivity || !selectedStatus || isSubmitting) ? 'disabled' : ''}>
        ${isSubmitting ? '<span class="spinner"></span> Отправка...' : `${checkIcon()} Отправить`}
      </button>
    </div>
  `;
}

async function handleSubmitActivity() {
  if (!selectedChild || !selectedActivity || !selectedStatus || isSubmitting) return;

  isSubmitting = true;
  renderApp(document.getElementById('app'));

  const { error } = await supabase.from('daily_activities').insert({
    child_id: selectedChild.id,
    title: selectedActivity,
    status: selectedStatus,
    teacher_id: currentUser.id,
  });

  isSubmitting = false;

  if (error) {
    showToast('Ошибка: ' + error.message, 'error');
  } else {
    showToast(`${selectedActivity} — ${selectedStatus}`, 'success');
    selectedActivity = null;
    selectedStatus = null;
  }

  renderApp(document.getElementById('app'));
}

async function handleSaveAttendance() {
  if (selectedForAttendance.size === 0) return showToast('Никто не выбран');

  const inserts = Array.from(selectedForAttendance).map(childId => ({
    child_id: childId,
    title: 'Присутствие',
    status: 'Присутствует',
    teacher_id: currentUser.id
  }));

  const { error } = await supabase.from('daily_activities').insert(inserts);
  
  if (error) {
    showToast('Ошибка отметки', 'error');
  } else {
    showToast('Присутствующие успешно отмечены', 'success');
    isAttendanceMode = false;
    selectedForAttendance.clear();
    renderApp(document.getElementById('app'));
  }
}

function formatDayLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dayName = days[date.getDay()];

  if (date.getTime() === today.getTime()) return `Сегодня (${dayName})`;
  if (date.getTime() === yesterday.getTime()) return `Вчера (${dayName})`;

  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${date.getDate()} ${months[date.getMonth()]} (${dayName})`;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
