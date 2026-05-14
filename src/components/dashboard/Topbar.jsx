import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, UserCircle, LogOut, Settings } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { accountTypeLabel } from '../../config/constants';

/* ============================================================
 *  Topbar — sits above the main content area.
 *  - On mobile, hosts the sidebar toggle.
 *  - Always shows the user avatar with a small dropdown.
 *
 *  Props:
 *    onMenuToggle  → opens the mobile sidebar
 *    title         → optional page title shown next to the logo
 * ============================================================ */

export default function Topbar({ onMenuToggle, title }) {
  return (
    <header
      className="sticky top-0 z-30 bg-white"
      style={{ borderBottom: '1px solid #e5e3dc' }}
    >
      <div className="flex items-center justify-between h-[96px] px-5 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="فتح القائمة"
            className="lg:hidden flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#fafaf6',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={18} />
          </button>

          {title && (
            <h1
              className="font-display m-0 truncate"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#0f1129',
                lineHeight: 1.3,
              }}
            >
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/* ============================================================
 *  UserMenu — avatar + dropdown
 * ============================================================ */
function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useUser();
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
      await logout();
    } finally {
      navigate('/login');
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
          padding: '6px 10px 6px 6px',
          borderRadius: 999,
          background: open ? '#fafaf6' : 'transparent',
          border: '1px solid #e5e3dc',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf6')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open ? '#fafaf6' : 'transparent')
        }
      >
        <div
          className="flex items-center justify-center font-display font-bold flex-shrink-0"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#2c2f7c',
            color: 'white',
            fontSize: 13,
          }}
        >
          {initial}
        </div>
        <span
          className="hidden sm:inline font-semibold truncate"
          style={{ fontSize: 13, color: '#0f1129', maxWidth: 140 }}
        >
          {user?.name || 'مستخدم'}
        </span>
        <ChevronDown size={14} className="text-muted hidden sm:inline" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-40 animate-fade-up"
          style={{
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 240,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e5e3dc',
            boxShadow: '0 16px 36px rgba(15,17,41,0.10)',
            overflow: 'hidden',
          }}
        >
          {/* Profile summary */}
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
              icon={UserCircle}
              label="الملف الشخصي"
              onClick={() => {
                setOpen(false);
                navigate('/dashboard/profile');
              }}
            />
            <MenuItem
              icon={Settings}
              label="الإعدادات"
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
