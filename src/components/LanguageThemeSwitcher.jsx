import React, { useEffect, useRef, useState } from 'react';
import { Globe, Sun, Moon, Check, ChevronDown } from 'lucide-react';
import { useTranslation, LANGUAGES } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

/* ============================================================
 *  LanguageThemeSwitcher
 *  ----------------------------------------------------------------
 *  Compact pair: a language dropdown (Globe + active short code)
 *  and a dark-mode toggle button (Sun ↔ Moon). Both share the
 *  same pill styling so they read as one control cluster wherever
 *  they're dropped in (Navbar, Topbar, etc.).
 *
 *  Variants:
 *    - default: white background, light borders, ink text
 *    - dark:    transparent / inverse for use on dark headers
 *
 *  Pass `compact` to render shorter pills (used in tight nav rows).
 * ============================================================ */

export default function LanguageThemeSwitcher({
  variant = 'default',
  compact = false,
  className = '',
}) {
  const { t } = useTranslation();
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <LanguagePicker variant={variant} compact={compact} t={t} />
      <ThemeButton variant={variant} compact={compact} t={t} />
    </div>
  );
}

function LanguagePicker({ variant, compact, t }) {
  const { lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const triggerStyle = pillStyle(variant, open);
  const padding = compact ? '6px 10px' : '8px 12px';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-[10px] font-semibold transition-all"
        style={{
          ...triggerStyle,
          padding,
          fontSize: compact ? 12 : 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Globe size={compact ? 13 : 14} strokeWidth={1.9} />
        <span>{active.short}</span>
        <ChevronDown
          size={compact ? 11 : 12}
          strokeWidth={2}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 animate-fade-up"
          style={{
            top: 'calc(100% + 6px)',
            insetInlineEnd: 0,
            minWidth: 168,
            background: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden',
          }}
        >
          {LANGUAGES.map((l) => {
            const isActive = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className="w-full inline-flex items-center justify-between gap-3 transition-colors text-start"
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-ink)',
                  background: isActive
                    ? 'var(--bg-cream)'
                    : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-cream)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isActive
                    ? 'var(--bg-cream)'
                    : 'transparent')
                }
              >
                <span>{l.label}</span>
                {isActive && (
                  <Check size={13} strokeWidth={2.4} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeButton({ variant, compact, t }) {
  const { isDark, toggle } = useTheme();
  const label = isDark ? t('theme.toggleToLight') : t('theme.toggleToDark');
  const padding = compact ? 7 : 9;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded-[10px] transition-all"
      style={{
        ...pillStyle(variant, false),
        width: compact ? 32 : 36,
        height: compact ? 32 : 36,
        padding,
        cursor: 'pointer',
      }}
    >
      {isDark ? (
        <Sun size={compact ? 14 : 15} strokeWidth={1.9} />
      ) : (
        <Moon size={compact ? 14 : 15} strokeWidth={1.9} />
      )}
    </button>
  );
}

function pillStyle(variant, open) {
  if (variant === 'dark') {
    return {
      background: open ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.16)',
      color: 'white',
    };
  }
  return {
    background: open ? 'var(--bg-cream)' : 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-ink-soft)',
  };
}
