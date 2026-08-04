/**
 * Simple hash-based SPA router.
 */

const routes = {};
let currentCleanup = null;

/**
 * Register a route handler.
 * @param {string} path - The hash path (e.g., '/login', '/teacher', '/parent')
 * @param {Function} handler - Async function that renders the view and optionally returns a cleanup function
 */
export function route(path, handler) {
  routes[path] = handler;
}

/**
 * Navigate to a given hash path.
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = `#${path}`;
}

/**
 * Get the current hash path.
 * @returns {string}
 */
export function getCurrentPath() {
  return window.location.hash.slice(1) || '/welcome';
}

/**
 * Start listening for hash changes and render the initial route.
 */
export function startRouter() {
  async function handleRoute() {
    const path = getCurrentPath();
    const handler = routes[path];

    // Cleanup previous view
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    if (handler) {
      currentCleanup = await handler();
    } else {
      // Unknown route — go to welcome
      navigate('/welcome');
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
