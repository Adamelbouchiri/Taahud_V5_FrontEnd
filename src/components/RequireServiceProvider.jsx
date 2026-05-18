import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../services';
import { canApplyAnyArena } from '../config/projectConstants';

/* ============================================================
 *  RequireServiceProvider — broad pre-gate for the apply flow.
 *  ----------------------------------------------------------------
 *  Filters out account types that cannot bid on ANY arena before
 *  the apply page even mounts. Per FRONTEND_INTEGRATION.md §3:
 *
 *    Individual  → can never apply (only sees own projects)
 *    Supplier    → can never apply to any internal arena
 *    Entrepreneur, Engineering, Developer → CAN apply (subject to
 *                  the per-arena matrix; ApplyPage refines further
 *                  after it knows the project's arena)
 *
 *  The name is historical — the gate is no longer strictly "service
 *  providers" since developers can also apply to إسناد. The check
 *  is delegated to canApplyAnyArena() which uses the per-arena
 *  applicableBy matrix.
 *
 *  Anyone blocked is bounced to /projects.
 * ============================================================ */
export default function RequireServiceProvider({ children }) {
  // null = loading, true = allowed, false = blocked
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((user) => {
        if (!cancelled) setAllowed(canApplyAnyArena(user?.account_type));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (allowed === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div
          className="animate-pulse rounded-[12px]"
          style={{
            width: 240,
            height: 14,
            background: 'var(--border-soft)',
          }}
        />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/projects" replace />;
  }

  return children;
}
