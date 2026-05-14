import React, { useEffect, useState } from 'react';
import { auth } from '../services';
import SupplierComingSoon from './SupplierComingSoon';

/* ============================================================
 *  RequireNonSupplier
 *  ----------------------------------------------------------------
 *  Wraps any route that should be hidden from suppliers (browse,
 *  project details, create, apply). Suppliers see the
 *  "coming soon" placeholder; everyone else sees the underlying
 *  page normally.
 *
 *  We resolve the user via auth.me() once on mount. If the call
 *  fails (no token, network error), we render the children — the
 *  guard's job is to BLOCK suppliers, not to enforce auth itself.
 *  Auth is enforced separately by the project routes when needed.
 * ============================================================ */
export default function RequireNonSupplier({ children }) {
  // null = still loading, false = not supplier, true = supplier
  const [isSupplier, setIsSupplier] = useState(null);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((user) => {
        if (!cancelled) setIsSupplier(user?.account_type === 'supplier');
      })
      .catch(() => {
        // Couldn't load the user — let the page render. The page
        // itself can decide what to do (e.g. redirect to /login).
        if (!cancelled) setIsSupplier(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Brief hold while we figure out the role. Avoids a flash of the
  // page content followed by the placeholder for suppliers.
  if (isSupplier === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#fafaf6' }}
      >
        <div
          className="animate-pulse rounded-[12px]"
          style={{
            width: 240,
            height: 14,
            background: '#efece4',
          }}
        />
      </div>
    );
  }

  if (isSupplier) {
    return <SupplierComingSoon />;
  }

  return children;
}
