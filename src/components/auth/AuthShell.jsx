import React from 'react';
import { ChevronLeft } from 'lucide-react';
import BrandPanel from './BrandPanel';
import Logo from '../Logo';
import LanguageThemeSwitcher from '../LanguageThemeSwitcher';
import { useTranslation } from '../../i18n/LanguageContext';

export default function AuthShell({
  kicker,
  title,
  subtitle,
  onBack,
  children,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <main className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12 relative">
        {/* Top-end controls: language/theme switcher + mobile logo */}
        <div className="absolute top-6 end-6 flex items-center gap-2 animate-fade-up">
          <LanguageThemeSwitcher compact />
          <span className="lg:hidden">
            <Logo height={42} />
          </span>
        </div>

        <div className="w-full max-w-[460px] mt-8 animate-fade-up">
          {onBack && (
            <button
              onClick={onBack}
              // flex + w-fit so the button takes its own line (content-width)
              // instead of flowing inline next to the kicker pill below it —
              // inline-flex let the two pills sit side by side and touch.
              className="flex w-fit items-center gap-1.5 px-3.5 py-2 mb-5 rounded-full text-[13px] font-medium transition-colors"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border-strong)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border-default)')
              }
            >
              <ChevronLeft size={16} className="rotate-180" />
              <span>{t('auth.shell.back')}</span>
            </button>
          )}

          {kicker && (
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(19,109,74,0.08)',
                color: '#0d5538',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span className="bg-secondary w-1.5 h-1.5 rounded-full" />
              {kicker}
            </div>
          )}

          <h2
            className="font-display m-0 mb-2.5"
            style={{
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--text-ink)',
            }}
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className="m-0 mb-8"
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
              }}
            >
              {subtitle}
            </p>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
