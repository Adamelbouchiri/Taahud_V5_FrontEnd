import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  ChevronDown,
  UserCircle,
  LogOut,
  ShoppingBag,
} from 'lucide-react';
import Logo from '../Logo';
import LanguageThemeSwitcher from '../LanguageThemeSwitcher';
import { auth } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';

/* Nav links — `href` starting with `#` triggers smooth-scroll to
   that section on the landing page; `route: true` flips the
   handler over to react-router navigation. The Store entry is the
   only route-style link today; the rest are anchor scrolls.

   A link can also carry `items` (simple dropdown) or `mega`
   (multi-column dropdown). Items in those menus can themselves
   carry `href`, `to`/`route`, or `soon: true` for placeholder
   pages that aren't built yet.

   Some links carry an `accountTypes` allowlist used at render time
   to hide them for ineligible signed-in users. Guests (no
   account_type yet) still see everything — they can't be classified.
*/
function navLinksFor(t) {
  return [
    { key: 'about', label: t('nav.about'), href: '#platform' },
    {
      key: 'programs',
      label: t('nav.programs'),
      items: [
        { key: 'academy', label: t('nav.programsItems.academy'), soon: true },
        { key: 'affiliate', label: t('nav.programsItems.affiliate'), soon: true },
      ],
    },
    {
      key: 'services',
      label: t('nav.services'),
      mega: {
        to: '/services',
        route: true,
        columns: [
          {
            title: t('landing.services.tabs.contractors'),
            items: [
              'hub', 'private', 'solidarity', 'contractGen', 'contractCheck',
              'analyzer', 'tracker', 'ai', 'docs',
            ].map((k) => ({
              key: k,
              label: t(`landing.services.cards.contractors.${k}.title`),
            })),
          },
          {
            title: t('landing.services.tabs.suppliers'),
            items: [
              'market', 'rfq', 'demand', 'delivery', 'payment',
              'contracts', 'reputation', 'inventory', 'aiSales',
            ].map((k) => ({
              key: k,
              label: t(`landing.services.cards.suppliers.${k}.title`),
            })),
          },
          {
            title: t('landing.services.tabs.developers'),
            items: [
              'network', 'tenders', 'portfolio', 'escrow', 'financing',
              'analytics', 'qualify', 'investorReports', 'ai',
            ].map((k) => ({
              key: k,
              label: t(`landing.services.cards.developers.${k}.title`),
            })),
          },
        ],
      },
    },
    {
      key: 'plans',
      label: t('nav.plans'),
      href: '#plans',
    },
    {
      key: 'contact',
      label: t('nav.contact'),
      to: '/contact',
      route: true,
    },
    {
      key: 'store',
      label: t('nav.store'),
      to: '/store',
      route: true,
      icon: ShoppingBag,
      soon: true,
      // Store targets contractors, engineering offices, and
      // suppliers; hide for individuals + developers (signed-in
      // only — guests still see it).
      accountTypes: ['entrepreneur', 'engineering', 'supplier'],
    },
  ];
}

/* ============================================================
 *  Auth detection on the landing page.
 *  ----------------------------------------------------------------
 *  The landing page lives OUTSIDE the dashboard's UserProvider, so
 *  we read the auth state ourselves. The flow is:
 *
 *    1. Check localStorage for a token. If absent → logged out.
 *    2. If a token exists, call auth.me() once to confirm it's
 *       still valid AND to fetch the user's name for the avatar.
 *    3. If me() rejects (401, network error, etc.), treat as
 *       logged out — the token is stale.
 * ============================================================ */
function useLandingAuth() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | guest | authed

  useEffect(() => {
    // Token may live in localStorage (remember_me) or sessionStorage
    // (tab-scoped). See services/auth.js.
    const token =
      localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setStatus('guest');
      return;
    }

    let cancelled = false;
    auth
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authed');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('guest');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, status };
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, status } = useLandingAuth();
  const isAuthed = status === 'authed';
  // Filter out links the signed-in user shouldn't see. Guests
  // and users mid-load see the full set — we only narrow once
  // we know which account_type they have.
  const NAV_LINKS = navLinksFor(t).filter((l) => {
    if (!l.accountTypes) return true;
    if (!isAuthed || !user?.account_type) return true;
    return l.accountTypes.includes(user.account_type);
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToSection = (href) => {
    setOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Section lives on the landing page; we're on /services or
      // /contact — bounce to "/" with the hash so LandingPage's
      // hash-scroll effect can pick it up after render.
      navigate('/' + href);
    }
  };

  const handleLinkClick = (link) => {
    setOpen(false);
    if (link.route) {
      navigate(link.to, { state: { from: location.pathname || '/' } });
    } else if (link.external && link.href) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    } else if (link.href) {
      goToSection(link.href);
    }
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all"
      style={{
        background: scrolled
          ? 'rgb(var(--rgb-surface) / 0.85)'
          : 'rgb(var(--rgb-surface) / 0.6)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: scrolled ? '1px solid var(--border-default)' : '1px solid transparent',
      }}
    >
      <nav className="max-w-[1360px] mx-auto px-6 lg:px-14 h-[116px] flex items-center justify-between gap-6">
        {/* Logo */}
        <a
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Logo height={88} />
        </a>

        {/* Center links */}
        <ul className="hidden lg:flex items-center gap-10 m-0 p-0">
          {NAV_LINKS.map((l) => (
            <li key={l.key} className="list-none">
              {l.items || l.mega ? (
                <NavDropdown link={l} onNavigate={handleLinkClick} t={t} />
              ) : (
                <a
                  onClick={() => handleLinkClick(l)}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:text-primary transition-colors cursor-pointer"
                  style={{ color: 'var(--text-ink-soft)' }}
                >
                  {l.icon && <l.icon size={14} strokeWidth={1.9} />}
                  {l.label}
                  {l.soon && <SoonBadge t={t} />}
                </a>
              )}
            </li>
          ))}
        </ul>

        {/* Right side: switcher + CTAs OR user menu */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <LanguageThemeSwitcher compact />
          {status === 'loading' ? (
            <AuthSkeleton />
          ) : isAuthed ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[10px] transition-all"
                style={{
                  background: '#2c2f7c',
                  boxShadow: '0 6px 14px rgba(44,47,124,0.18)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1f2258';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2c2f7c';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <LayoutDashboard size={15} strokeWidth={1.9} />
                {t('nav.dashboard')}
              </button>
              <UserChip user={user} />
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-[14px] font-semibold hover:text-primary transition-colors"
                style={{ color: 'var(--text-ink-soft)' }}
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-2.5 text-[14px] font-semibold text-white rounded-[10px] transition-all"
                style={{
                  background: '#2c2f7c',
                  boxShadow: '0 6px 14px rgba(44,47,124,0.18)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1f2258';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2c2f7c';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {t('landing.hero.ctaPrimary')}
              </button>
            </>
          )}
        </div>

        {/* Mobile right cluster: switcher + menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <LanguageThemeSwitcher compact />
          <button
            className="p-2"
            style={{ color: 'var(--text-ink-soft)' }}
            onClick={() => setOpen(!open)}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          className="lg:hidden border-t animate-fade-up"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="px-6 py-5 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <MobileNavItem
                key={l.key}
                link={l}
                onNavigate={handleLinkClick}
                t={t}
              />
            ))}

            <div className="flex gap-2 mt-4">
              {status === 'loading' ? (
                <div
                  className="flex-1 rounded-[10px] animate-pulse"
                  style={{
                    height: 46,
                    background: 'var(--border-soft)',
                  }}
                />
              ) : isAuthed ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-[10px] bg-primary text-white text-[14px] font-semibold"
                >
                  <LayoutDashboard size={15} strokeWidth={1.9} />
                  {t('nav.dashboard')}
                  {user?.name && (
                    <span className="opacity-80" style={{ fontSize: 12 }}>
                      · {user.name.split(' ')[0]}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="flex-1 py-3 rounded-[10px] border text-[14px] font-semibold"
                    style={{
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-ink-soft)',
                    }}
                  >
                    {t('nav.login')}
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="flex-1 py-3 rounded-[10px] bg-primary text-white text-[14px] font-semibold"
                  >
                    {t('landing.hero.ctaPrimary')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ============================================================
 *  Shared "قريباً / Soon" pill used by nav links and dropdown items.
 * ============================================================ */
function SoonBadge({ t }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 999,
        background: 'rgba(184,134,42,0.14)',
        color: '#b8862a',
        border: '1px solid rgba(184,134,42,0.22)',
        whiteSpace: 'nowrap',
      }}
    >
      {t('dashboard.sidebar.soon')}
    </span>
  );
}

/* ============================================================
 *  NavDropdown — desktop dropdown for `items` (simple list) or
 *  `mega` (multi-column). Click-toggle with outside-click + ESC
 *  to dismiss, mirroring UserChip below.
 * ============================================================ */
function NavDropdown({ link, onNavigate, t }) {
  const { dir } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleItem = (item) => {
    setOpen(false);
    if (item.soon) return; // placeholder — no nav target yet
    onNavigate(item);
  };

  const isMega = !!link.mega;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
        style={{ color: 'var(--text-ink-soft)', fontFamily: 'inherit' }}
      >
        {link.label}
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.18s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 animate-fade-in"
          style={{
            top: 'calc(100% + 14px)',
            ...(isMega
              ? {
                  insetInlineStart: '50%',
                  // CSS `transform: translateX(-50%)` is direction-
                  // agnostic — it always shifts left in pixel-space.
                  // In RTL we need to shift right to land back under
                  // the trigger button.
                  transform:
                    dir === 'rtl' ? 'translateX(50%)' : 'translateX(-50%)',
                }
              : { insetInlineStart: 0 }),
            minWidth: isMega ? 720 : 240,
            background: 'var(--bg-surface)',
            borderRadius: 14,
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden',
          }}
        >
          {isMega ? (
            <>
              <div
                className="grid gap-6 p-6"
                style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
              >
                {link.mega.columns.map((col) => (
                  <div key={col.title}>
                    <div
                      className="font-bold mb-3"
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {col.title}
                    </div>
                    <ul className="m-0 p-0 flex flex-col gap-1">
                      {col.items.map((item) => (
                        <li key={item.key} className="list-none">
                          <button
                            type="button"
                            onClick={() =>
                              handleItem(link.mega)
                            }
                            className="w-full text-start transition-colors"
                            style={{
                              padding: '7px 10px',
                              borderRadius: 8,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text-ink-soft)',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                'var(--bg-surface-soft)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'transparent')
                            }
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div
                className="px-6 py-3"
                style={{
                  borderTop: '1px solid var(--border-soft)',
                  background: 'var(--bg-surface-soft)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleItem(link.mega)}
                  className="text-[13px] font-semibold transition-colors bg-transparent border-0 p-0 cursor-pointer"
                  style={{ color: 'var(--text-brand)', fontFamily: 'inherit' }}
                >
                  {t('nav.servicesAll')}
                </button>
              </div>
            </>
          ) : (
            <ul className="m-0 p-2 flex flex-col gap-0.5">
              {link.items.map((item) => (
                <li key={item.key} className="list-none">
                  <button
                    type="button"
                    onClick={() => handleItem(item)}
                    role="menuitem"
                    className="w-full flex items-center gap-2 text-start transition-colors"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      cursor: item.soon ? 'default' : 'pointer',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: 'var(--text-ink-soft)',
                      fontFamily: 'inherit',
                      opacity: item.soon ? 0.8 : 1,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        'var(--bg-surface-soft)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <span className="flex-1">{item.label}</span>
                    {item.soon && <SoonBadge t={t} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 *  MobileNavItem — flat link or expandable group for the mobile
 *  drawer. Mega menus collapse to a single flat list (no columns)
 *  to keep the drawer tidy.
 * ============================================================ */
function MobileNavItem({ link, onNavigate, t }) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!(link.items || link.mega);

  if (!hasChildren) {
    return (
      <a
        onClick={() => onNavigate(link)}
        className="py-3 inline-flex items-center gap-2 text-[15px] font-medium cursor-pointer border-b last:border-0"
        style={{
          color: 'var(--text-ink-soft)',
          borderColor: 'var(--border-default)',
        }}
      >
        {link.icon && <link.icon size={15} strokeWidth={1.9} />}
        <span className="flex-1">{link.label}</span>
        {link.soon && <SoonBadge t={t} />}
      </a>
    );
  }

  const childItems = link.items
    ? link.items
    : link.mega.columns.flatMap((col) =>
        col.items.map((it) => ({
          ...it,
          to: link.mega.to,
          route: link.mega.route,
          href: link.mega.href,
          external: link.mega.external,
        }))
      );

  return (
    <div
      className="border-b last:border-0"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full py-3 inline-flex items-center gap-2 text-[15px] font-medium cursor-pointer bg-transparent border-0 text-start"
        style={{ color: 'var(--text-ink-soft)', fontFamily: 'inherit' }}
      >
        <span className="flex-1">{link.label}</span>
        <ChevronDown
          size={16}
          style={{
            transition: 'transform 0.18s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      {open && (
        <ul
          className="m-0 pb-2 ps-2 flex flex-col gap-0.5"
          style={{ listStyle: 'none', padding: 0 }}
        >
          {childItems.map((it) => (
            <li key={it.key} className="list-none">
              <button
                type="button"
                onClick={() => {
                  if (it.soon) return;
                  onNavigate(it);
                }}
                className="w-full flex items-center gap-2 text-start"
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: it.soon ? 'default' : 'pointer',
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'var(--text-ink-soft)',
                  fontFamily: 'inherit',
                  opacity: it.soon ? 0.8 : 1,
                }}
              >
                <span className="flex-1">{it.label}</span>
                {it.soon && <SoonBadge t={t} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
 *  AuthSkeleton — placeholder shown while auth.me() is in-flight
 *  so the layout doesn't visibly snap from "login buttons" to
 *  "logged-in chip" on every page load.
 * ============================================================ */
function AuthSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="animate-pulse rounded-[10px]"
        style={{ width: 130, height: 40, background: 'var(--border-soft)' }}
      />
      <div
        className="animate-pulse rounded-full"
        style={{ width: 40, height: 40, background: 'var(--border-soft)' }}
      />
    </div>
  );
}

/* ============================================================
 *  UserChip — small avatar + dropdown, mirrors the Topbar menu.
 * ============================================================ */
function UserChip({ user }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await auth.logout();
    } finally {
      window.location.assign('/');
    }
  };

  const initial = (user?.name || '·').trim().charAt(0);
  const roleLabel = user?.account_type
    ? t(`accountType.${user.account_type}`)
    : '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 transition-all"
        style={{
          padding: '4px 10px 4px 4px',
          borderRadius: 999,
          background: open ? 'var(--bg-surface)' : 'transparent',
          border: '1px solid var(--border-default)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open ? 'var(--bg-surface)' : 'transparent')
        }
      >
        <div
          className="flex items-center justify-center font-display font-bold flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#2c2f7c',
            color: 'white',
            fontSize: 14,
          }}
        >
          {initial}
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 animate-fade-up"
          style={{
            top: 'calc(100% + 10px)',
            insetInlineEnd: 0,
            width: 240,
            background: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden',
          }}
        >
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <div
              className="font-bold truncate"
              style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
            >
              {user?.name || t('nav.profile')}
            </div>
            {roleLabel && (
              <div
                className="font-medium mt-0.5"
                style={{ fontSize: 12, color: 'var(--text-muted)' }}
              >
                {roleLabel}
              </div>
            )}
          </div>

          <div className="py-1">
            <MenuItem
              icon={LayoutDashboard}
              label={t('nav.dashboard')}
              onClick={() => {
                setOpen(false);
                navigate('/dashboard');
              }}
            />
            <MenuItem
              icon={UserCircle}
              label={t('nav.profile')}
              onClick={() => {
                setOpen(false);
                navigate('/dashboard/profile');
              }}
            />
          </div>

          <div className="py-1" style={{ borderTop: '1px solid var(--border-soft)' }}>
            <MenuItem
              icon={LogOut}
              label={t('nav.logout')}
              onClick={handleLogout}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center gap-2.5 transition-colors text-start"
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13.5,
        fontWeight: 500,
        color: danger ? 'var(--accent-danger)' : 'var(--text-ink-soft)',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'rgba(185,28,28,0.06)'
          : 'var(--bg-surface-soft)';
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={15} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}
