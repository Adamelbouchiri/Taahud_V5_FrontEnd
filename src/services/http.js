import axios from 'axios';

/* ============================================================
 *  HTTP CLIENT
 *  ----------------------------------------------------------------
 *  A single configured axios instance used by every service file.
 *  Centralizes the four things you'd otherwise repeat everywhere:
 *
 *    1. Base URL          — comes from VITE_API_URL (.env)
 *    2. Auth token        — auto-injected from localStorage
 *    3. JSON headers      — set by default
 *    4. Error normalization — every error has a clean .message
 *
 *  Usage from a service file:
 *
 *      import http from './http';
 *      return http.post('/projects', payload);
 *
 *  axios returns response.data directly (see interceptor below),
 *  so callers don't need to write `.then(r => r.data)`.
 * ============================================================ */


/* -------------------------------------------------------------
 * 1. The instance
 * ----------------------------------------------------------- */

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Sanctum cookie auth? Uncomment this:
  // withCredentials: true,
});


/* -------------------------------------------------------------
 * 2. Request interceptor — attach auth token
 * ----------------------------------------------------------- */

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


/* -------------------------------------------------------------
 * 3. Response interceptor — unwrap data + normalize errors
 * ----------------------------------------------------------- */

http.interceptors.response.use(
  // SUCCESS: unwrap response.data so callers get the body directly.
  (response) => response.data,

  // ERROR: build a clean Error with .message + .status + .data.
  (error) => {
    // 401 → token expired or invalid. Clear it from storage so the
    // next navigation through RequireAuth bounces the user to /login.
    // We don't redirect here directly because that would do a full
    // page reload and lose React Router's `from` location state (which
    // powers the post-login redirect-back UX).
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }

    const data = error.response?.data;

    // Try in order: explicit message → explicit error → first
    // Laravel validation message → axios fallback.
    const message =
      data?.message ||
      data?.error ||
      (data?.errors && Object.values(data.errors).flat()[0]) ||
      error.message ||
      'حدث خطأ غير متوقّع.';

    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.data = data;
    return Promise.reject(normalized);
  }
);


export default http;
