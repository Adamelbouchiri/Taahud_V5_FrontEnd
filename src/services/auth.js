import http from './http';
import {
  startSession,
  clearSession,
  onSessionCleared,
  writePhoneVerified,
  readRoles,
} from './session';

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
 *  Token storage (per FRONTEND_INTEGRATION.md §4) lives entirely in
 *  services/session.js — the single source of truth that http.js's
 *  request interceptor reads from. This file never touches
 *  localStorage/sessionStorage directly; it calls startSession() to
 *  install a session and clearSession() to tear one down, so an
 *  account switch always REPLACES the whole session (token + roles +
 *  verified snapshot, both buckets) instead of layering a new user's
 *  state on top of the previous user's token.
 *
 *  Phone format: every phone payload must be normalized to
 *  +9665XXXXXXXX BEFORE being sent here. The auth pages handle
 *  that with normalizePhone() before calling these functions.
 * ============================================================ */

/* The roles + phone-verified snapshots let RequireAdmin /
   RequireSuperAdmin / RequireVerified answer synchronously, without a
   /auth/me round-trip on every guarded navigation. Both are written as
   part of startSession() (so they can never outlive the token that
   earned them) and re-exported here because that's where the rest of
   the app already imports them from. The BE stays authoritative. */
export { readRoles, isPhoneVerified } from './session';

/* The token in `res` may arrive top-level or inside a `data` envelope
   depending on the endpoint. Accept either; return null if neither has
   one, and let the caller treat that as a hard failure. */
function extractToken(res) {
  return res?.token ?? res?.data?.token ?? null;
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
 *
 *  `meEpoch` is what makes invalidation actually stick. Nulling the
 *  fields isn't enough on its own: a request started under the OLD
 *  session is still in flight, and when it resolves it would happily
 *  write the previous user into the freshly-cleared cache — serving
 *  the wrong user for up to ME_TTL_MS after an account switch. Every
 *  request captures the epoch it started in and drops its result on
 *  the floor if the session moved on underneath it.
 * ------------------------------------------------------------------ */
const ME_TTL_MS = 30_000;
let meCache = null; // last resolved user object
let meCachedAt = 0; // Date.now() at that resolve
let meInFlight = null; // shared promise while a request is pending
let meEpoch = 0; // bumped on every invalidation

function invalidateMe() {
  meCache = null;
  meCachedAt = 0;
  meInFlight = null;
  meEpoch += 1;
}

/* Any session teardown (logout, 401 from http.js, password reset)
   must drop the cached user too, or the next caller reads the
   previous session's identity out of memory. Registered here so
   http.js can clear the session without importing auth.js. */
onSessionCleared(invalidateMe);

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
    // Registration always lands on /otp next, so the token has to
    // survive a tab-close mid-verification → persistent bucket. Users
    // can sign out afterwards if they don't want to stay logged in.
    // startSession() replaces any prior session wholesale and throws
    // if the response carried no token, so we can never end up
    // authenticating as the previous account.
    startSession({
      token: extractToken(res),
      roles: res?.roles,
      // The phone is never verified at this point — seed it false.
      phoneVerified: false,
      persistent: true,
    });
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

    // Install the new session, unconditionally replacing whatever was
    // in storage. This is the account-switch fix: previously the write
    // was guarded by `if (res.token)`, so a response that didn't carry
    // a top-level token left the PREVIOUS user's token in place —
    // every request then authenticated as the old account while the UI
    // rendered the new one (403s on anything ownership-scoped).
    // startSession() clears both buckets first and throws when the
    // token is missing, so "logged in as someone else" is no longer a
    // reachable state.
    //
    // Storage durability mirrors the BE's TTL choice:
    //   remember_me=true  → localStorage  (BE TTL: 30 days)
    //   remember_me=false → sessionStorage (BE TTL: 24h, dies with tab)
    startSession({
      token: extractToken(res),
      roles: res?.roles,
      // Treat anything other than an explicit `false` as verified
      // (matches OtpPage).
      phoneVerified: res?.user?.is_phone_verified !== false,
      persistent: rememberMe,
    });
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

    // The session this request belongs to. If it changes before we
    // resolve, everything below is about a user who is no longer
    // signed in — see meEpoch above.
    const epoch = meEpoch;

    const request = (async () => {
      const res = await http.get('/auth/me');
      // Defensive unwrap: backend wraps with `data`, but if that
      // changes (or in tests) accept either shape.
      const user = res?.data ?? res;
      // Keep the verification snapshot fresh — /me is the one endpoint
      // that always returns the live flag, so it self-heals a stale
      // snapshot (e.g. verified on another device). Skipped on a stale
      // epoch: writing it would stamp the previous user's flag onto the
      // current session's storage bucket.
      if (
        epoch === meEpoch &&
        user &&
        typeof user.is_phone_verified !== 'undefined'
      ) {
        writePhoneVerified(user.is_phone_verified !== false);
      }
      return user;
    })();

    meInFlight = request;
    try {
      const user = await request;
      if (epoch === meEpoch) {
        meCache = user;
        meCachedAt = Date.now();
      }
      return user;
    } catch (err) {
      // Never cache a failure — the next call should retry.
      if (epoch === meEpoch) {
        meCache = null;
        meCachedAt = 0;
      }
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
    clearSession();
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
    // the user into the platform on the post-verify redirect. Lands in
    // whichever bucket the live token occupies.
    writePhoneVerified(true);
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
      // Always tear down locally, even if the revoke call failed — a
      // bad-network logout must still leave the browser logged out.
      // clearSession() drops the token, roles and verified snapshot
      // from BOTH buckets and invalidates the cached /auth/me.
      clearSession();
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
      clearSession();
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
    clearSession();
    return res;
  },
};
