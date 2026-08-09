import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasToken } from '../services/session';

/* ============================================================
 *  RequireGuest
 *  ----------------------------------------------------------------
 *  Reverse of RequireAuth. Wraps the public auth pages
 *  (login, register, forgot-password) so that a user who is
 *  already logged in doesn't see them — they get bounced to
 *  the dashboard instead.
 *
 *  Two important behaviors:
 *
 *  1. The /otp route is NOT wrapped with this guard. By the
 *     time a user reaches /otp they always have a token
 *     (set during register or login), so guarding /otp here
 *     would lock them out of phone verification.
 *
 *  2. If the URL has a ?redirect=/some/path query string
 *     (e.g. set by RequireAuth when bouncing an unauthed user
 *     from /dashboard/profile back to /login), we honor it.
 *     This way, the post-login round-trip lands the user
 *     where they originally tried to go.
 * ============================================================ */
export default function RequireGuest({ children }) {
  const location = useLocation();
  if (hasToken()) {
    // Already logged in — send to whatever was requested, or to
    // the dashboard as a sensible default.
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect') || '/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
