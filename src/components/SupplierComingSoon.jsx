import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LayoutDashboard, Wrench } from 'lucide-react';
import Logo from './Logo';
import LanguageThemeSwitcher from './LanguageThemeSwitcher';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  SupplierComingSoon
 *  ----------------------------------------------------------------
 *  Friendly "we're working on it" view for suppliers. Renders as
 *  a full standalone page OR as an embedded section inside the
 *  dashboard home.
 * ============================================================ */
export default function SupplierComingSoon({ embedded = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const content = (
    <div className="max-w-2xl mx-auto text-center animate-fade-up">
      <div
        className="mx-auto mb-6 flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand)',
        }}
      >
        <Package size={36} strokeWidth={1.7} />
      </div>

      <h1
        className="font-display m-0 mb-3"
        style={{
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          color: 'var(--text-ink)',
        }}
      >
        {t('dashboard.supplier.title')}
      </h1>
      <p
        className="m-0 mb-2"
        style={{
          fontSize: 15.5,
          lineHeight: 1.7,
          color: 'var(--text-ink-soft)',
        }}
      >
        {t('dashboard.supplier.subtitle')}
      </p>
      <p
        className="m-0 mb-8 inline-flex items-center gap-2"
        style={{ fontSize: 13, color: 'var(--text-muted)' }}
      >
        <Wrench size={14} strokeWidth={1.7} />
        {t('dashboard.supplier.scope')}
      </p>

      <div
        className="p-6 rounded-[16px] mb-8 text-start"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <h3
          className="font-display m-0 mb-3"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-ink)',
          }}
        >
          {t('dashboard.supplier.bulletsTitle')}
        </h3>
        <ul className="m-0 p-0 space-y-3">
          <Bullet>{t('dashboard.supplier.bullets.b1')}</Bullet>
          <Bullet>{t('dashboard.supplier.bullets.b2')}</Bullet>
          <Bullet>{t('dashboard.supplier.bullets.b3')}</Bullet>
        </ul>
      </div>

      {!embedded && (
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 14,
            background: '#2c2f7c',
            border: '1px solid #2c2f7c',
            cursor: 'pointer',
            boxShadow: '0 6px 14px rgba(44,47,124,0.22)',
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
          <LayoutDashboard size={15} strokeWidth={1.8} />
          {t('dashboard.supplier.backToDashboard')}
        </button>
      )}
    </div>
  );

  if (embedded) {
    return <div className="py-12">{content}</div>;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label={t('nav.backHome')}
          >
            <Logo height={68} />
          </button>
          <div className="flex items-center gap-2">
            <LanguageThemeSwitcher compact />
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-canvas)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-surface)';
              }}
            >
              <LayoutDashboard size={15} strokeWidth={1.8} />
              {t('nav.dashboard')}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center px-6 py-12">{content}</main>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li
      className="list-none flex items-start gap-2.5"
      style={{
        fontSize: 13.5,
        color: 'var(--text-ink-soft)',
        lineHeight: 1.65,
      }}
    >
      <span
        className="flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(19,109,74,0.1)',
          color: '#136d4a',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
