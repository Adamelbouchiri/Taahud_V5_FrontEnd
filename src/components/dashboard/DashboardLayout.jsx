import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { UserProvider } from '../../contexts/UserContext';

/* ============================================================
 *  DashboardLayout — wraps every authenticated page.
 *
 *  Lives at /dashboard/* via React Router. Pages render inside
 *  the <Outlet />. The layout provides:
 *    - A persistent sidebar (drawer on mobile)
 *    - A sticky topbar with user menu
 *    - A UserProvider so every page can read the user
 *
 *  In production: wrap this with a <RequireAuth> guard that
 *  redirects to /login if there's no token.
 * ============================================================ */

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserProvider>
      <div
        className="min-h-screen"
        style={{ background: '#fafaf6' }}
        dir="rtl"
      >
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main column. At lg the sidebar is fixed (268px wide) on
            the inline-start edge — in RTL that's the visual right —
            so we offset the column with padding-inline-start. */}
        <div className="min-h-screen flex flex-col lg:ps-[268px]">
          <Topbar onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
