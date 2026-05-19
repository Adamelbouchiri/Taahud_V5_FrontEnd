import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { UserProvider } from '../../contexts/UserContext';

/* ============================================================
 *  AdminLayout — shell for every page under /admin/*.
 *
 *  Same structural pattern as DashboardLayout (sidebar + topbar
 *  + Outlet) but the sidebar shows admin-only links, and the
 *  Topbar's user menu has a "switch to user dashboard" entry.
 *
 *  Mounts its own UserProvider so admin pages can read both the
 *  user profile and the active roles via useUser(). The provider
 *  also gives us access to the role-based filter logic that
 *  AdminSidebar uses to hide super-admin items from regular admins.
 * ============================================================ */

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserProvider>
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="min-h-screen flex flex-col lg:ps-[268px]">
          <AdminTopbar onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
