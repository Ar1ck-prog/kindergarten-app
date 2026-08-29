import { getCurrentUser, getProfile, updateProfile, signOut } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';
import { backIcon, cameraIcon, userIcon, logoIcon } from '../icons.js';

/**
 * Render the Profile screen.
 */
export async function renderProfile() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-spinner-lg"></div>
      <div class="loading-text">Загрузка профиля...</div>
    </div>
  `;

  const user = await getCurrentUser();
  if (!user) {
    navigate('/login');
    return;
  }

  const { profile, error } = await getProfile(user.id);
  if (error || !profile) {
    showToast('Ошибка загрузки профиля', 'error');
    navigate('/login');
    return;
  }

  let isSubmitting = false;

  function render() {
    // Generate initials for fallback avatar
    const initials = (profile.first_name[0] || '') + (profile.last_name[0] || '');
    const hue = (profile.first_name.charCodeAt(0) * 37) % 360;

    app.innerHTML = `
      <header class="app-header">
        <div class="header-inner">
          <button class="btn-icon" id="btn-back">
            ${backIcon()} Назад
          </button>
          <div class="header-title" style="margin: 0 auto; transform: translateX(-20px);">
            <span class="header-logo">${logoIcon(24)}</span>
            <h2>Профиль</h2>
          </div>
        </div>
      </header>

      <main class="dashboard profile-dashboard animate-slide-up">
        <div class="profile-card">
          <div class="avatar-upload-container">
            <div class="profile-avatar-large" style="--avatar-hue: ${hue};">
              ${profile.avatar_url 
                ? `<img src="${profile.avatar_url}" alt="Avatar" class="avatar-img" />` 
                : `<span class="avatar-initials">${initials.toUpperCase()}</span>`}
              <label for="avatar-upload" class="avatar-upload-btn">
                ${cameraIcon(18)}
              </label>
              <input type="file" id="avatar-upload" accept="image/*" style="display: none;" />
            </div>
          </div>

          <form id="profile-form" class="profile-form">
            <div class="form-group">
              <label for="first-name">Имя</label>
              <input type="text" id="first-name" class="form-input" value="${profile.first_name || ''}" required />
            </div>
            <div class="form-group">
              <label for="last-name">Фамилия</label>
              <input type="text" id="last-name" class="form-input" value="${profile.last_name || ''}" required />
            </div>
            
            <div class="profile-role-badge">
              <span class="chip-icon">${userIcon(16)}</span>
              Роль: ${profile.role === 'admin' ? 'Администратор' : profile.role === 'director' ? 'Директор' : profile.role === 'teacher' ? 'Воспитатель' : 'Родитель'}
            </div>

            <button type="submit" class="btn btn-primary" id="btn-save" ${isSubmitting ? 'disabled' : ''}>
              ${isSubmitting ? '<span class="spinner"></span> Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>

          <div class="profile-actions">
            <button class="btn-logout btn-logout-full" id="btn-logout-profile">Выйти из аккаунта</button>
          </div>
        </div>
      </main>
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('btn-back').addEventListener('click', () => {
      // Go back to the dashboard based on role
      if (profile.role === 'admin') navigate('/admin');
      else if (profile.role === 'director') navigate('/director');
      else if (profile.role === 'teacher') navigate('/teacher');
      else navigate('/parent');
    });

    document.getElementById('btn-logout-profile').addEventListener('click', async () => {
      await signOut();
      navigate('/login');
    });

    document.getElementById('avatar-upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Ensure file is an image and not too large (e.g., < 2MB for base64)
      if (file.size > 2 * 1024 * 1024) {
        showToast('Файл слишком большой (макс 2MB)', 'error');
        return;
      }

      // Read as Data URL (base64)
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target.result;
        profile.avatar_url = base64String;
        
        // Save immediately when selected
        const { error: uploadError } = await updateProfile(user.id, { avatar_url: base64String });
        if (uploadError) {
          showToast('Ошибка сохранения фото', 'error');
        } else {
          showToast('Фото обновлено', 'success');
        }
        render(); // Re-render to show new avatar
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const firstName = document.getElementById('first-name').value.trim();
      const lastName = document.getElementById('last-name').value.trim();

      if (!firstName) {
        showToast('Имя не может быть пустым', 'error');
        return;
      }

      isSubmitting = true;
      render();

      const { error: saveError } = await updateProfile(user.id, {
        first_name: firstName,
        last_name: lastName
      });

      isSubmitting = false;

      if (saveError) {
        showToast('Ошибка: ' + saveError, 'error');
      } else {
        profile.first_name = firstName;
        profile.last_name = lastName;
        showToast('Профиль сохранён', 'success');
      }
      render();
    });
  }

  render();
}
