import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FolderKanban,
  ClipboardList,
  Key,
  Activity,
  ArrowLeftRight,
  LogOut,
  X,
} from 'lucide-react';
import Logo from '../Logo';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  AdminSidebar
 *  ----------------------------------------------------------------
 *  Structural twin of the user-side Sidebar (same 268px shell,
 *  same .nav-link styling, same drawer behavior below lg). The
 *  difference is the link set and a single compact role chip
 *  under the logo — no oversized banner, no "Other" section,
 *  no double-stacked footer items.
 *
 *  Items are filtered against the active roles so super-admin
 *  utilities (Roles) are hidden from regular admins.
 * ============================================================ */

const NAV_ITEMS = [
  { to: '/admin', labelKey: 'admin.sidebar.items.overview', icon: ShieldCheck, end: true, roles: ['admin', 'super-admin'] },
  { to: '/admin/users', labelKey: 'admin.sidebar.items.users', icon: Users, roles: ['admin', 'super-admin'] },
  { to: '/admin/projects', labelKey: 'admin.sidebar.items.projects', icon: FolderKanban, roles: ['admin', 'super-admin'] },
  { to: '/admin/applications', labelKey: 'admin.sidebar.items.applications', icon: ClipboardList, roles: ['admin', 'super-admin'] },
  { to: '/admin/activity', labelKey: 'admin.sidebar.items.activity', icon: Activity, roles: ['admin', 'super-admin'] },
  { to: '/admin/roles', labelKey: 'admin.sidebar.items.roles', icon: Key, roles: ['super-admin'] },
];

export default function AdminSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { roles, logout, isSuperAdmin } = useUser();

  const items = NAV_ITEMS.filter((it) =>
    it.roles.some((r) => roles.includes(r))
  );

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const roleColor = isSuperAdmin ? '#b8862a' : 'var(--accent-primary)';
  const roleSoft = isSuperAdmin
    ? 'rgba(184,134,42,0.12)'
    : 'rgba(44,47,124,0.10)';
  const roleBorder = isSuperAdmin
    ? 'rgba(184,134,42,0.28)'
    : 'rgba(44,47,124,0.22)';

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 lg:hidden"
          style={{
            background: 'rgba(15,17,41,0.45)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside className={`taahud-admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 h-[96px] flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-soft)' }}
          >
            <button
              onClick={() => {
                navigate('/admin');
                onClose?.();
              }}
              className="bg-transparent border-0 p-0 cursor-pointer"
              aria-label={t('admin.nav.home')}
            >
              <Logo height={68} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('nav.closeMenu')}
              className="lg:hidden flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Compact role chip — slim banner under the logo so the
              role is visible at a glance without dominating the
              column. Tinted gold for super-admin, indigo for admin. */}
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-soft)' }}
          >
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-[10px]"
              style={{
                background: roleSoft,
                border: `1px solid ${roleBorder}`,
              }}
            >
              <ShieldCheck size={15} style={{ color: roleColor, flexShrink: 0 }} />
              <span
                className="font-semibold flex-1 truncate"
                style={{ fontSize: 12.5, color: roleColor, letterSpacing: '0.01em' }}
              >
                {isSuperAdmin
                  ? t('admin.role.superAdmin')
                  : t('admin.role.admin')}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: roleColor,
                  opacity: 0.7,
                }}
              >
                {t('admin.role.subtitle')}
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <div
              className="px-3 mb-2 font-semibold uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
              }}
            >
              {t('admin.sidebar.navigation')}
            </div>
            <ul className="m-0 p-0 flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.to} className="list-none">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-link${isActive ? ' nav-link-active' : ''}`
                    }
                  >
                    <item.icon size={17} strokeWidth={1.75} />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer — switch back to the user dashboard sits next to
              the logout button, mirroring the user sidebar's layout
              so admins always find the actions where they expect them. */}
          <div
            className="px-3 py-4 flex-shrink-0 flex flex-col gap-0.5"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <button
              type="button"
              className="nav-link w-full text-start"
              onClick={() => {
                navigate('/dashboard');
                onClose?.();
              }}
            >
              <ArrowLeftRight size={17} strokeWidth={1.75} />
              <span>{t('admin.sidebar.switchToUser')}</span>
            </button>
            <button
              onClick={handleLogout}
              className="nav-link w-full text-start"
              style={{ color: 'var(--accent-danger)' }}
            >
              <LogOut size={17} strokeWidth={1.75} />
              <span>{t('dashboard.sidebar.logout')}</span>
            </button>
          </div>
        </div>

        {/* Component-scoped styles. .nav-link is duplicated here
            (instead of pulled from the user-side Sidebar) so the
            admin shell renders correctly when visited directly,
            without DashboardLayout ever having mounted to inject
            the original copy. */}
        <style>{`
          .taahud-admin-sidebar {
            width: 268px;
            background: var(--bg-surface);
            border-inline-end: 1px solid var(--border-default);
            display: flex;
            flex-direction: column;
          }
          @media (max-width: 1023px) {
            .taahud-admin-sidebar {
              position: fixed;
              top: 0;
              bottom: 0;
              inset-inline-start: 0;
              z-index: 50;
              transform: translateX(100%);
              transition: transform 0.25s ease;
            }
            .taahud-admin-sidebar.is-open {
              transform: translateX(0);
            }
          }
          @media (min-width: 1024px) {
            .taahud-admin-sidebar {
              position: fixed;
              top: 0;
              bottom: 0;
              inset-inline-start: 0;
              z-index: 30;
            }
          }

          .taahud-admin-sidebar .nav-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13.5px;
            font-weight: 500;
            color: var(--text-ink-soft);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
            text-decoration: none;
            font-family: inherit;
          }
          .taahud-admin-sidebar .nav-link:hover {
            background: var(--bg-canvas);
            color: var(--accent-primary);
          }
          .taahud-admin-sidebar .nav-link-active {
            background: rgba(44,47,124,0.08);
            color: var(--accent-primary);
            font-weight: 600;
          }
          .taahud-admin-sidebar .nav-link-active:hover {
            background: rgba(44,47,124,0.10);
          }
        `}</style>
      </aside>
    </>
  );
}
