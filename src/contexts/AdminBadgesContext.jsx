import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { admin } from '../services';

/* ============================================================
 *  AdminBadgesContext — sidebar counters for the admin shell.
 *  ----------------------------------------------------------------
 *  ADMIN_OVERVIEW_API.md:
 *    - GET /admin/overview/badges, polled every 60s (no websockets).
 *    - POST /admin/overview/read returns the refreshed badges, so we
 *      repaint from that response instead of firing a second GET.
 *    - Opening a section's screen marks that section read.
 *
 *  Queue sections (projects / partners) are NOT affected by reads —
 *  they only drop when the work is actually done — so we don't send
 *  a read for them at all.
 * ============================================================ */

const POLL_MS = 60_000;

export const ACTIVITY_SECTIONS = ['users', 'offers', 'subscriptions', 'rasd'];
export const QUEUE_SECTIONS = ['projects', 'partners'];

// Sidebar route → badge section. Prefix-matched so detail pages
// (/admin/users/12, /admin/rasd/projects) count as their section.
export const SECTION_ROUTES = {
  users: '/admin/users',
  projects: '/admin/projects',
  offers: '/admin/applications',
  subscriptions: '/admin/subscriptions',
  partners: '/admin/partner-applications',
  rasd: '/admin/rasd',
};

function sectionForPath(pathname) {
  return (
    Object.keys(SECTION_ROUTES).find((s) => {
      const base = SECTION_ROUTES[s];
      return pathname === base || pathname.startsWith(`${base}/`);
    }) || null
  );
}

const AdminBadgesContext = createContext({
  badges: null,
  refresh: () => {},
  markRead: async () => {},
});

export function AdminBadgesProvider({ children }) {
  const { pathname } = useLocation();
  const [badges, setBadges] = useState(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await admin.overview.badges();
      if (alive.current && next) setBadges(next);
    } catch {
      // A missed poll just leaves the last counts up; the next tick retries.
    }
  }, []);

  const markRead = useCallback(async (section) => {
    const next = await admin.overview.markRead(section);
    if (alive.current && next) setBadges(next);
    return next;
  }, []);

  // Poll every 60s while the tab is visible; catch up on return.
  useEffect(() => {
    alive.current = true;
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // Entering an activity section's screen marks it read. Keyed on the
  // section (not the path) so moving list → detail doesn't re-fire.
  const section = sectionForPath(pathname);
  useEffect(() => {
    if (!section || !ACTIVITY_SECTIONS.includes(section)) return;
    markRead(section).catch(() => {});
  }, [section, markRead]);

  const value = useMemo(
    () => ({ badges, refresh, markRead }),
    [badges, refresh, markRead]
  );

  return (
    <AdminBadgesContext.Provider value={value}>
      {children}
    </AdminBadgesContext.Provider>
  );
}

export function useAdminBadges() {
  return useContext(AdminBadgesContext);
}
