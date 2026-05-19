import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdmin as hasAdminRole, isSuperAdmin as hasSuperAdminRole } from '../services/auth';

/* ============================================================
 *  RequireAdmin / RequireSuperAdmin
 *  ----------------------------------------------------------------
 *  Two cheap, synchronous guards layered on top of RequireAuth.
 *
 *    <RequireAdmin>...</RequireAdmin>          admin OR super-admin
 *    <RequireSuperAdmin>...</RequireSuperAdmin> super-admin only
 *
 *  Reads the roles snapshot saved by services/auth.js at login.
 *  If the user no longer has the required role, redirect to the
 *  regular /dashboard so they don't get stuck. The remote /admin
 *  endpoints still enforce the rule server-side — this guard is
 *  just to avoid rendering empty/forbidden UI to non-admins.
 *
 *  Note: stack RequireAuth ABOVE these. Without a token the user
 *  would be sent to /dashboard, which itself bounces unauthenticated
 *  visitors back to /login — but the extra hop is wasted work, so
 *  keep the order RequireAuth → RequireAdmin in App.jsx.
 * ============================================================ */

export function RequireAdmin({ children }) {
  const location = useLocation();
  if (!hasAdminRole()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ from: location.pathname + location.search, reason: 'not-admin' }}
      />
    );
  }
  return children;
}

export function RequireSuperAdmin({ children }) {
  const location = useLocation();
  if (!hasSuperAdminRole()) {
    return (
      <Navigate
        to="/admin"
        replace
        state={{ from: location.pathname + location.search, reason: 'not-super-admin' }}
      />
    );
  }
  return children;
}

export default RequireAdmin;
