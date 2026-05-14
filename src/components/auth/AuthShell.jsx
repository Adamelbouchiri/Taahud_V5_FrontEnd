import React from 'react';
import { ChevronLeft } from 'lucide-react';
import BrandPanel from './BrandPanel';
import Logo from '../Logo';

export default function AuthShell({
  kicker,
  title,
  subtitle,
  onBack,
  children,
}) {
  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <main className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12 relative">
        {/* Mobile-only logo (lg-and-up users see it in the BrandPanel) */}
        <div className="lg:hidden absolute top-6 end-6 animate-fade-up">
          <Logo height={42} />
        </div>

        <div className="w-full max-w-[460px] mt-8 animate-fade-up">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 mb-5 rounded-full bg-white border border-app-border text-ink-soft text-[13px] font-medium hover:border-muted transition-colors"
            >
              <ChevronLeft size={16} className="rotate-180" />
              <span>رجوع</span>
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
            className="font-display text-ink m-0 mb-2.5"
            style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15 }}
          >
            {title}
          </h2>

          {subtitle && (
            <p className="text-muted m-0 mb-8" style={{ fontSize: 15, lineHeight: 1.6 }}>
              {subtitle}
            </p>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
