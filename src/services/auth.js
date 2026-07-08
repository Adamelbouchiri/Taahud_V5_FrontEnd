import http from './http';

/* ============================================================
 *  AUTH SERVICE — wired to the real backend.
 *  ----------------------------------------------------------------
 *  Endpoint base is /api (set via VITE_API_URL). All paths below
 *  are relative to that, so the URLs Laravel sees are:
 *
 *    POST  /api/auth/register
 *    POST  /api/auth/login
 *    GET   /api/auth/me
 *    POST  /api/auth/otp/send
 *    POST  /api/auth/otp/verify
 *    POST  /api/auth/logout
 *    POST  /api/auth/logout-all
 *
 *  The bearer token is attached automatically by http.js's request
 *  interceptor — see services/http.js.
 *
 *  Token storage (per FRONTEND_INTEGRATION.md §4):
 *    remember_me === true   → localStorage  (survives browser close,
 *                                            paired with BE's 30-day
 *                                            TTL)
 *    remember_me === false  → sessionStorage (dies with the tab,
 *                                             paired with BE's 24h TTL)
 *  http.js reads from BOTH on every request and clears BOTH on 401,
 *  so the read path doesn't have to know which one was written.
 *
 *  Phone format: every phone payload must be normalized to
 *  +9665XXXXXXXX BEFORE being sent here. The auth pages handle
 *  that with normalizePhone() before calling these functions.
 * ============================================================ */

const TOKEN_KEY = 'token';
const ROLES_KEY = 'taahud:roles';
const VERIFIED_KEY = 'taahud:phone_verified';

/* Save the bearer token to the right storage based on persistence
   intent. When persistent, use localStorage; otherwise sessionStorage.
   Always clear the OTHER bucket so a stale token from a previous
   session can't shadow the new one. */
function saveToken(token, persistent) {
  if (!token) return;
  if (persistent) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

/* Mirror the roles claim that comes with /login + /register to the
   same storage bucket as the token, so RequireAdmin / RequireSuperAdmin
   can answer synchronously without waiting on /auth/me. The roles
   array stays authoritative on the BE — http.js's 401 path will clear
   both keys, and useUser().refresh() rewrites them from /auth/me. */
function saveRoles(roles, persistent) {
  const json = JSON.stringify(Array.isArray(roles) ? roles : []);
  if (persistent) {
    localStorage.setItem(ROLES_KEY, json);
    sessionStorage.removeItem(ROLES_KEY);
  } else {
    sessionStorage.setItem(ROLES_KEY, json);
    localStorage.removeItem(ROLES_KEY);
  }
}

export function readRoles() {
  const raw =
    localStorage.getItem(ROLES_KEY) || sessionStorage.getItem(ROLES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* Phone-verification snapshot — same play as the roles snapshot above.
   We mirror the user's `is_phone_verified` flag into the token's storage
   bucket at login/register/verify time so RequireVerified can answer
   synchronously (no /auth/me round-trip) on every guarded navigation.
   The BE's phone-verified middleware stays authoritative; this only
   controls which UI we render and where the back button can land.

   `persistent` follows the token: localStorage when the session is
   persistent, sessionStorage otherwise — and we always clear the OTHER
   bucket so a stale snapshot can't shadow the live one. */
function savePhoneVerified(verified, persistent) {
  const val = verified ? '1' : '0';
  if (persistent) {
    localStorage.setItem(VERIFIED_KEY, val);
    sessionStorage.removeItem(VERIFIED_KEY);
  } else {
    sessionStorage.setItem(VERIFIED_KEY, val);
    localStorage.removeItem(VERIFIED_KEY);
  }
}

/* True if the token currently lives in localStorage (persistent
   session). Lets the snapshot writers below target the same bucket as
   the token without the caller having to remember the remember_me
   choice from login. */
function activePersistent() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

/* Synchronous read for RequireVerified and the http.js 403 path.
   Defaults to TRUE when no snapshot exists — we never want to lock out
   a session created before this snapshot existed, and the BE middleware
   is the real gate. A snapshot is written on every login/register, so
   the only "unknown" case is a pre-existing logged-in session. */
export function isPhoneVerified() {
  const raw =
    localStorage.getItem(VERIFIED_KEY) ?? sessionStorage.getItem(VERIFIED_KEY);
  if (raw === null) return true;
  return raw === '1';
}

export function hasRole(role) {
  return readRoles().includes(role);
}

export function isAdmin() {
  const roles = readRoles();
  return roles.includes('admin') || roles.includes('super-admin');
}

export function isSuperAdmin() {
  return readRoles().includes('super-admin');
}

/* Clear from both buckets — used on logout, password change, and
   password reset (which revoke the token server-side). */
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLES_KEY);
  sessionStorage.removeItem(ROLES_KEY);
  localStorage.removeItem(VERIFIED_KEY);
  sessionStorage.removeItem(VERIFIED_KEY);
  // Drop the cached /auth/me so the next caller can't read the
  // previous session's user (invalidateMe is hoisted; safe to call).
  invalidateMe();
}

/* ------------------------------------------------------------------
 *  /auth/me request cache
 * ------------------------------------------------------------------
 *  Many independent components call auth.me() on mount — UserContext,
 *  the landing Navbar, several route guards (RequireArenaAccess,
 *  RequireNonSupplier, RequireServiceProvider), and a few pages
 *  (Plans, PublicProjectsPage, CreateProjectPage, OtpPage). On a
 *  single navigation they fire near-simultaneously and each hits
 *  /auth/me with an identical request. We coalesce them here:
 *
 *    1. In-flight dedupe — concurrent callers share ONE request.
 *    2. Short TTL cache  — repeat calls within ME_TTL_MS reuse the
 *       last result instead of re-hitting the network.
 *
 *  The cache is invalidated on every auth mutation (login, register,
 *  logout, profile update, OTP verify, password change) so it never
 *  serves stale data across a state change; me({ force: true })
 *  bypasses it for a guaranteed-fresh read. Rejections are never
 *  cached.
 * ------------------------------------------------------------------ */
const ME_TTL_MS = 30_000;
let meCache = null; // last resolved user object
let meCachedAt = 0; // Date.now() at that resolve
let meInFlight = null; // shared promise while a request is pending

function invalidateMe() {
  meCache = null;
  meCachedAt = 0;
  meInFlight = null;
}

/* Reads the device label sent with login/register. Useful so you
   can later distinguish sessions in the DB (`web-chrome`, etc.). */
function deviceName() {
  // For now everything is "Web". You could enrich this with UA info.
  return 'Web';
}


export const auth = {
  /* ============================================================
   *  POST /auth/register
   *  ----------------------------------------------------------------
   *  Body:
   *    account_type            individual | entrepreneur | engineering
   *                             | supplier | developer
   *    specialty               string|null  (only for supplier/developer)
   *    name, city               required
   *    phone                    +9665XXXXXXXX
   *    email                    required, unique
   *    password                 min 8
   *    password_confirmation    must match password
   *    device_name              token label
   *
   *  Returns 201 with { user, token, message }. The backend ALSO
   *  triggers an OTP send automatically — don't call /otp/send
   *  again from the frontend after register.
   *
   *  We store the token to localStorage immediately so subsequent
   *  /otp/verify calls (which require auth) work.
   * ============================================================ */
  async register(payload) {
    const body = {
      account_type: payload.account_type,
      specialty: payload.specialty ?? null,
      name: payload.name,
      city: payload.city,
      phone: payload.phone,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.password,
      device_name: deviceName(),
    };

    const res = await http.post('/auth/register', body);
    if (res?.token) {
      // Registration always lands on /otp next, so we need the token
      // to survive a tab-close mid-verification. Persist in
      // localStorage; users can sign out after if they don't want to
      // stay logged in.
      saveToken(res.token, true);
      saveRoles(res.roles, true);
      // Registration always lands on /otp — the phone is never verified
      // yet at this point, so seed the snapshot false.
      savePhoneVerified(false, true);
    }
    invalidateMe(); // new session → drop any prior user's cached /me
    return res; // { user, token, roles, message }
  },

  /* ============================================================
   *  POST /auth/login
   *  ----------------------------------------------------------------
   *  Body:
   *    login         email OR phone (server auto-detects)
   *    password      required
   *    device_name   token label
   *
   *  Returns 200 with { user, token, ... }. Token stored to
   *  localStorage immediately. The frontend should check
   *  user.is_phone_verified to decide whether to route to /otp
   *  (unverified) or /dashboard (verified).
   * ============================================================ */
  async login(payload) {
    const rememberMe = Boolean(payload.remember_me);
    const body = {
      login: payload.login, // already normalized email or phone
      password: payload.password,
      remember_me: rememberMe,
      device_name: deviceName(),
    };

    const res = await http.post('/auth/login', body);
    if (res?.token) {
      // Mirror the BE's TTL choice in storage durability:
      //   remember_me=true  → localStorage  (BE TTL: 30 days)
      //   remember_me=false → sessionStorage (BE TTL: 24h, dies with tab)
      saveToken(res.token, rememberMe);
      saveRoles(res.roles, rememberMe);
      // Snapshot the phone-verified flag so RequireVerified can gate
      // the platform without a /me round-trip. Treat anything other
      // than an explicit `false` as verified (matches OtpPage).
      savePhoneVerified(res.user?.is_phone_verified !== false, rememberMe);
    }
    invalidateMe(); // new session → drop any prior user's cached /me
    return res; // { user, token, roles, ... }
  },

  /* ============================================================
   *  GET /auth/me
   *  ----------------------------------------------------------------
   *  Returns the authenticated user. Laravel wraps it as
   *  { data: {...user} } so we unwrap and return just the user
   *  object — that's what the rest of the app expects from useUser().
   *
   *  Deduped + short-TTL cached (see the /auth/me request cache
   *  above) so the many independent callers don't each hit the
   *  network on every navigation. Pass { force: true } to bypass the
   *  cache (e.g. UserContext.refresh after a profile edit — though
   *  updateProfile already invalidates, so a plain call suffices).
   * ============================================================ */
  async me({ force = false } = {}) {
    if (!force) {
      // Coalesce concurrent callers onto the pending request…
      if (meInFlight) return meInFlight;
      // …and serve a fresh-enough cached user without a round-trip.
      if (meCache && Date.now() - meCachedAt < ME_TTL_MS) return meCache;
    }

    const request = (async () => {
      const res = await http.get('/auth/me');
      // Defensive unwrap: backend wraps with `data`, but if that
      // changes (or in tests) accept either shape.
      const user = res?.data ?? res;
      // Keep the verification snapshot fresh — /me is the one endpoint
      // that always returns the live flag, so it self-heals a stale
      // snapshot (e.g. verified on another device).
      if (user && typeof user.is_phone_verified !== 'undefined') {
        savePhoneVerified(user.is_phone_verified !== false, activePersistent());
      }
      return user;
    })();

    meInFlight = request;
    try {
      const user = await request;
      meCache = user;
      meCachedAt = Date.now();
      return user;
    } catch (err) {
      // Never cache a failure — the next call should retry.
      meCache = null;
      meCachedAt = 0;
      throw err;
    } finally {
      // Only clear if a newer forced request hasn't superseded us.
      if (meInFlight === request) meInFlight = null;
    }
  },

  /* ============================================================
   *  PATCH /auth/profile  (auth required)
   *  ----------------------------------------------------------------
   *  Editable fields: name, email, city. Anything else (phone,
   *  account_type, password, specialty) is silently stripped by the
   *  backend — we filter client-side too so the network payload
   *  matches the contract.
   *
   *  Returns { message, user }. The caller typically discards the
   *  returned value and calls refresh() to re-fetch from /auth/me.
   * ============================================================ */
  async updateProfile(payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.email !== undefined) body.email = payload.email;
    if (payload.city !== undefined) body.city = payload.city;

    const res = await http.patch('/auth/profile', body);
    // Profile changed → invalidate so the next me()/refresh() re-fetches.
    invalidateMe();
    return res?.user ?? res;
  },

  /* ============================================================
   *  POST /auth/change-password  (auth required)
   *  ----------------------------------------------------------------
   *  Body: { current_password, password, password_confirmation }.
   *
   *  On success the backend revokes EVERY token for this user
   *  (including the one used for this request). We clear the local
   *  token immediately so the next guarded route bounces to /login.
   * ============================================================ */
  async changePassword(payload) {
    const body = {
      current_password: payload.current_password,
      password: payload.password,
      password_confirmation:
        payload.password_confirmation ?? payload.password,
    };
    const res = await http.post('/auth/change-password', body);
    clearToken();
    return res;
  },

  /* ============================================================
   *  POST /auth/otp/send  (auth required)
   *  ----------------------------------------------------------------
   *  Sends or resends a 6-digit OTP to the authenticated user's
   *  phone. Returns 422 if the phone is already verified.
   *  No body required.
   * ============================================================ */
  async resendOtp() {
    return http.post('/auth/otp/send');
  },

  /* ============================================================
   *  POST /auth/otp/verify  (auth required)
   *  ----------------------------------------------------------------
   *  Body: { otp }
   *  Returns 422 if wrong / expired (10 min TTL) / malformed.
   * ============================================================ */
  async verifyOtp(payload) {
    const res = await http.post('/auth/otp/verify', { otp: payload.otp });
    // Phone is now verified — flip the snapshot so RequireVerified lets
    // the user into the platform on the post-verify redirect.
    savePhoneVerified(true, activePersistent());
    // is_phone_verified on the cached user is now stale — drop it.
    invalidateMe();
    return res;
  },

  /* ============================================================
   *  POST /auth/logout  (auth required)
   *  ----------------------------------------------------------------
   *  Revokes the current token only — other devices stay signed in.
   *  We always clear local storage at the end, even if the network
   *  call fails (so a bad-network logout still feels logged out).
   * ============================================================ */
  async logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      clearToken();
    }
  },

  /* ============================================================
   *  POST /auth/logout-all  (auth required)
   *  ----------------------------------------------------------------
   *  Revokes every token belonging to the user. Useful after a
   *  password change. Not called from any UI yet — wire it up
   *  when there's a "sign out everywhere" button.
   * ============================================================ */
  async logoutAll() {
    try {
      await http.post('/auth/logout-all');
    } finally {
      clearToken();
    }
  },

  /* ============================================================
   *  POST /auth/forgot-password  (public)
   *  ----------------------------------------------------------------
   *  Sends a 6-digit reset code to the user's email. The response
   *  is intentionally the same whether the email exists or not
   *  (anti-enumeration). In local dev the code shows up in Mailpit
   *  at http://localhost:8025.
   *
   *  Body: { email }
   * ============================================================ */
  async forgotPassword(payload) {
    return http.post('/auth/forgot-password', { email: payload.email });
  },

  /* ============================================================
   *  POST /auth/reset-password  (public)
   *  ----------------------------------------------------------------
   *  Verify the 6-digit code and set a new password. On success the
   *  backend revokes every existing token for the user, so any
   *  cached local token here is now stale — clear it so RequireAuth
   *  bounces the user back to /login.
   *
   *  Body: { email, code, password, password_confirmation }
   * ============================================================ */
  async resetPassword(payload) {
    const body = {
      email: payload.email,
      code: payload.code,
      password: payload.password,
      password_confirmation:
        payload.password_confirmation ?? payload.password,
    };
    const res = await http.post('/auth/reset-password', body);
    clearToken();
    return res;
  },
};
