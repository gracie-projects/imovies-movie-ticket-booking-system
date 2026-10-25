import axios from 'axios';

const api = axios.create({
  // Same-origin "/api" by default (Vite proxy in development, Express in production).
  // Set VITE_API_URL when the API is hosted on a different domain.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

let unauthorizedHandler = null;

/** Registered by AuthContext so an expired session logs the user out everywhere */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const SILENT_401 = ['/auth/me', '/auth/login', '/auth/register', '/auth/change-password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && unauthorizedHandler && !SILENT_401.some((path) => url.endsWith(path))) {
      unauthorizedHandler(error.response?.data?.message);
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.request && !error.response) return 'Cannot reach the IMovies server. Check your connection and try again.';
  return fallback;
}

export default api;
