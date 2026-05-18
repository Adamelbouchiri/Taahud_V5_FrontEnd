import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/* ============================================================
 *  RequireAuth
 *  ----------------------------------------------------------------
 *  Wraps any route that requires a logged-in user. Checks for the
 *  presence of an auth token in either storage bucket:
 *
 *    - localStorage   → persistent session (login with remember_me)
 *    - sessionStorage → tab-scoped session (login without remember_me)
 *
 *  If either has a token → render protected children. Otherwise →
 *  redirect to /login, remembering the originally intended path in
 *  `location.state.from` so LoginPage can send the user back where
 *  they were headed after a successful login.
 *
 *  The token's actual VALIDITY isn't checked here — that's
 *  handled by the http.js response interceptor, which clears
 *  the token on any 401. The next protected navigation after
 *  that will see no token and redirect to /login. This keeps
 *  the guard cheap (no network call) while still self-healing
 *  when tokens go stale.
 *
 *  This is intentionally not based on the UserContext — pages
 *  outside the dashboard layout (e.g. /projects/:id) don't have
 *  a UserProvider above them, so we read directly from storage.
 * ============================================================ */
export default function RequireAuth({ children }) {
  const location = useLocation();
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
