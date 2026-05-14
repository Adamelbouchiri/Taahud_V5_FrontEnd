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
import { auth } from '../../services';
import { accountTypeLabel } from '../../config/constants';

const NAV_LINKS = [
  { label: 'الخدمات', href: '#services' },
  { label: 'الإشادات', href: '#testimonials' },
  { label: 'الساحات', href: '#arenas' },
  { label: 'الباقات', href: '#plans' },
];

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
    const token = localStorage.getItem('token');
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
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, status } = useLandingAuth();
  const isAuthed = status === 'authed';

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
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: scrolled ? '1px solid #e5e3dc' : '1px solid transparent',
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
                className="text-[14px] font-medium text-ink-soft hover:text-primary transition-colors cursor-pointer"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right side: CTAs OR user menu */}
        <div className="hidden lg:flex items-center gap-2">
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
                لوحة التحكّم
              </button>
              <UserChip user={user} />
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-[14px] font-semibold text-ink-soft hover:text-primary transition-colors"
              >
                تسجيل الدخول
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
                ابدأ الآن
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-ink-soft"
          onClick={() => setOpen(!open)}
          aria-label="القائمة"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-app-border bg-white animate-fade-up">
          <div className="px-6 py-5 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                onClick={() => goToSection(l.href)}
                className="py-3 text-[15px] font-medium text-ink-soft cursor-pointer border-b border-app-border last:border-0"
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
                    background: '#efece4',
                  }}
                />
              ) : isAuthed ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-[10px] bg-primary text-white text-[14px] font-semibold"
                >
                  <LayoutDashboard size={15} strokeWidth={1.9} />
                  لوحة التحكّم
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
                    className="flex-1 py-3 rounded-[10px] border border-app-border text-[14px] font-semibold"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="flex-1 py-3 rounded-[10px] bg-primary text-white text-[14px] font-semibold"
                  >
                    ابدأ الآن
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
        style={{ width: 130, height: 40, background: '#efece4' }}
      />
      <div
        className="animate-pulse rounded-full"
        style={{ width: 40, height: 40, background: '#efece4' }}
      />
    </div>
  );
}

/* ============================================================
 *  UserChip — small avatar + dropdown, mirrors the Topbar menu.
 * ============================================================ */
function UserChip({ user }) {
  const navigate = useNavigate();
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
      // Hard reload so every page (incl. this navbar) re-reads auth.
      window.location.assign('/');
    }
  };

  const initial = (user?.name || 'م').trim().charAt(0);
  const roleLabel = accountTypeLabel(user?.account_type);

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
          background: open ? 'rgba(255,255,255,0.7)' : 'transparent',
          border: '1px solid #e5e3dc',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open ? 'rgba(255,255,255,0.7)' : 'transparent')
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
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 animate-fade-up"
          style={{
            top: 'calc(100% + 10px)',
            insetInlineEnd: 0,
            width: 240,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e5e3dc',
            boxShadow: '0 16px 36px rgba(15,17,41,0.12)',
            overflow: 'hidden',
          }}
        >
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #efece4' }}>
            <div
              className="font-bold truncate"
              style={{ fontSize: 13.5, color: '#0f1129' }}
            >
              {user?.name || 'مستخدم'}
            </div>
            {roleLabel && (
              <div
                className="font-medium mt-0.5"
                style={{ fontSize: 12, color: '#7a7a8c' }}
              >
                {roleLabel}
              </div>
            )}
          </div>

          <div className="py-1">
            <MenuItem
              icon={LayoutDashboard}
              label="لوحة التحكّم"
              onClick={() => {
                setOpen(false);
                navigate('/dashboard');
              }}
            />
            <MenuItem
              icon={UserCircle}
              label="الملف الشخصي"
              onClick={() => {
                setOpen(false);
                navigate('/dashboard/profile');
              }}
            />
          </div>

          <div className="py-1" style={{ borderTop: '1px solid #efece4' }}>
            <MenuItem
              icon={LogOut}
              label="تسجيل الخروج"
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
      className="w-full flex items-center gap-2.5 transition-colors text-right"
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13.5,
        fontWeight: 500,
        color: danger ? '#b91c1c' : '#3a3a52',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'rgba(185,28,28,0.04)'
          : '#fafaf6';
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={15} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}
