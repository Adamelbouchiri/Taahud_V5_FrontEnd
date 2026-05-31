import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  UserCircle,
  UploadCloud,
  LogOut,
  X,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Bell,
  ShieldCheck,
  Handshake,
  Building2,
  Target,
  Landmark,
  Briefcase,
  ShoppingBag,
  CreditCard,
} from 'lucide-react';
import Logo from '../Logo';
import { useUser } from '../../contexts/UserContext';
import { ARENAS, canViewArena, canPostAnyArena } from '../../config/projectConstants';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  Sidebar
 *  ----------------------------------------------------------------
 *  - Above the `lg` breakpoint (1024px): always visible, static
 *    in the flex row.
 *  - Below `lg`: hidden by default, slides in from the right when
 *    `open` is true. Backdrop closes it on click.
 *
 *  The mobile-only transform is applied via a CSS class scoped
 *  inside a media query — NOT inline — so the desktop view
 *  isn't accidentally hidden by an inline transform.
 * ============================================================ */

const ALL_TYPES = ['individual', 'entrepreneur', 'engineering', 'supplier', 'developer'];

const NAV_ITEMS = [
  {
    to: '/dashboard',
    labelKey: 'dashboard.sidebar.items.home',
    icon: Home,
    accountTypes: ALL_TYPES,
    end: true,
  },
  {
    to: '/dashboard/applications',
    labelKey: 'dashboard.sidebar.items.applications',
    icon: Briefcase,
    // Suppliers don't have a project flow in V5; hide it for them.
    accountTypes: ['individual', 'entrepreneur', 'engineering', 'developer'],
  },
  {
    to: '/dashboard/profile',
    labelKey: 'dashboard.sidebar.items.profile',
    icon: UserCircle,
    accountTypes: ALL_TYPES,
  },
  // Individuals are on the free tier; no plans to browse.
  {
    to: '/subscribe',
    labelKey: 'subscribe.nav',
    icon: CreditCard,
    accountTypes: ['entrepreneur', 'engineering', 'supplier', 'developer'],
  },
];

const SOON_ITEMS = [
  // Store sits at the top of the Soon group because it's the
  // most cross-cutting upcoming feature. Hidden from individuals
  // and developers — the upcoming marketplace targets contractors,
  // engineering offices, and suppliers; individuals/developers
  // have no procurement workflow that needs it.
  {
    to: '/store',
    labelKey: 'nav.store',
    icon: ShoppingBag,
    accountTypes: ['entrepreneur', 'engineering', 'supplier'],
  },
  {
    to: '/dashboard/ai-analysis',
    labelKey: 'dashboard.sidebar.items.ai',
    icon: Sparkles,
    accountTypes: ALL_TYPES,
  },
  {
    to: '/dashboard/analytics',
    labelKey: 'dashboard.sidebar.items.analytics',
    icon: TrendingUp,
    accountTypes: ALL_TYPES,
  },
  {
    to: '/dashboard/messages',
    labelKey: 'dashboard.sidebar.items.messages',
    icon: MessageCircle,
    accountTypes: ALL_TYPES,
  },
  {
    to: '/dashboard/notifications',
    labelKey: 'dashboard.sidebar.items.notifications',
    icon: Bell,
    accountTypes: ALL_TYPES,
  },
];

// Per-arena icon, from the V5 icon spec PDF. Falls back to the colored
// dot if an arena has no icon defined.
const ARENA_ICONS = {
  public: Building2,
  private: ShieldCheck,
  solidarity: Handshake,
  arena: Target,
  isnad: Landmark,
};

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading, logout, isAdmin } = useUser();
  const accountType = user?.account_type;
  // إسناد is paywalled — only show its sidebar link to users who
  // have actually paid for the upgrade. Field comes from the backend
  // once the upgrade flow ships; until then it's always false and
  // the link stays hidden.
  const hasIsnadUpgrade = !!user?.has_isnad_upgrade;

  // Filter items by role. If we don't know the role yet, show
  // the full set so the UI doesn't look broken during loading.
  const items = accountType
    ? NAV_ITEMS.filter((it) => it.accountTypes.includes(accountType))
    : NAV_ITEMS;

  const soonItems = accountType
    ? SOON_ITEMS.filter((it) => it.accountTypes.includes(accountType))
    : SOON_ITEMS;

  // "+ مشروع جديد" CTA — hidden when the account type isn't allowed
  // to post in any arena (engineering offices, suppliers, financiers).
  // Per screenshot 2026-05-12 153348:
  //   individual    → posts in الخاصة (عهد)
  //   entrepreneur  → posts in التضامن
  //   developer     → posts in أرينا and إسناد
  //   engineering   → no posting privileges
  //   supplier      → no posting privileges
  // canPostAnyArena() drives this so the matrix stays in one place.
  // Gated on !loading so the button doesn't flash for ineligible
  // accounts (canPostAnyArena returns true while accountType is
  // still resolving — we wait for the real answer).
  const showCreateCta = !loading && canPostAnyArena(accountType);

  // Suppliers don't get the projects flow in V5 — hide the "+
  // مشروع جديد" CTA. They CAN still browse arenas they're allowed
  // to view (public / نمو), so the sidebar arena links handle their
  // visibility individually via canViewArena.
  const isSupplier = accountType === 'supplier';

  // Arena browse links, gated by the V5 viewableBy matrix
  // (screenshot: تظهر لمن). Hidden during user load to avoid
  // a flash of links the user can't access. إسناد further requires
  // the paid upgrade — see canViewArena.
  const arenaLinks = accountType
    ? ARENAS.filter((a) => canViewArena(a.value, accountType, hasIsnadUpgrade))
    : [];

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
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

      <aside
        className={`taahud-sidebar ${open ? 'is-open' : ''}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 h-[96px] flex-shrink-0"
            style={{ borderBottom: '1px solid #efece4' }}
          >
            <button
              onClick={() => {
                navigate('/dashboard');
                onClose?.();
              }}
              className="bg-transparent border-0 p-0 cursor-pointer"
              aria-label={t('nav.backHome')}
            >
              <Logo height={68} />
            </button>

            {/* Mobile close */}
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

          {/* Primary CTA */}
          {showCreateCta && (
            <div
              className="px-4 py-5"
              style={{ borderBottom: '1px solid #efece4' }}
            >
              <button
                onClick={() => {
                  navigate('/projects/new');
                  onClose?.();
                }}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] text-white font-semibold transition-all"
                style={{
                  fontSize: 13.5,
                  background: '#136d4a',
                  border: '1px solid #136d4a',
                  cursor: 'pointer',
                  boxShadow: '0 6px 14px rgba(19,109,74,0.22)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0d5538';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#136d4a';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <UploadCloud size={15} strokeWidth={2.2} />
                {t('dashboard.sidebar.newProject')}
              </button>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-3 py-5">
            {/* Admin shortcut — pinned at the top of the nav so
                staff can flip back into the admin console with one
                click. Only rendered for users whose persisted roles
                snapshot contains admin or super-admin. The banner
                style (vs. a regular nav link) is intentional: this
                is a context switch, not just another sub-page. */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  navigate('/admin');
                  onClose?.();
                }}
                className="w-full text-start flex items-center gap-2.5 mb-4"
                style={{
                  padding: '10px 12px',
                  borderRadius: 11,
                  background: 'rgba(44,47,124,0.08)',
                  border: '1px solid rgba(44,47,124,0.22)',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'background 0.18s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(44,47,124,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(44,47,124,0.08)')}
              >
                <ShieldCheck size={16} strokeWidth={2} />
                <span className="flex-1 truncate">
                  {t('admin.sidebar.items.overview')}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  {t('admin.role.admin')}
                </span>
              </button>
            )}

            <div
              className="px-3 mb-2 font-semibold uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
              }}
            >
              {t('dashboard.sidebar.navigation')}
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

            {/* Arena links — one per arena the user can view,
                per the V5 viewableBy matrix (تظهر لمن). Suppliers
                get only الساحة العامة. The colored dot mirrors the
                arena's accent so users learn the visual identity. */}
            {arenaLinks.length > 0 && (
              <>
                <div
                  className="px-3 mt-6 mb-2 font-semibold uppercase"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.12em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('dashboard.sidebar.arenas')}
                </div>
                <ul className="m-0 p-0 flex flex-col gap-0.5">
                  {arenaLinks.map((a) => {
                    const ArenaIcon = ARENA_ICONS[a.value];
                    return (
                      <li key={a.value} className="list-none">
                        <NavLink
                          to={`/projects/${a.value}`}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `nav-link${isActive ? ' nav-link-active' : ''}`
                          }
                        >
                          {ArenaIcon ? (
                            <ArenaIcon
                              size={17}
                              strokeWidth={1.75}
                              style={{ color: a.color, flexShrink: 0 }}
                            />
                          ) : (
                            <span
                              className="rounded-full flex-shrink-0"
                              style={{
                                width: 9,
                                height: 9,
                                background: a.color,
                                marginInlineStart: 4,
                                marginInlineEnd: 4,
                              }}
                            />
                          )}
                          <span className="flex-1 truncate">
                            {t(`arena.${a.value}.label`)}
                          </span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* Coming-soon group. Pages exist (each shows a friendly
                placeholder) but the feature itself is not live yet. */}
            {soonItems.length > 0 && (
              <>
                <div
                  className="px-3 mt-6 mb-2 font-semibold uppercase"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.12em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('dashboard.sidebar.soon')}
                </div>
                <ul className="m-0 p-0 flex flex-col gap-0.5">
                  {soonItems.map((item) => (
                    <li key={item.to} className="list-none">
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        // Pass `from` state so off-dashboard pages
                        // (currently just /store) know to send the
                        // user back here via navigate(-1) instead
                        // of falling through to /.
                        state={
                          item.to.startsWith('/dashboard')
                            ? undefined
                            : { from: '/dashboard' }
                        }
                        className={({ isActive }) =>
                          `nav-link${isActive ? ' nav-link-active' : ''}`
                        }
                      >
                        <item.icon size={17} strokeWidth={1.75} />
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        <span className="soon-pill">{t('dashboard.sidebar.soon')}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>

          {/* Footer / logout */}
          <div
            className="px-3 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <button
              onClick={handleLogout}
              className="nav-link w-full text-start"
              style={{ color: 'var(--accent-danger)' }}
            >
              <LogOut size={17} strokeWidth={1.75} />
              <span>{t('dashboard.sidebar.logout')}</span>
            </button>
            <div
              className="px-3 pt-3 mt-2 flex flex-wrap gap-x-3 gap-y-1"
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                borderTop: '1px dashed var(--border-default)',
              }}
            >
              {[
                { key: 'terms', to: '/terms' },
                { key: 'privacy', to: '/privacy' },
                { key: 'refund', to: '/refund-policy' },
                { key: 'cookies', to: '/cookies-policy' },
              ].map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => {
                    navigate(l.to);
                    onClose?.();
                  }}
                  className="bg-transparent border-0 p-0 cursor-pointer"
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {t(`legal.nav.${l.key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Component-scoped styles. Two important pieces:
            1. Below lg: the sidebar is fixed-positioned and slides
               in/out via translateX. Default position is off-screen.
            2. At lg and above: it's a normal static element in the
               flex layout — no transform, no fixed positioning.
            Putting the transform in a media query (instead of an
            inline style) lets the desktop rule actually apply. */}
        <style>{`
          .taahud-sidebar {
            width: 268px;
            background: var(--bg-surface);
            border-inline-end: 1px solid var(--border-default);
            display: flex;
            flex-direction: column;
          }

          @media (max-width: 1023px) {
            .taahud-sidebar {
              position: fixed;
              top: 0;
              bottom: 0;
              inset-inline-start: 0;
              z-index: 50;
              transform: translateX(100%);
              transition: transform 0.25s ease;
            }
            .taahud-sidebar.is-open {
              transform: translateX(0);
            }
          }

          @media (min-width: 1024px) {
            .taahud-sidebar {
              position: fixed;
              top: 0;
              bottom: 0;
              inset-inline-start: 0;
              z-index: 30;
            }
          }

          .nav-link {
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
          .nav-link:hover {
            background: var(--bg-canvas);
            color: var(--accent-primary);
          }
          .nav-link-active {
            background: rgba(44,47,124,0.08);
            color: var(--accent-primary);
            font-weight: 600;
          }
          .nav-link-active:hover {
            background: rgba(44,47,124,0.10);
          }

          .soon-pill {
            display: inline-flex;
            align-items: center;
            padding: 2px 7px;
            border-radius: 999px;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #b8862a;
            background: rgba(184,134,42,0.12);
            border: 1px solid rgba(184,134,42,0.22);
            flex-shrink: 0;
          }
        `}</style>
      </aside>
    </>
  );
}
