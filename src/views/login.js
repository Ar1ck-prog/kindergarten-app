import { signIn, signUp, createGroup, joinGroup, createKindergarten, joinKindergarten, joinExistingGroup, getProfile } from '../auth.js';
import { supabase } from '../supabase.js';
import { navigate } from '../router.js';
import { logoIcon } from '../icons.js';

/**
 * Render the login screen.
 */
export async function renderLogin() {
  const app = document.getElementById('app');
  // Modes: login, register, onboarding_director, onboarding_teacher_kg, onboarding_teacher_group, onboarding_parent
  let currentMode = 'login';
  let currentUser = null;
  let currentProfile = null;
  let teacherKindergartenId = null; // set after teacher joins a kindergarten

  function renderView() {
    let formHtml = '';

    if (currentMode === 'login') {
      formHtml = `
        <form id="auth-form" autocomplete="on">
          <div class="form-group">
            <label for="email">Email</label>
            <input class="form-input" type="email" id="email" required />
          </div>
          <div class="form-group">
            <label for="password">Пароль</label>
            <input class="form-input" type="password" id="password" required />
          </div>
          <button class="btn btn-primary" type="submit" id="btn-submit">Войти</button>
          <div style="text-align:center; margin-top:15px; font-size: 0.9rem;">
            Нет аккаунта? <a href="#" id="link-register" style="color:var(--color-accent); font-weight:600;">Зарегистрироваться</a>
          </div>
        </form>
      `;
    } else if (currentMode === 'register') {
      formHtml = `
        <form id="auth-form" autocomplete="off">
          <div style="display:flex; gap:10px;">
            <div class="form-group" style="flex:1;">
              <label for="firstName">Имя</label>
              <input class="form-input" type="text" id="firstName" required />
            </div>
            <div class="form-group" style="flex:1;">
              <label for="lastName">Фамилия</label>
              <input class="form-input" type="text" id="lastName" required />
            </div>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input class="form-input" type="email" id="email" required />
          </div>
          <div class="form-group">
            <label for="password">Пароль</label>
            <input class="form-input" type="password" id="password" minlength="6" required />
          </div>
          <div class="form-group">
            <label for="passwordRepeat">Повторите пароль</label>
            <input class="form-input" type="password" id="passwordRepeat" minlength="6" required />
          </div>
          <div class="form-group">
            <label for="role">Я — ...</label>
            <select class="form-input" id="role" required>
              <option value="parent">Родитель</option>
              <option value="teacher">Воспитатель</option>
              <option value="director">Директор</option>
            </select>
          </div>
          <div class="form-group" id="teacherCodeGroup" style="display:none;">
            <label for="teacherCode">Секретный код воспитателя</label>
            <input class="form-input" type="text" id="teacherCode" placeholder="Введите код для воспитателей" />
          </div>
          <div class="form-group" id="directorCodeGroup" style="display:none;">
            <label for="directorCode">Секретный код директора</label>
            <input class="form-input" type="text" id="directorCode" placeholder="Введите код для директоров" />
          </div>
          <button class="btn btn-primary" type="submit" id="btn-submit">Зарегистрироваться</button>
          <div style="text-align:center; margin-top:15px; font-size: 0.9rem;">
            Уже есть аккаунт? <a href="#" id="link-login" style="color:var(--color-accent); font-weight:600;">Войти</a>
          </div>
        </form>
      `;
    } else if (currentMode === 'onboarding_director') {
      formHtml = `
        <form id="auth-form" autocomplete="off">
          <h3 style="margin-bottom: 15px; font-size:1.2rem;">Создайте садик</h3>
          <p style="margin-bottom: 20px; font-size:0.9rem; color:var(--color-text-secondary);">
            Введите название вашего детского садика. После создания вы получите код приглашения для воспитателей.
          </p>
          <div class="form-group">
            <label for="kindergartenName">Название садика</label>
            <input class="form-input" type="text" id="kindergartenName" placeholder="Например: Солнышко" required />
          </div>
          <button class="btn btn-primary" type="submit" id="btn-submit">Создать садик</button>
        </form>
      `;
    } else if (currentMode === 'onboarding_teacher_kg') {
      formHtml = `
        <form id="auth-form" autocomplete="off">
          <h3 style="margin-bottom: 15px; font-size:1.2rem;">Присоединитесь к садику</h3>
          <p style="margin-bottom: 20px; font-size:0.9rem; color:var(--color-text-secondary);">
            Введите код приглашения от директора вашего садика.
          </p>
          <div class="form-group">
            <label for="kgInviteCode">Код садика</label>
            <input class="form-input" type="text" id="kgInviteCode" placeholder="Например: AB38X9" required style="text-transform: uppercase;" />
          </div>
          <button class="btn btn-primary" type="submit" id="btn-submit">Присоединиться к садику</button>
        </form>
      `;
    } else if (currentMode === 'onboarding_teacher_group') {
      formHtml = `
        <form id="auth-form" autocomplete="off">
          <h3 style="margin-bottom: 15px; font-size:1.2rem;">Выберите или создайте группу</h3>
          <p style="margin-bottom: 20px; font-size:0.9rem; color:var(--color-text-secondary);">
            Создайте новую группу или присоединитесь к существующей.
          </p>
          <div id="existing-groups-list" style="margin-bottom: 20px;"></div>
          <hr style="border: none; border-top: 1px solid var(--color-border); margin: 20px 0;" />
          <h4 style="margin-bottom: 10px;">Или создайте новую группу:</h4>
          <div class="form-group">
            <label for="groupName">Название группы</label>
            <input class="form-input" type="text" id="groupName" placeholder="Например: Звёздочки" required />
          </div>
          <button class="btn btn-primary" type="submit" id="btn-submit">Создать группу</button>
        </form>
      `;
    } else if (currentMode === 'onboarding_parent') {
      formHtml = `
        <form id="auth-form" autocomplete="off">
          <h3 style="margin-bottom: 15px; font-size:1.2rem;">Присоединитесь к группе</h3>
          <p style="margin-bottom: 20px; font-size:0.9rem; color:var(--color-text-secondary);">
            Введите секретный код группы и данные вашего ребёнка.
          </p>
          <div class="form-group">
            <label for="inviteCode">Код приглашения</label>
            <input class="form-input" type="text" id="inviteCode" placeholder="Например: AB38X9" required style="text-transform: uppercase;" />
          </div>
          
          <div style="display:flex; gap:10px; margin-top: 15px;">
            <div class="form-group" style="flex:1;">
              <label for="childFirstName">Имя ребёнка</label>
              <input class="form-input" type="text" id="childFirstName" required />
            </div>
            <div class="form-group" style="flex:1;">
              <label for="childLastName">Фамилия ребёнка</label>
              <input class="form-input" type="text" id="childLastName" required />
            </div>
          </div>
          <div class="form-group">
            <label for="childAllergies">Аллергии (если есть)</label>
            <input class="form-input" type="text" id="childAllergies" placeholder="Нет" />
          </div>

          <button class="btn btn-primary" type="submit" id="btn-submit" style="margin-top: 10px;">Присоединиться</button>
        </form>
      `;
    }

    app.innerHTML = `
      <div class="login-screen">
        <div class="login-orb login-orb-1"></div>
        <div class="login-orb login-orb-2"></div>
        <div class="login-orb login-orb-3"></div>

        <div class="login-card animate-slide-up">
          <div class="login-logo">
            <div class="login-logo-icon">${logoIcon(60)}</div>
            <h1>BalaQ</h1>
            <p>${currentMode === 'login' ? 'Войдите в свой аккаунт' : 
                currentMode === 'register' ? 'Создайте новый аккаунт' : 'Добро пожаловать!'}</p>
          </div>

          <div id="login-error" style="display:none" class="login-error"></div>

          ${formHtml}
        </div>
      </div>
    `;

    bindEvents();

    // If teacher group selection mode, load existing groups
    if (currentMode === 'onboarding_teacher_group' && teacherKindergartenId) {
      loadExistingGroups();
    }
  }

  async function loadExistingGroups() {
    const container = document.getElementById('existing-groups-list');
    if (!container) return;

    const { data: groups } = await supabase
      .from('groups')
      .select('id, name, invite_code')
      .eq('kindergarten_id', teacherKindergartenId);

    if (groups && groups.length > 0) {
      container.innerHTML = `
        <h4 style="margin-bottom: 10px;">Существующие группы:</h4>
        <div style="display: grid; gap: 8px;">
          ${groups.map(g => `
            <button type="button" class="btn btn-secondary btn-join-group" data-group-name="${g.name}" style="text-align: left; padding: 12px;">
              <strong>${g.name}</strong> <span style="font-size:0.8rem; color: var(--color-text-secondary);">(Код: ${g.invite_code})</span>
            </button>
          `).join('')}
        </div>
      `;

      container.querySelectorAll('.btn-join-group').forEach(btn => {
        btn.addEventListener('click', async () => {
          const groupName = btn.dataset.groupName;
          const { error } = await joinExistingGroup(currentUser.id, groupName);
          if (error) {
            showError(error);
            return;
          }
          navigate('/teacher');
        });
      });
    } else {
      container.innerHTML = `
        <p style="font-size: 0.9rem; color: var(--color-text-secondary);">В этом садике пока нет групп. Создайте первую!</p>
      `;
      // Make groupName not required so user must fill it
      const groupNameInput = document.getElementById('groupName');
      if (groupNameInput) groupNameInput.required = true;
    }
  }

  function bindEvents() {
    const form = document.getElementById('auth-form');
    const errorEl = document.getElementById('login-error');
    const btnSubmit = document.getElementById('btn-submit');

    document.getElementById('link-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      currentMode = 'register';
      renderView();
    });

    document.getElementById('link-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      currentMode = 'login';
      renderView();
    });

    // Role change handler — show/hide secret code fields
    document.getElementById('role')?.addEventListener('change', (e) => {
      const teacherCodeGroup = document.getElementById('teacherCodeGroup');
      const directorCodeGroup = document.getElementById('directorCodeGroup');
      
      if (teacherCodeGroup) {
        teacherCodeGroup.style.display = e.target.value === 'teacher' ? 'block' : 'none';
        document.getElementById('teacherCode').required = e.target.value === 'teacher';
      }
      if (directorCodeGroup) {
        directorCodeGroup.style.display = e.target.value === 'director' ? 'block' : 'none';
        document.getElementById('directorCode').required = e.target.value === 'director';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      btnSubmit.disabled = true;
      const originalText = btnSubmit.textContent;
      btnSubmit.innerHTML = '<span class="spinner"></span> Подождите...';

      if (currentMode === 'login') {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const { user, error } = await signIn(email, password);

        if (error) {
          showError(translateError(error));
          resetBtn();
          return;
        }

        currentUser = user;
        await checkProfileAndRoute();

      } else if (currentMode === 'register') {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const passwordRepeat = document.getElementById('passwordRepeat').value;
        const role = document.getElementById('role').value;
        const teacherCode = document.getElementById('teacherCode')?.value.trim();
        const directorCode = document.getElementById('directorCode')?.value.trim();

        if (password !== passwordRepeat) {
          showError('Пароли не совпадают!');
          resetBtn();
          return;
        }

        if (role === 'teacher' && teacherCode !== 'teacher2026') {
          showError('Неверный секретный код воспитателя!');
          resetBtn();
          return;
        }

        if (role === 'director' && directorCode !== 'director2026') {
          showError('Неверный секретный код директора!');
          resetBtn();
          return;
        }

        const { user, error } = await signUp(email, password, { firstName, lastName, role });
        
        if (error) {
          showError(translateError(error));
          resetBtn();
          return;
        }
        
        currentUser = user;
        await checkProfileAndRoute();

      } else if (currentMode === 'onboarding_director') {
        const kindergartenName = document.getElementById('kindergartenName').value.trim();
        const { kindergarten, error } = await createKindergarten(currentUser.id, kindergartenName);

        if (error) {
          showError('Не удалось создать садик: ' + error);
          resetBtn();
          return;
        }
        navigate('/director');

      } else if (currentMode === 'onboarding_teacher_kg') {
        const kgCode = document.getElementById('kgInviteCode').value.trim();
        const { kindergarten, error } = await joinKindergarten(currentUser.id, kgCode);

        if (error) {
          showError(error);
          resetBtn();
          return;
        }

        teacherKindergartenId = kindergarten.id;
        currentMode = 'onboarding_teacher_group';
        renderView();

      } else if (currentMode === 'onboarding_teacher_group') {
        const groupName = document.getElementById('groupName').value.trim();
        if (!groupName) {
          showError('Введите название группы');
          resetBtn();
          return;
        }

        const { group, error } = await createGroup(currentUser.id, groupName, teacherKindergartenId);

        if (error) {
          showError('Не удалось создать группу: ' + error);
          resetBtn();
          return;
        }
        navigate('/teacher');

      } else if (currentMode === 'onboarding_parent') {
        const inviteCode = document.getElementById('inviteCode').value.trim();
        const childFirst = document.getElementById('childFirstName').value.trim();
        const childLast = document.getElementById('childLastName').value.trim();
        const childAllergies = document.getElementById('childAllergies').value.trim();

        const { group, error } = await joinGroup(currentUser.id, inviteCode);

        if (error) {
          showError(error);
          resetBtn();
          return;
        }

        // Insert child into children table
        const { error: childError } = await supabase
          .from('children')
          .insert([{ 
            first_name: childFirst, 
            last_name: childLast, 
            allergies: childAllergies, 
            group_name: group.name,
            parent_id: currentUser.id 
          }]);

        if (childError) {
          console.error('Ошибка добавления ребёнка:', childError);
        }

        navigate('/parent');
      }

      function resetBtn() {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
      }
    });

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  async function checkProfileAndRoute() {
    const { profile, error } = await getProfile(currentUser.id);
    if (error || !profile) {
      document.getElementById('login-error').textContent = 'Ошибка профиля. Обратитесь в поддержку.';
      document.getElementById('login-error').style.display = 'block';
      return;
    }
    
    currentProfile = profile;

    // Admin goes straight to admin dashboard
    if (profile.role === 'admin') {
      navigate('/admin');
      return;
    }

    // Director: needs to create kindergarten if not yet
    if (profile.role === 'director') {
      if (!profile.kindergarten_id) {
        currentMode = 'onboarding_director';
        renderView();
      } else {
        navigate('/director');
      }
      return;
    }

    // Teacher: needs kindergarten first, then group
    if (profile.role === 'teacher') {
      if (!profile.kindergarten_id) {
        currentMode = 'onboarding_teacher_kg';
        renderView();
      } else if (!profile.group_name) {
        teacherKindergartenId = profile.kindergarten_id;
        currentMode = 'onboarding_teacher_group';
        renderView();
      } else {
        navigate('/teacher');
      }
      return;
    }

    // Parent: needs to join a group
    if (profile.role === 'parent') {
      if (!profile.group_name) {
        currentMode = 'onboarding_parent';
        renderView();
      } else {
        navigate('/parent');
      }
      return;
    }

    navigate('/welcome');
  }

  renderView();
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (msg.includes('User already registered')) return 'Пользователь с таким email уже существует';
  if (msg.includes('Password should be at least')) return 'Пароль должен быть не менее 6 символов';
  if (msg.includes('email rate limit exceeded')) return 'Слишком много попыток регистрации. Отключите "Confirm email" в настройках Supabase.';
  return 'Ошибка: ' + msg;
}
