import { supabase } from '../supabase.js';
import { escapeHtml } from '../utils.js';
import { showToast } from '../main.js';
import {
  bookOpenIcon, trophyIcon, cameraIcon, calendarIcon2,
  clockIcon, utensilsIcon, arrowLeftIcon, plusIcon, avatarInitials
} from '../icons.js';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const ACHIEVEMENT_ICONS = ['⭐', '🏆', '🎨', '🎵', '📚', '🤸', '💪', '🌟', '👏', '🎯'];

function formatDate(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

// ============================
// HOMEWORK (Домашние задания)
// ============================
export function renderHomework(groupName, role, onBack) {
  return async (container) => {
    const { data: items } = await supabase
      .from('homework')
      .select('*')
      .eq('group_name', groupName)
      .order('due_date', { ascending: true });

    const today = new Date().toISOString().split('T')[0];
    const list = items || [];

    container.innerHTML = `
      <div class="feature-screen animate-fade-in">
        <div class="feature-header">
          <button class="btn-back" id="btn-back">${arrowLeftIcon(20)} Назад</button>
          <h2>${bookOpenIcon(22)} Домашние задания</h2>
        </div>

        ${role === 'teacher' ? `
        <div class="feature-form card">
          <h3>Новое задание</h3>
          <input type="text" id="hw-title" class="form-input" placeholder="Название задания" />
          <textarea id="hw-desc" class="form-input" rows="2" placeholder="Описание (необязательно)"></textarea>
          <input type="date" id="hw-date" class="form-input" />
          <button class="btn btn-primary" id="btn-add-hw">${plusIcon(18)} Добавить</button>
        </div>
        ` : ''}

        <div class="feature-list">
          ${list.length === 0 ? '<div class="empty-state"><div class="empty-state-text">Пока нет заданий</div></div>' :
            list.map(hw => {
              const overdue = hw.due_date < today;
              return `
              <div class="feature-card ${overdue ? 'overdue' : ''}">
                <div class="feature-card-header">
                  <div style="display: flex; flex-direction: column;">
                    <span class="feature-card-title">${escapeHtml(hw.title)}</span>
                    <span class="feature-card-date ${overdue ? 'text-error' : ''}">${formatDate(hw.due_date)}</span>
                  </div>
                  ${role === 'teacher' ? `<button class="btn-icon btn-delete-hw" data-id="${hw.id}" style="color: var(--color-error); font-size: 0.85rem;">Удалить</button>` : ''}
                </div>
                ${hw.description ? `<div class="feature-card-body">${escapeHtml(hw.description)}</div>` : ''}
                ${overdue ? '<span class="badge badge-error">Просрочено</span>' : ''}
              </div>`;
            }).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    container.querySelector('#btn-add-hw')?.addEventListener('click', async () => {
      const title = container.querySelector('#hw-title').value.trim();
      const desc = container.querySelector('#hw-desc').value.trim();
      const date = container.querySelector('#hw-date').value;
      if (!title || !date) return showToast('Введите название и дату', 'error');

      const { error } = await supabase.from('homework').insert([{
        group_name: groupName, title, description: desc, due_date: date
      }]);
      if (error) return showToast('Ошибка: ' + error.message, 'error');
      showToast('Задание добавлено');
      renderHomework(groupName, role, onBack)(container);
    });

    container.querySelectorAll('.btn-delete-hw').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Удалить это задание?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('homework').delete().eq('id', id);
        if (error) return showToast('Ошибка: ' + error.message, 'error');
        showToast('Задание удалено');
        renderHomework(groupName, role, onBack)(container);
      });
    });
  };
}

// ============================
// ACHIEVEMENTS (Достижения)
// ============================
export function renderAchievements(groupName, role, childrenList, onBack, specificChildId) {
  return async (container) => {
    let query = supabase
      .from('achievements')
      .select('*, children(first_name, last_name)')
      .order('created_at', { ascending: false });

    if (specificChildId) {
      query = query.eq('child_id', specificChildId);
    }

    const { data: items } = await query;
    const list = items || [];

    container.innerHTML = `
      <div class="feature-screen animate-fade-in">
        <div class="feature-header">
          <button class="btn-back" id="btn-back">${arrowLeftIcon(20)} Назад</button>
          <h2>${trophyIcon(22)} Достижения</h2>
        </div>

        ${role === 'teacher' ? `
        <div class="feature-form card">
          <h3>Наградить ребёнка</h3>
          <select id="ach-child" class="form-input">
            <option value="">Выберите ребёнка</option>
            ${(childrenList || []).map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
          </select>
          <input type="text" id="ach-title" class="form-input" placeholder="За что награда?" />
          <div class="icon-picker">
            ${ACHIEVEMENT_ICONS.map(icon => `<button class="icon-pick-btn" data-icon="${icon}">${icon}</button>`).join('')}
          </div>
          <input type="hidden" id="ach-icon" value="⭐" />
          <button class="btn btn-primary" id="btn-add-ach">${plusIcon(18)} Наградить</button>
        </div>
        ` : ''}

        <div class="feature-list achievements-grid">
          ${list.length === 0 ? '<div class="empty-state"><div class="empty-state-text">Пока нет наград</div></div>' :
            list.map(a => `
              <div class="achievement-card" style="position: relative;">
                ${role === 'teacher' ? `<button class="btn-icon btn-delete-ach" data-id="${a.id}" style="position: absolute; top: 5px; right: 5px; color: var(--color-error); font-size: 0.8rem; padding: 4px;">Удалить</button>` : ''}
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-title">${escapeHtml(a.title)}</div>
                ${a.children ? `<div class="achievement-child">${escapeHtml(a.children.first_name)} ${escapeHtml(a.children.last_name)}</div>` : ''}
                <div class="achievement-date">${formatDate(a.created_at)}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    // Icon picker
    container.querySelectorAll('.icon-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.icon-pick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        container.querySelector('#ach-icon').value = btn.dataset.icon;
      });
    });
    // Pre-select first icon
    container.querySelector('.icon-pick-btn')?.classList.add('active');

    container.querySelector('#btn-add-ach')?.addEventListener('click', async () => {
      const childId = container.querySelector('#ach-child').value;
      const title = container.querySelector('#ach-title').value.trim();
      const icon = container.querySelector('#ach-icon').value;
      if (!childId || !title) return showToast('Выберите ребёнка и введите награду', 'error');

      const { error } = await supabase.from('achievements').insert([{
        child_id: childId, title, icon
      }]);
      if (error) return showToast('Ошибка: ' + error.message, 'error');
      showToast('Награда вручена!');
      renderAchievements(groupName, role, childrenList, onBack, specificChildId)(container);
    });

    container.querySelectorAll('.btn-delete-ach').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Удалить эту награду?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('achievements').delete().eq('id', id);
        if (error) return showToast('Ошибка: ' + error.message, 'error');
        showToast('Награда удалена');
        renderAchievements(groupName, role, childrenList, onBack, specificChildId)(container);
      });
    });
  };
}

// ============================
// PHOTO GALLERY (Фотогалерея)
// ============================
export function renderGallery(groupName, role, onBack) {
  return async (container) => {
    const { data: photos } = await supabase
      .from('photo_gallery')
      .select('*')
      .eq('group_name', groupName)
      .order('created_at', { ascending: false });

    const list = photos || [];

    container.innerHTML = `
      <div class="feature-screen animate-fade-in">
        <div class="feature-header">
          <button class="btn-back" id="btn-back">${arrowLeftIcon(20)} Назад</button>
          <h2>${cameraIcon(22)} Фотогалерея</h2>
        </div>

        ${role === 'teacher' ? `
        <div class="feature-form card">
          <h3>Загрузить фото</h3>
          <input type="text" id="photo-title" class="form-input" placeholder="Подпись к фото (необязательно)" />
          <label class="btn btn-secondary upload-label">
            <input type="file" id="photo-file" accept="image/*" style="display:none;" />
            ${cameraIcon(18)} Выбрать фото
          </label>
          <div id="photo-preview" class="photo-preview-area"></div>
          <button class="btn btn-primary" id="btn-add-photo" style="display:none;">${plusIcon(18)} Загрузить</button>
        </div>
        ` : ''}

        <div class="gallery-grid">
          ${list.length === 0 ? '<div class="empty-state"><div class="empty-state-text">Пока нет фотографий</div></div>' :
            list.map(p => `
              <div class="gallery-item" data-url="${p.image_url}" style="position: relative;">
                ${role === 'teacher' ? `<button class="btn-icon btn-delete-photo" data-id="${p.id}" style="position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.8); border-radius: 50%; color: var(--color-error); font-size: 0.8rem; padding: 4px; z-index: 10;">Удалить</button>` : ''}
                <img src="${p.image_url}" alt="${escapeHtml(p.title) || 'Фото'}" loading="lazy" />
                ${p.title ? `<div class="gallery-caption">${escapeHtml(p.title)}</div>` : ''}
                <div class="gallery-date">${formatDate(p.created_at)}</div>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="lightbox" id="lightbox" style="display:none;">
        <button class="lightbox-close" id="lightbox-close">&times;</button>
        <img id="lightbox-img" src="" alt="Фото" />
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    // Photo upload
    let photoBase64 = null;
    container.querySelector('#photo-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        photoBase64 = ev.target.result;
        container.querySelector('#photo-preview').innerHTML = `<img src="${photoBase64}" alt="Preview" />`;
        container.querySelector('#btn-add-photo').style.display = '';
      };
      reader.readAsDataURL(file);
    });

    container.querySelector('#btn-add-photo')?.addEventListener('click', async () => {
      if (!photoBase64) return;
      const title = container.querySelector('#photo-title').value.trim();

      const { error } = await supabase.from('photo_gallery').insert([{
        group_name: groupName, title, image_url: photoBase64
      }]);
      if (error) return showToast('Ошибка: ' + error.message, 'error');
      showToast('Фото загружено');
      renderGallery(groupName, role, onBack)(container);
    });

    container.querySelectorAll('.btn-delete-photo').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent lightbox from opening
        if (!confirm('Удалить это фото?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('photo_gallery').delete().eq('id', id);
        if (error) return showToast('Ошибка: ' + error.message, 'error');
        showToast('Фото удалено');
        renderGallery(groupName, role, onBack)(container);
      });
    });

    // Lightbox
    container.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const lightbox = container.querySelector('#lightbox');
        container.querySelector('#lightbox-img').src = item.dataset.url;
        lightbox.style.display = 'flex';
      });
    });
    container.querySelector('#lightbox-close')?.addEventListener('click', () => {
      container.querySelector('#lightbox').style.display = 'none';
    });
    container.querySelector('#lightbox')?.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') e.target.style.display = 'none';
    });
  };
}

// ============================
// EVENTS CALENDAR (Календарь событий)
// ============================
export function renderEvents(groupName, role, onBack) {
  return async (container) => {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('group_name', groupName)
      .order('event_date', { ascending: true });

    const today = new Date().toISOString().split('T')[0];
    const upcoming = (events || []).filter(e => e.event_date >= today);
    const past = (events || []).filter(e => e.event_date < today);

    container.innerHTML = `
      <div class="feature-screen animate-fade-in">
        <div class="feature-header">
          <button class="btn-back" id="btn-back">${arrowLeftIcon(20)} Назад</button>
          <h2>${calendarIcon2(22)} Календарь событий</h2>
        </div>

        ${role === 'teacher' ? `
        <div class="feature-form card">
          <h3>Новое событие</h3>
          <input type="text" id="ev-title" class="form-input" placeholder="Название события" />
          <textarea id="ev-desc" class="form-input" rows="2" placeholder="Описание"></textarea>
          <input type="date" id="ev-date" class="form-input" />
          <select id="ev-type" class="form-input">
            <option value="general">Общее</option>
            <option value="holiday">Праздник / Утренник</option>
            <option value="meeting">Собрание</option>
            <option value="trip">Экскурсия</option>
          </select>
          <button class="btn btn-primary" id="btn-add-ev">${plusIcon(18)} Добавить</button>
        </div>
        ` : ''}

        ${upcoming.length > 0 ? `
        <h3 class="feature-section-title">Предстоящие события</h3>
        <div class="feature-list">
          ${upcoming.map(ev => `
            <div class="feature-card event-card event-${ev.event_type}">
              <div class="event-type-badge">${eventTypeLabel(ev.event_type)}</div>
              <div class="feature-card-header">
                <div style="display: flex; flex-direction: column;">
                  <span class="feature-card-title">${escapeHtml(ev.title)}</span>
                  <span class="feature-card-date">${formatDate(ev.event_date)}</span>
                </div>
                ${role === 'teacher' ? `<button class="btn-icon btn-delete-ev" data-id="${ev.id}" style="color: var(--color-error); font-size: 0.85rem;">Удалить</button>` : ''}
              </div>
              ${ev.description ? `<div class="feature-card-body">${escapeHtml(ev.description)}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : '<div class="empty-state"><div class="empty-state-text">Нет предстоящих событий</div></div>'}

        ${past.length > 0 ? `
        <h3 class="feature-section-title" style="opacity:0.5; margin-top: 24px;">Прошедшие</h3>
        <div class="feature-list">
          ${past.map(ev => `
            <div class="feature-card event-card past">
              <div class="feature-card-header">
                <div style="display: flex; flex-direction: column;">
                  <span class="feature-card-title">${escapeHtml(ev.title)}</span>
                  <span class="feature-card-date">${formatDate(ev.event_date)}</span>
                </div>
                ${role === 'teacher' ? `<button class="btn-icon btn-delete-ev" data-id="${ev.id}" style="color: var(--color-error); font-size: 0.85rem;">Удалить</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    container.querySelector('#btn-add-ev')?.addEventListener('click', async () => {
      const title = container.querySelector('#ev-title').value.trim();
      const desc = container.querySelector('#ev-desc').value.trim();
      const date = container.querySelector('#ev-date').value;
      const type = container.querySelector('#ev-type').value;
      if (!title || !date) return showToast('Введите название и дату', 'error');

      const { error } = await supabase.from('events').insert([{
        group_name: groupName, title, description: desc, event_date: date, event_type: type
      }]);
      if (error) return showToast('Ошибка: ' + error.message, 'error');
      showToast('Событие добавлено');
      renderEvents(groupName, role, onBack)(container);
    });

    container.querySelectorAll('.btn-delete-ev').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Удалить это событие?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) return showToast('Ошибка: ' + error.message, 'error');
        showToast('Событие удалено');
        renderEvents(groupName, role, onBack)(container);
      });
    });
  };
}

function eventTypeLabel(type) {
  const labels = { general: '📌 Общее', holiday: '🎉 Праздник', meeting: '👥 Собрание', trip: '🚌 Экскурсия' };
  return labels[type] || labels.general;
}

// ============================
// SCHEDULE (Расписание)
// ============================
export function renderSchedule(groupName, role, onBack) {
  return async (container) => {
    const { data: slots } = await supabase
      .from('schedule')
      .select('*')
      .eq('group_name', groupName)
      .order('day_of_week')
      .order('time_slot');

    const grouped = {};
    DAYS.forEach((d, i) => { grouped[i] = []; });
    (slots || []).forEach(s => {
      if (grouped[s.day_of_week]) grouped[s.day_of_week].push(s);
    });

    container.innerHTML = `
      <div class="feature-screen animate-fade-in">
        <div class="feature-header">
          <button class="btn-back" id="btn-back">${arrowLeftIcon(20)} Назад</button>
          <h2>${clockIcon(22)} Расписание</h2>
        </div>

        ${role === 'teacher' ? `
        <div class="feature-form card">
          <h3>Добавить занятие</h3>
          <select id="sch-day" class="form-input">
            ${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
          </select>
          <input type="time" id="sch-time" class="form-input" />
          <input type="text" id="sch-activity" class="form-input" placeholder="Название занятия (напр. Музыка)" />
          <button class="btn btn-primary" id="btn-add-sch">${plusIcon(18)} Добавить</button>
        </div>
        ` : ''}

        <div class="schedule-table">
          ${DAYS.map((day, i) => `
            <div class="schedule-day-card">
              <div class="schedule-day-title">${day}</div>
              <div class="schedule-slots">
                ${grouped[i].length === 0 ? '<div class="schedule-empty">Нет занятий</div>' :
                  grouped[i].map(s => `
                    <div class="schedule-slot" style="position: relative; padding-right: 30px;">
                      <span class="schedule-time">${s.time_slot}</span>
                      <span class="schedule-activity">${escapeHtml(s.activity)}</span>
                      ${role === 'teacher' ? `<button class="btn-icon btn-delete-sch" data-id="${s.id}" style="position: absolute; right: 0; color: var(--color-error); font-size: 0.8rem; padding: 4px;">&times;</button>` : ''}
                    </div>
                  `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    container.querySelector('#btn-add-sch')?.addEventListener('click', async () => {
      const day = parseInt(container.querySelector('#sch-day').value);
      const time = container.querySelector('#sch-time').value;
      const activity = container.querySelector('#sch-activity').value.trim();
      if (!time || !activity) return showToast('Введите время и занятие', 'error');

      const { error } = await supabase.from('schedule').insert([{
        group_name: groupName, day_of_week: day, time_slot: time, activity
      }]);
      if (error) return showToast('Ошибка: ' + error.message, 'error');
      showToast('Занятие добавлено');
      renderSchedule(groupName, role, onBack)(container);
    });

    container.querySelectorAll('.btn-delete-sch').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Удалить это занятие?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('schedule').delete().eq('id', id);
        if (error) return showToast('Ошибка: ' + error.message, 'error');
        showToast('Занятие удалено');
        renderSchedule(groupName, role, onBack)(container);
      });
    });
  };
}

// ============================
// MEAL MENU (Меню питания)
// ============================
export function renderMealMenu(groupName, role, onBack) {
  return async (container) => {
    const { data: meals } = await supabase
      .from('meal_menu')
      .select('*')
      .eq('group_name', groupName)
      .order('menu_date', { ascending: false })
      .limit(30);

    const today = new Date().toISOString().split('T')[0];
    
    // Group by date
    const grouped = {};
    (meals || []).forEach(m => {
      if (!grouped[m.menu_date]) grouped[m.menu_date] = [];
      grouped[m.menu_date].push(m);
    });
    const dates = Object.keys(grouped).sort().reverse();

    container.innerHTML = `
      <div class="feature-screen animate-fade-in">
        <div class="feature-header">
          <button class="btn-back" id="btn-back">${arrowLeftIcon(20)} Назад</button>
          <h2>${utensilsIcon(22)} Меню питания</h2>
        </div>

        ${role === 'teacher' ? `
        <div class="feature-form card">
          <h3>Добавить блюдо</h3>
          <input type="date" id="meal-date" class="form-input" value="${today}" />
          <select id="meal-type" class="form-input">
            <option value="Завтрак">🌅 Завтрак</option>
            <option value="Обед">☀️ Обед</option>
            <option value="Полдник">🌙 Полдник</option>
          </select>
          <input type="text" id="meal-desc" class="form-input" placeholder="Блюдо (напр. Каша овсяная, чай)" />
          <button class="btn btn-primary" id="btn-add-meal">${plusIcon(18)} Добавить</button>
        </div>
        ` : ''}

        <div class="feature-list">
          ${dates.length === 0 ? '<div class="empty-state"><div class="empty-state-text">Меню пока не заполнено</div></div>' :
            dates.map(date => `
              <div class="menu-day-card ${date === today ? 'today' : ''}">
                <div class="menu-day-title">${date === today ? '📌 Сегодня' : formatDate(date)}</div>
                <div class="menu-meals">
                  ${grouped[date].map(m => `
                    <div class="menu-meal-item" style="position: relative; padding-right: 30px;">
                      <span class="menu-meal-type">${m.meal_type}</span>
                      <span class="menu-meal-desc">${escapeHtml(m.description)}</span>
                      ${role === 'teacher' ? `<button class="btn-icon btn-delete-meal" data-id="${m.id}" style="position: absolute; right: 0; top: 0; bottom: 0; color: var(--color-error); font-size: 0.8rem; padding: 4px;">&times;</button>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    container.querySelector('#btn-add-meal')?.addEventListener('click', async () => {
      const date = container.querySelector('#meal-date').value;
      const type = container.querySelector('#meal-type').value;
      const desc = container.querySelector('#meal-desc').value.trim();
      if (!date || !desc) return showToast('Введите дату и блюдо', 'error');

      const { error } = await supabase.from('meal_menu').insert([{
        group_name: groupName, menu_date: date, meal_type: type, description: desc
      }]);
      if (error) return showToast('Ошибка: ' + error.message, 'error');
      showToast('Меню обновлено');
      renderMealMenu(groupName, role, onBack)(container);
    });

    container.querySelectorAll('.btn-delete-meal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Удалить это блюдо?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('meal_menu').delete().eq('id', id);
        if (error) return showToast('Ошибка: ' + error.message, 'error');
        showToast('Блюдо удалено');
        renderMealMenu(groupName, role, onBack)(container);
      });
    });
  };
}
