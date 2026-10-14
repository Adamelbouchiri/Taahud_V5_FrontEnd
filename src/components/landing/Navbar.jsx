import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  ChevronDown,
  UserCircle,
  LogOut,
} from 'lucide-react';
import Logo from '../Logo';
import LanguageThemeSwitcher from '../LanguageThemeSwitcher';
import { auth } from '../../services';
import { hasToken } from '../../services/session';
import { useTranslation } from '../../i18n/LanguageContext';
import { ROLES, SERVICES_MENU_EVENT, roleMenuTitleKey } from './landingRoles';
import rasdLogo from '../../assets/products/rasd.png';
import solidarityLogo from '../../assets/products/solidarity.png';
import storeLogo from '../../assets/products/store.png';
import academyLogo from '../../assets/products/academy.png';

/* Nav links — `href` starting with `#` triggers smooth-scroll to
   that section on the landing page; `route: true` flips the
   handler over to react-router navigation.

   A link can also carry `items` (simple dropdown — an item may add
   `logo` + `desc` for the products menu) or `servicesMenu` (the
   role-tabbed Services mega menu, built from landingRoles.js).
   Items can carry `href`, `to`/`route`, or `soon: true` for
   placeholder pages that aren't built yet.

   Some links carry an `accountTypes` allowlist used at render time
   to hide them for ineligible signed-in users. Guests (no
   account_type yet) still see everything — they can't be classified.
*/
function navLinksFor(t) {
  return [
    { key: 'about', label: t('nav.about'), to: '/about', route: true },
    {
      key: 'products',
      label: t('nav.products'),
      items: [
        {
          key: 'rasd',
          label: t('nav.productsItems.rasd.title'),
          desc: t('nav.productsItems.rasd.desc'),
          logo: rasdLogo,
          href: '#rasd',
        },
        {
          key: 'solidarity',
          label: t('nav.productsItems.solidarity.title'),
          desc: t('nav.productsItems.solidarity.desc'),
          logo: solidarityLogo,
          to: '/pricing',
          route: true,
        },
        {
          key: 'store',
          label: t('nav.productsItems.store.title'),
          desc: t('nav.productsItems.store.desc'),
          logo: storeLogo,
          soon: true,
        },
        {
          key: 'academy',
          label: t('nav.productsItems.academy.title'),
          desc: t('nav.productsItems.academy.desc'),
          logo: academyLogo,
          soon: true,
        },
      ],
    },
    {
      key: 'services',
      label: t('nav.services'),
      // The «all services» page — the mobile drawer and the menu's
      // footer link both land here.
      servicesMenu: { to: '/services', route: true },
    },
    {
      key: 'plans',
      label: t('nav.plans'),
      to: '/pricing',
      route: true,
    },
    {
      key: 'partners',
      label: t('nav.partners'),
      to: '/partners',
      route: true,
    },
    {
      key: 'contact',
      label: t('nav.contact'),
      to: '/contact',
      route: true,
    },
  ];
}

/* ============================================================
 *  Auth detection on the landing page.
 *  ----------------------------------------------------------------
 *  The landing page lives OUTSIDE the dashboard's UserProvider, so
 *  we read the auth state ourselves. The flow is:
 *
 *    1. Ask services/session.js for a token. If absent → logged out.
 *    2. If a token exists, call auth.me() once to confirm it's
 *       still valid AND to fetch the user's name for the avatar.
 *    3. If me() rejects (401, network error, etc.), treat as
 *       logged out — the token is stale.
 * ============================================================ */
function useLandingAuth() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | guest | authed

  useEffect(() => {
    if (!hasToken()) {
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
      <nav className="max-w-[1360px] mx-auto px-4 lg:px-14 h-[68px] lg:h-[116px] flex items-center justify-between gap-3 lg:gap-6">
        {/* Logo */}
        <a
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2 shrink-0"
        >
          <span className="hidden lg:inline-block">
            <Logo height={88} />
          </span>
          <span className="lg:hidden">
            <Logo height={44} />
          </span>
        </a>

        {/* Center links */}
        <ul className="hidden lg:flex items-center gap-10 m-0 p-0">
          {NAV_LINKS.map((l) => (
            <li key={l.key} className="list-none">
              {l.items || l.servicesMenu ? (
                <NavDropdown link={l} onNavigate={handleLinkClick} t={t} />
              ) : (
                <a
                  onClick={() => handleLinkClick(l)}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium whitespace-nowrap hover:text-primary transition-colors cursor-pointer"
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
                {t('nav.tryFree')}
              </button>
            </>
          )}
        </div>

        {/* Mobile right cluster: menu toggle only.
            Language + theme switchers move into the drawer below so
            the top bar isn't fighting the logo for horizontal space. */}
        <div className="lg:hidden flex items-center">
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

            {/* Language + theme controls live with the links on mobile —
                see the comment in the mobile right cluster above. */}
            <div className="flex items-center justify-end pt-4">
              <LanguageThemeSwitcher />
            </div>

            <div className="flex gap-2 mt-2">
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
                    {t('nav.tryFree')}
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
 *  NavDropdown — desktop dropdown for `items` (simple list, with
 *  optional logo + description per item) or `servicesMenu` (the
 *  role-tabbed Services menu). Click-toggle with outside-click + ESC
 *  to dismiss, mirroring UserChip below.
 *
 *  The Services menu can also be opened from outside: the landing
 *  page's role cards fire SERVICES_MENU_EVENT with a role, and the
 *  menu opens on that role's tab.
 * ============================================================ */
function NavDropdown({ link, onNavigate, t }) {
  const { dir } = useTranslation();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(ROLES[0].key);
  const ref = useRef(null);
  const isServices = !!link.servicesMenu;

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

  useEffect(() => {
    if (!isServices) return undefined;
    const onOpen = (e) => {
      if (e.detail?.role) setRole(e.detail.role);
      setOpen(true);
    };
    window.addEventListener(SERVICES_MENU_EVENT, onOpen);
    return () => window.removeEventListener(SERVICES_MENU_EVENT, onOpen);
  }, [isServices]);

  const handleItem = (item) => {
    setOpen(false);
    if (item.soon) return; // placeholder — no nav target yet
    onNavigate(item);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium whitespace-nowrap hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
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
            ...(isServices
              ? {
                  insetInlineStart: '50%',
                  // CSS `transform: translateX(-50%)` is direction-
                  // agnostic — it always shifts left in pixel-space.
                  // In RTL we need to shift right to land back under
                  // the trigger button.
                  transform: dir === 'rtl' ? 'translateX(50%)' : 'translateX(-50%)',
                  width: 'min(860px, calc(100vw - 48px))',
                }
              : { insetInlineStart: 0, minWidth: 340 }),
            background: 'var(--bg-surface)',
            borderRadius: 14,
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden',
          }}
        >
          {isServices ? (
            <ServicesMenu
              role={role}
              setRole={setRole}
              dir={dir}
              t={t}
              onStart={() => handleItem({ to: '/register', route: true })}
              onAll={() => handleItem(link.servicesMenu)}
            />
          ) : (
            <ul className="m-0 p-2 flex flex-col gap-0.5">
              {link.items.map((item) => (
                <li key={item.key} className="list-none">
                  <button
                    type="button"
                    onClick={() => handleItem(item)}
                    role="menuitem"
                    className="w-full flex items-center gap-3 text-start transition-colors"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 9,
                      background: 'transparent',
                      border: 'none',
                      cursor: item.soon ? 'default' : 'pointer',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: 'var(--text-ink-soft)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--bg-surface-soft)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {item.logo && (
                      <img
                        src={item.logo}
                        alt=""
                        style={{
                          flex: 'none',
                          width: 52,
                          height: 40,
                          objectFit: 'contain',
                          background: '#fff',
                          border: '1px solid var(--border-default)',
                          borderRadius: 8,
                          padding: 5,
                        }}
                      />
                    )}
                    <span className="flex-1 min-w-0">
                      <span
                        className="flex items-center gap-2"
                        style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-ink)' }}
                      >
                        {item.label}
                        {item.soon && <SoonBadge t={t} />}
                      </span>
                      {item.desc && (
                        <span
                          className="block mt-0.5"
                          style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted)' }}
                        >
                          {item.desc}
                        </span>
                      )}
                    </span>
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
 *  ServicesMenu — the Services mega menu body.
 *  ----------------------------------------------------------------
 *  Role tabs down one side (click switches — not hover), the active
 *  role's services + tools in the middle, and its card with a
 *  «ابدأ مجاناً» CTA beside them. Suppliers aren't open yet, so
 *  their tab shows only the card. A strip along the bottom lists
 *  what every account gets, what's an add-on, and what's coming.
 * ============================================================ */
function ServicesMenu({ role, setRole, dir, t, onStart, onAll }) {
  const active = ROLES.find((r) => r.key === role) || ROLES[0];
  const Icon = active.icon;
  const arrow = dir === 'rtl' ? '←' : '→';
  const badge = (b) => (b ? <MiniBadge>{t(`landing.roles.badges.${b}`)}</MiniBadge> : null);

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '240px 1fr' }}>
        {/* Role tabs */}
        <div
          role="tablist"
          className="flex flex-col gap-0.5"
          style={{
            background: 'var(--bg-surface-soft)',
            borderInlineEnd: '1px solid var(--border-default)',
            padding: '14px 10px',
          }}
        >
          {ROLES.map((r) => {
            const selected = r.key === active.key;
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRole(r.key)}
                className="flex items-center gap-1.5 text-start"
                style={{
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: selected ? 700 : 500,
                  color: selected ? 'var(--text-brand)' : 'var(--text-ink)',
                  background: selected ? 'var(--bg-surface)' : 'transparent',
                  boxShadow: selected ? '0 1px 0 var(--border-default)' : 'none',
                }}
              >
                <span className="flex-1">
                  {t(roleMenuTitleKey(r))}
                  {r.soon && <> {badge('soon')}</>}
                </span>
                <span aria-hidden style={{ opacity: selected ? 1 : 0, color: 'var(--text-brand)' }}>
                  {arrow}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active role */}
        <div
          className="grid gap-6 items-start"
          style={{
            padding: '22px 26px',
            minHeight: 300,
            gridTemplateColumns: active.soon ? '1fr' : '1.35fr 1fr',
            justifyItems: active.soon ? 'center' : 'stretch',
            alignContent: active.soon ? 'center' : 'start',
          }}
        >
          {!active.soon && (
            <div>
              <MenuHeading>{t('landing.roles.servicesHeading')}</MenuHeading>
              <ul className="m-0 p-0">
                {active.services.map((s) => (
                  <li
                    key={s.k}
                    className="list-none flex items-center gap-1.5"
                    style={{
                      padding: '7px 0',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-ink)',
                      borderBottom: '1px solid var(--border-soft)',
                    }}
                  >
                    {t(`landing.roles.services.${s.k}`)}
                    {badge(s.badge)}
                  </li>
                ))}
              </ul>
              {active.tools.length > 0 && (
                <div className="mt-3.5">
                  <MenuHeading>
                    {t('landing.roles.toolsHeading')} {badge('soon')}
                  </MenuHeading>
                  <p className="m-0" style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--text-ink-soft)' }}>
                    {active.tools.map((tool, i) => (
                      <React.Fragment key={tool.k}>
                        {i > 0 && ' · '}
                        {t(`landing.roles.tools.${tool.k}`)}
                        {tool.badge && <> {badge(tool.badge)}</>}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              )}
              {active.more && <AllServices key={active.key} more={active.more} t={t} />}
            </div>
          )}

          <div
            className="flex flex-col gap-1.5"
            style={{
              background: 'var(--bg-surface-soft)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
              padding: 20,
              maxWidth: active.soon ? 340 : undefined,
            }}
          >
            <span
              className="grid place-items-center mb-1"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#eceefa',
                color: active.soon ? 'var(--text-muted)' : 'var(--text-brand)',
              }}
            >
              <Icon size={22} strokeWidth={1.6} />
            </span>
            <b style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}>
              {t(roleMenuTitleKey(active))}
            </b>
            {active.soon && <span className="self-start">{badge('soon')}</span>}
            {active.free && (
              <span
                className="self-start"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#2f6b4a',
                  background: 'rgba(47,107,74,0.10)',
                  borderRadius: 999,
                  padding: '2px 10px',
                }}
              >
                {t(`landing.roles.badges.${active.free}`)}
              </span>
            )}
            <p className="m-0" style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-ink-soft)' }}>
              {t(`landing.roles.items.${active.key}.desc`)}
            </p>
            {!active.soon && (
              <button
                type="button"
                onClick={onStart}
                className="self-start mt-2 rounded-[10px] font-semibold"
                style={{
                  fontSize: 13.5,
                  padding: '9px 18px',
                  background: 'var(--bg-ink-deep)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('landing.roles.start')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shared strip */}
      <div
        className="flex flex-wrap items-end justify-between gap-3"
        style={{
          padding: '14px 26px',
          borderTop: '1px solid var(--border-default)',
          fontSize: 13,
          lineHeight: 1.9,
          color: 'var(--text-ink-soft)',
        }}
      >
        <div>
          {['all', 'addon', 'soon'].map((k) => (
            <p key={k} className="m-0">
              <b style={{ color: 'var(--text-brand)', fontWeight: 700 }}>
                {t(`landing.roles.shared.${k}Label`)}
              </b>{' '}
              {t(`landing.roles.shared.${k}`)}
              {k === 'soon' && (
                <>
                  {' '}
                  <MiniBadge>{t('landing.roles.shared.soonNote')}</MiniBadge>
                </>
              )}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onAll}
          className="text-[13px] font-semibold bg-transparent border-0 p-0 cursor-pointer"
          style={{ color: 'var(--text-brand)', fontFamily: 'inherit' }}
        >
          {t('nav.servicesAll')} {arrow}
        </button>
      </div>
    </>
  );
}

/* «عرض كل الخدمات والأدوات» — a collapsed dropdown under the role's
   services listing everything else its plans include, split into
   available now and «قريبًا». Keyed by role in the caller, so it
   closes again when the tab changes. */
function AllServices({ more, t }) {
  const [open, setOpen] = useState(false);
  const label = (k) => t(`landing.roles.allMore.items.${k}`);
  const total = more.available.length + more.soon.length;

  return (
    <div className="mx-more">
      <button
        type="button"
        className="mx-sum"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{t('landing.roles.allMore.summary')}</span>
        <span className="mx-count">{total}</span>
        <ChevronDown size={14} className="mx-caret" aria-hidden />
      </button>
      {open && (
        <div className="mx-body">
          {[
            ['available', more.available],
            ['soon', more.soon],
          ].map(([sec, keys]) =>
            keys.length ? (
              <div key={sec} className={`mx-sec${sec === 'soon' ? ' mx-late' : ''}`}>
                <h6>
                  {t(`landing.roles.allMore.${sec}`)} <b>{keys.length}</b>
                </h6>
                <div className="mx-grid">
                  {keys.map((k) => (
                    <span key={k} className={`mx-i${sec === 'soon' ? ' is-soon' : ''}`}>
                      {label(k)}
                      {sec === 'soon' && <em>{t('landing.roles.badges.soon')}</em>}
                    </span>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
      <style>{`
        .mx-more { margin-top: 16px; border-top: 1px solid var(--border-default); padding-top: 12px; }
        .mx-sum {
          display: flex; align-items: center; gap: 8px; width: 100%;
          font: inherit; font-size: 13px; font-weight: 700; color: var(--text-brand);
          padding: 7px 11px; cursor: pointer; text-align: start;
          border: 1px solid var(--border-default); border-radius: 10px;
          background: var(--bg-surface-soft);
          transition: background .15s, border-color .15s;
        }
        .mx-sum:hover, .mx-sum[aria-expanded="true"] { background: var(--bg-surface); border-color: var(--text-brand); }
        .mx-count {
          font-size: 10.5px; font-weight: 800; color: var(--text-brand);
          background: var(--bg-surface); border: 1px solid var(--border-default);
          border-radius: 999px; padding: 1px 8px;
        }
        .mx-caret { margin-inline-start: auto; color: var(--text-muted); transition: transform .2s; }
        .mx-sum[aria-expanded="true"] .mx-caret { transform: rotate(180deg); }
        .mx-body { margin-top: 12px; max-height: 300px; overflow-y: auto; padding: 2px 6px 2px 2px; scrollbar-width: thin; }
        .mx-body::-webkit-scrollbar { width: 5px; }
        .mx-body::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
        .mx-sec + .mx-sec { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border-default); }
        .mx-sec h6 {
          display: flex; align-items: center; gap: 6px; margin: 0 0 9px;
          font-size: 11px; font-weight: 800; color: #b08a3e; letter-spacing: .02em;
        }
        .mx-sec h6 b {
          font-size: 9.5px; font-weight: 800; color: var(--text-muted);
          background: var(--bg-surface-soft); border-radius: 999px; padding: 1px 7px;
        }
        .mx-late h6 { color: var(--text-muted); }
        .mx-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .mx-i {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; line-height: 1.5; color: var(--text-ink);
          padding: 5px 11px; border: 1px solid var(--border-default); border-radius: 999px;
          background: var(--bg-surface);
        }
        .mx-i.is-soon { color: var(--text-muted); background: var(--bg-surface-soft); border-style: dashed; }
        .mx-i em {
          font-style: normal; font-size: 9px; font-weight: 800; color: #b08a3e;
          background: rgba(176,138,62,.12); border-radius: 999px; padding: 1px 6px; white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function MenuHeading({ children }) {
  return (
    <h6
      className="m-0 mb-2 flex items-center gap-1.5"
      style={{ fontSize: 12, fontWeight: 700, color: '#b08a3e' }}
    >
      {children}
    </h6>
  );
}

function MiniBadge({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        padding: '0 6px',
        borderRadius: 999,
        background: 'rgba(184,134,42,0.14)',
        color: '#b8862a',
        border: '1px solid rgba(184,134,42,0.22)',
        whiteSpace: 'nowrap',
        lineHeight: 1.7,
        verticalAlign: 1,
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================
 *  MobileNavItem — flat link or expandable group for the mobile
 *  drawer. The Services menu collapses to one row per role, each
 *  going to /services — the tabbed menu is desktop-only.
 * ============================================================ */
function MobileNavItem({ link, onNavigate, t }) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!(link.items || link.servicesMenu);

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

  const isServices = !!link.servicesMenu;
  const childItems = link.items
    ? link.items
    : ROLES.map((r) => ({
        key: r.key,
        label: t(roleMenuTitleKey(r)),
        soon: r.soon,
        ...link.servicesMenu,
      }));

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
                {it.logo && (
                  <img
                    src={it.logo}
                    alt=""
                    style={{
                      width: 40,
                      height: 30,
                      objectFit: 'contain',
                      background: '#fff',
                      border: '1px solid var(--border-default)',
                      borderRadius: 6,
                      padding: 3,
                    }}
                  />
                )}
                <span className="flex-1">{it.label}</span>
                {it.soon && <SoonBadge t={t} />}
              </button>
            </li>
          ))}
          {isServices && (
            <li className="list-none mt-1">
              <button
                type="button"
                onClick={() => onNavigate(link.servicesMenu)}
                className="w-full flex items-center gap-2 text-start"
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--text-brand)',
                  fontFamily: 'inherit',
                }}
              >
                {t('nav.servicesAll')}
              </button>
            </li>
          )}
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
