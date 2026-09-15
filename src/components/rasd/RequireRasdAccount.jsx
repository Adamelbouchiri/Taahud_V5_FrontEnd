import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { canUseRasd } from '../../config/rasdConstants';

/* ============================================================
 *  RequireRasdAccount
 *  ----------------------------------------------------------------
 *  Keeps account types the module isn't sold to out of /rasd/*.
 *  Today that means individuals — see canUseRasd().
 *
 *  Mounted as a pathless layout route INSIDE the RASD branch of
 *  DashboardLayout, so it reads the user from UserProvider that the
 *  layout already supplies rather than firing its own /auth/me. That
 *  placement is also why it renders an <Outlet /> instead of
 *  children: its job is to let the nested routes through.
 *
 *  A blocked user is redirected to /dashboard rather than shown a
 *  "not for you" screen: the sidebar never offered them the link, so
 *  the only way here is a typed URL or an old bookmark, and neither
 *  deserves an explanation of a product they can't buy.
 *
 *  Nothing renders until the user resolves — an unknown account type
 *  is not treated as permission. This mirrors the sidebar's navReady
 *  rule, and it matters on a hard refresh, where `user` is null for
 *  a tick and an optimistic render would flash the page before
 *  bouncing.
 * ============================================================ */
export default function RequireRasdAccount() {
  const { user, loading } = useUser();

  if (loading) return <RasdGateSkeleton />;

  // A failed /auth/me resolves with user === null. RequireAuth and
  // the 401 interceptor own that case; here it just isn't a pass.
  if (!canUseRasd(user?.account_type)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function RasdGateSkeleton() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <div className="shimmer" style={{ height: 44, width: 260, borderRadius: 10 }} />
      <div className="shimmer" style={{ height: 150, borderRadius: 16 }} />
      <div className="shimmer" style={{ height: 120, borderRadius: 14 }} />
    </div>
  );
}
