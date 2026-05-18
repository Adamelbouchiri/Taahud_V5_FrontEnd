import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useTranslation } from '../../i18n/LanguageContext';

function navLinksFor(t) {
  return [
    { key: 'services', label: t('nav.services'), href: '#services' },
    { key: 'testimonials', label: t('nav.testimonials'), href: '#testimonials' },
    { key: 'arenas', label: t('nav.arenas'), href: '#arenas' },
    { key: 'plans', label: t('nav.plans'), href: '#plans' },
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
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, status } = useLandingAuth();
  const isAuthed = status === 'authed';
  const NAV_LINKS = navLinksFor(t);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToSection = (href) => {
    setOpen(false);
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <nav className="max-w-[1280px] mx-auto px-6 lg:px-12 h-[96px] flex items-center justify-between">
        {/* Logo */}
        <a
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2"
        >
          <Logo height={68} />
        </a>

        {/* Center links */}
        <ul className="hidden lg:flex items-center gap-9 m-0 p-0">
          {NAV_LINKS.map((l) => (
            <li key={l.href} className="list-none">
              <a
                onClick={() => goToSection(l.href)}
                className="text-[14px] font-medium hover:text-primary transition-colors cursor-pointer"
                style={{ color: 'var(--text-ink-soft)' }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right side: switcher + CTAs OR user menu */}
        <div className="hidden lg:flex items-center gap-2">
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
              <a
                key={l.href}
                onClick={() => goToSection(l.href)}
                className="py-3 text-[15px] font-medium cursor-pointer border-b last:border-0"
                style={{
                  color: 'var(--text-ink-soft)',
                  borderColor: 'var(--border-default)',
                }}
              >
                {l.label}
              </a>
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
