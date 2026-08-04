import { route, startRouter, navigate } from './router.js';
import { getCurrentUser, getProfile } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderTeacher } from './views/teacher.js';
import { renderParent } from './views/parent.js';
import { renderProfile } from './views/profile.js';
import { renderWelcome } from './views/welcome.js';

// --- Toast utility (exported for views) ---
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

// --- Register routes ---
route('/welcome', renderWelcome);
route('/login', renderLogin);
route('/teacher', renderTeacher);
route('/parent', renderParent);
route('/profile', renderProfile);

// --- Auto-redirect if already logged in ---
async function init() {
  const app = document.getElementById('app');
  const path = window.location.hash.slice(1);

  // If already on a specific route, let the router handle it
  if (path === '/teacher' || path === '/parent' || path === '/profile') {
    startRouter();
    return;
  }

  // Show loading while checking session
  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-spinner-lg"></div>
      <div class="loading-text">Проверка сессии...</div>
    </div>
  `;

  try {
    const user = await getCurrentUser();

    if (user) {
      const { profile } = await getProfile(user.id);

      if (profile?.role === 'teacher') {
        navigate('/teacher');
      } else if (profile?.role === 'parent') {
        navigate('/parent');
      } else {
        navigate('/welcome');
      }
    } else {
      navigate('/welcome');
    }
  } catch {
    navigate('/welcome');
  }

  startRouter();
}

init();
