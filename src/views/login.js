import { signIn, signUp, createGroup, joinGroup, getProfile } from '../auth.js';
import { supabase } from '../supabase.js';
import { navigate } from '../router.js';
import { logoIcon } from '../icons.js';

/**
 * Render the login screen.
 */
export async function renderLogin() {
  const app = document.getElementById('app');
  let currentMode = 'login'; // 'login', 'register', 'onboarding_teacher', 'onboarding_parent'
  let currentUser = null;
  let currentProfile = null;

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
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div class="form-group" id="adminCodeGroup" style="display:none;">
            <label for="adminCode">Секретный код администратора</label>
            <input class="form-input" type="text" id="adminCode" placeholder="Введите код администратора" />
          </div>
          <div class="form-group" id="teacherCodeGroup" style="display:none;">
            <label for="teacherCode">Секретный код воспитателя</label>
            <input class="form-input" type="text" id="teacherCode" placeholder="Введите код для воспитателей" />
          </div>
          <button class="btn btn-primary" type="submit" id="btn-submit">Зарегистрироваться</button>
          <div style="text-align:center; margin-top:15px; font-size: 0.9rem;">
            Уже есть аккаунт? <a href="#" id="link-login" style="color:var(--color-accent); font-weight:600;">Войти</a>
          </div>
        </form>
      `;
    } else if (currentMode === 'onboarding_teacher') {
      formHtml = `
        <form id="auth-form" autocomplete="off">
          <h3 style="margin-bottom: 15px; font-size:1.2rem;">Создайте группу</h3>
          <p style="margin-bottom: 20px; font-size:0.9rem; color:var(--color-text-secondary);">
            Чтобы начать работу, создайте группу. После создания вы получите код приглашения для родителей.
          </p>
          <div class="form-group">
            <label for="groupName">Название группы</label>
            <input class="form-input" type="text" id="groupName" placeholder="Например: Солнышко" required />
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

    document.getElementById('role')?.addEventListener('change', (e) => {
      const teacherGroup = document.getElementById('teacherCodeGroup');
      const adminGroup = document.getElementById('adminCodeGroup');
      const teacherInput = document.getElementById('teacherCode');
      const adminInput = document.getElementById('adminCode');
      
      if (teacherGroup && adminGroup) {
        if (e.target.value === 'teacher') {
          teacherGroup.style.display = 'block';
          adminGroup.style.display = 'none';
          if(teacherInput) teacherInput.required = true;
          if(adminInput) adminInput.required = false;
        } else if (e.target.value === 'admin') {
          adminGroup.style.display = 'block';
          teacherGroup.style.display = 'none';
          if(adminInput) adminInput.required = true;
          if(teacherInput) teacherInput.required = false;
        } else {
          teacherGroup.style.display = 'none';
          adminGroup.style.display = 'none';
          if(teacherInput) teacherInput.required = false;
          if(adminInput) adminInput.required = false;
        }
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
        const adminCode = document.getElementById('adminCode')?.value.trim();

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

        if (role === 'admin' && adminCode !== 'adminBalaQ2026') {
          showError('Неверный секретный код администратора!');
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

      } else if (currentMode === 'onboarding_teacher') {
        const groupName = document.getElementById('groupName').value.trim();
        const { group, error } = await createGroup(currentUser.id, groupName);

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
          // We don't block login if this fails, they are already in the group
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

    // Check if they need to join/create a group
    if (!profile.group_name) {
      if (profile.role === 'teacher') {
        currentMode = 'onboarding_teacher';
      } else {
        currentMode = 'onboarding_parent';
      }
      renderView();
    } else {
      // Already in a group
      if (profile.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/parent');
      }
    }
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
