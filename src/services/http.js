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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Sanctum cookie auth? Uncomment this:
  // withCredentials: true,
});


/* -------------------------------------------------------------
 * Storage URL helper
 * -------------------------------------------------------------
 * Laravel serves uploaded files from <BE host>/storage/<path> via
 * the storage symlink. We always rebuild the URL using the FE's
 * configured backend host (VITE_API_URL minus the trailing /api),
 * even when the BE returns an absolute URL — because the BE may
 * embed the wrong host (`localhost` vs `127.0.0.1`, public IP, or
 * an internal hostname) and the browser would fail to reach it.
 *
 * Algorithm:
 *   1. Take VITE_API_URL, strip trailing /api → backend host.
 *   2. Extract the storage path from whatever the BE returned —
 *      everything after the first /storage/ if present, otherwise
 *      treat the input as a bare storage-relative path.
 *   3. Concatenate: <backend host>/storage/<path>.
 *
 * Empty input → empty string (callers can detect missing files).
 * ----------------------------------------------------------- */

// http://127.0.0.1:8000/api → http://127.0.0.1:8000
const BACKEND_HOST = API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveFileUrl(raw) {
  if (!raw) return '';

  // If the input contains /storage/<path>, lift just <path> out —
  // we don't trust the host the BE put in front of it.
  const storageMatch = raw.match(/\/storage\/(.+)$/i);
  if (storageMatch) {
    return `${BACKEND_HOST}/storage/${storageMatch[1]}`;
  }

  // No /storage/ marker. Strip a leading slash if present, then
  // treat the whole thing as a storage-relative path.
  const path = raw.replace(/^\/+/, '');
  return `${BACKEND_HOST}/storage/${path}`;
}


/* -------------------------------------------------------------
 * 2. Request interceptor — attach auth token
 * -------------------------------------------------------------
 * Token may live in either bucket depending on the user's
 * remember_me choice at login (see services/auth.js):
 *   localStorage   → persistent (remember_me = true)
 *   sessionStorage → tab-scoped (remember_me = false)
 * Read both; the active session can only have written to one.
 * ----------------------------------------------------------- */

http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');
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
      sessionStorage.removeItem('token');
    }

    // 403 + { code: 'phone_not_verified' } → the BE's phone-verified
    // middleware refused this request. Mark the local snapshot
    // unverified (so RequireVerified gates subsequent navigations) and
    // hard-redirect to /otp. Unlike the 401 path we DO navigate here:
    // there's no `from`-state UX to preserve, and the user must verify
    // before anything else works. Guard against a redirect loop when
    // the failing request originated from /otp itself.
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'phone_not_verified'
    ) {
      // Mirror savePhoneVerified() in auth.js: write '0' to the bucket
      // the token lives in, clear the other. Kept as literals here to
      // match the 401 handler above and avoid a circular import.
      const persistent = Boolean(localStorage.getItem('token'));
      if (persistent) {
        localStorage.setItem('taahud:phone_verified', '0');
        sessionStorage.removeItem('taahud:phone_verified');
      } else {
        sessionStorage.setItem('taahud:phone_verified', '0');
        localStorage.removeItem('taahud:phone_verified');
      }
      if (window.location.pathname !== '/otp') {
        window.location.assign('/otp');
      }
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
