import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../services';
import { BROKER_STATUS } from '../config/brokerConstants';

/* ============================================================
 *  RequireBroker — gate for the broker workspace.
 *  ----------------------------------------------------------------
 *  Per BROKER_SYSTEM_INTEGRATION.md, only an ACTIVE broker may
 *  reach /broker/opportunities. Everyone else is redirected:
 *
 *    not a broker at all          → /dashboard
 *    pending_review / suspended
 *      / rejected                 → /broker/status
 *
 *  The status screen is the destination rather than a generic
 *  "forbidden" so the broker sees WHY they are blocked and, when
 *  rejected, the admin's reason.
 *
 *  This mirrors the 403 the API returns from every broker endpoint
 *  ({ message, broker_status }) — the guard just spares the user a
 *  failed request on the way in.
 * ============================================================ */
export default function RequireBroker({ children }) {
  // null = still resolving, 'ok' = allowed, otherwise a redirect path
  const [state, setState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((user) => {
        if (cancelled) return;
        if (user?.account_type !== 'broker') {
          setState('/dashboard');
          return;
        }
        setState(
          user?.broker_status === BROKER_STATUS.ACTIVE ? 'ok' : '/broker/status'
        );
      })
      .catch(() => {
        // A failed /me means the session is unusable; RequireAuth
        // upstream handles the bounce to /login.
        if (!cancelled) setState('/dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div
          className="animate-pulse rounded-[12px]"
          style={{ width: 240, height: 14, background: 'var(--border-soft)' }}
        />
      </div>
    );
  }

  if (state !== 'ok') return <Navigate to={state} replace />;

  return children;
}
