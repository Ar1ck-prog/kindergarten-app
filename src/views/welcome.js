import { navigate } from '../router.js';
import { logoIcon } from '../icons.js';

export function renderWelcome() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="welcome-screen animate-fade-in">
      <div class="welcome-bg" style="background-image: url('/welcome_bg.jpg')"></div>
      <div class="welcome-overlay"></div>
      
      <div class="welcome-content animate-slide-up delay-2">
        <div class="welcome-logo">
          <div class="welcome-logo-icon">${logoIcon(80)}</div>
          <h1 class="welcome-title">Sadik</h1>
          <p class="welcome-subtitle">Добро пожаловать в лучшее пространство для развития вашего ребёнка</p>
        </div>
        
        <button class="btn btn-primary btn-lg" id="btn-start">
          Вход
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-start').addEventListener('click', () => {
    navigate('/login');
  });
}
