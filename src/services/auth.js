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

/* Clear from both buckets — used on logout, password change, and
   password reset (which revoke the token server-side). */
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
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
    }
    return res; // { user, token, message }
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
    }
    return res; // { user, token, ... }
  },

  /* ============================================================
   *  GET /auth/me
   *  ----------------------------------------------------------------
   *  Returns the authenticated user. Laravel wraps it as
   *  { data: {...user} } so we unwrap and return just the user
   *  object — that's what the rest of the app expects from useUser().
   * ============================================================ */
  async me() {
    const res = await http.get('/auth/me');
    // Defensive unwrap: backend wraps with `data`, but if that
    // changes (or in tests) accept either shape.
    return res?.data ?? res;
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
    return http.post('/auth/otp/verify', { otp: payload.otp });
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
