import { API_BASE_URL } from '../api.js';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const originalFetch = window.fetch;

window.fetch = async function (url, options = {}) {
  options.headers = options.headers || {};
  options.credentials = 'include';

  const csrfToken = getCookie('csrfToken');
  if (csrfToken) {
    if (options.headers instanceof Headers) {
      options.headers.set('X-CSRF-Token', csrfToken);
    } else {
      options.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  let response = await originalFetch(url, options);

  const urlStr = typeof url === 'string' ? url : (url.url || '');
  if (
    response.status === 401 &&
    !urlStr.includes('/api/store-owner/auth/google') &&
    !urlStr.includes('/api/auth/verify-otp') &&
    !urlStr.includes('/api/auth/refresh')
  ) {
    try {
      const refreshResponse = await originalFetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (refreshResponse.ok) {
        response = await originalFetch(url, options);
      } else {
        console.warn("Refresh token expired, logging out.");
        localStorage.removeItem('isLoggedIn');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } catch (err) {
      console.error("Global fetch refresh error:", err);
    }
  }

  return response;
};
