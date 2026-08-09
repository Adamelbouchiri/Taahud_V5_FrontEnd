/* ============================================================
 *  SESSION STORE — the single source of truth for auth state.
 *  ----------------------------------------------------------------
 *  Every read and every write of the bearer token (and the two
 *  snapshots that ride along with it) goes through this module.
 *  Nothing else in the app may touch the storage keys directly.
 *
 *  Why this file exists: the token used to be written by auth.js
 *  and read/cleared by http.js, RequireAuth, RequireGuest, the
 *  landing Navbar and two landing sections — each with its own
 *  copy of `localStorage.getItem('token') || sessionStorage...`.
 *  Any writer that forgot one of the six keys left the app in a
 *  desynced state: a previous account's token still on the wire
 *  while the UI rendered the new account. Centralizing the keys
 *  makes "replace the whole session atomically" the only
 *  available operation.
 *
 *  It has NO imports on purpose — http.js and auth.js both depend
 *  on it, so it must not depend on either (that's the circular
 *  import that pushed duplicated key literals into http.js).
 *
 *  Two buckets, mirroring the BE's token TTL:
 *    localStorage   → remember_me = true  (persistent, BE TTL 30d)
 *    sessionStorage → remember_me = false (tab-scoped, BE TTL 24h)
 *  A session lives in exactly ONE bucket. Every write clears the
 *  other bucket's copy of the same key, so the read order below
 *  can never resolve a stale token from the losing bucket.
 * ============================================================ */

const TOKEN_KEY = 'token';
const ROLES_KEY = 'taahud:roles';
const VERIFIED_KEY = 'taahud:phone_verified';

/* Every key a session owns. clearSession() walks this in both
   buckets, so adding a new session-scoped key here is enough to
   have it torn down on logout / 401 / account switch. */
const SESSION_KEYS = [TOKEN_KEY, ROLES_KEY, VERIFIED_KEY];


/* -------------------------------------------------------------
 * Low-level helpers
 * ----------------------------------------------------------- */

/* Write to the chosen bucket and DELETE the other bucket's copy.
   The delete is what makes an account switch safe: without it a
   remember_me=true session (localStorage) would keep shadowing a
   later remember_me=false session (sessionStorage), because the
   read order prefers localStorage. */
function put(key, value, persistent) {
  if (persistent) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  }
}

function drop(key) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

/* localStorage wins — see put(): only one bucket can hold a live
   session, so a hit here is never a stale shadow of the other. */
function read(key) {
  const fromLocal = localStorage.getItem(key);
  return fromLocal !== null ? fromLocal : sessionStorage.getItem(key);
}


/* -------------------------------------------------------------
 * Clear-session subscribers
 * -------------------------------------------------------------
 * auth.js keeps an in-memory /auth/me cache that must die with the
 * session. It can't be cleared from here directly (that import
 * would be circular), so auth.js subscribes at module load and
 * http.js's 401 path gets the invalidation for free.
 * ----------------------------------------------------------- */

const clearListeners = new Set();

export function onSessionCleared(fn) {
  clearListeners.add(fn);
  return () => clearListeners.delete(fn);
}


/* -------------------------------------------------------------
 * Token
 * ----------------------------------------------------------- */

export function readToken() {
  return read(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(readToken());
}

/* True when the live session is the persistent kind. Used by the
   snapshot writers so they always land in the same bucket as the
   token, without the caller having to remember the remember_me
   choice made back at login. */
export function isPersistentSession() {
  return localStorage.getItem(TOKEN_KEY) !== null;
}


/* -------------------------------------------------------------
 * Roles snapshot
 * ----------------------------------------------------------- */

export function readRoles() {
  const raw = read(ROLES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


/* -------------------------------------------------------------
 * Phone-verified snapshot
 * -------------------------------------------------------------
 * Defaults to TRUE when absent: we never want to lock a user out
 * of the platform over a missing snapshot, and the BE's
 * phone-verified middleware is the real gate.
 * ----------------------------------------------------------- */

export function isPhoneVerified() {
  const raw = read(VERIFIED_KEY);
  if (raw === null) return true;
  return raw === '1';
}

export function writePhoneVerified(verified, persistent = isPersistentSession()) {
  put(VERIFIED_KEY, verified ? '1' : '0', persistent);
}


/* -------------------------------------------------------------
 * Whole-session writes
 * ----------------------------------------------------------- */

/* Install a brand-new session, replacing whatever was there.
 *
 * This is the ONLY way a token enters storage, and it always
 * starts from clearSession() — so an account switch can't leave
 * the previous user's token, roles or verified snapshot behind in
 * either bucket. Partial writes are impossible by construction:
 * either the whole session is replaced or nothing is.
 *
 * Throws when `token` is falsy. A login response without a token
 * is a broken contract, and the old behaviour (skip the write and
 * carry on) is exactly the bug this module exists to prevent — it
 * left the previous account's token authenticating every request
 * while the UI rendered the new account.
 */
export function startSession({ token, roles, phoneVerified, persistent }) {
  clearSession();
  if (!token) {
    throw new Error('startSession: refusing to start a session without a token');
  }
  put(TOKEN_KEY, token, persistent);
  put(ROLES_KEY, JSON.stringify(Array.isArray(roles) ? roles : []), persistent);
  put(VERIFIED_KEY, phoneVerified ? '1' : '0', persistent);
}

/* Tear down every trace of the session in both buckets, then let
   subscribers drop their in-memory copies. Used by logout,
   logout-all, password change, password reset, the 401 interceptor
   and startSession(). */
export function clearSession() {
  SESSION_KEYS.forEach(drop);
  clearListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // A misbehaving listener must not stop the teardown.
    }
  });
}
