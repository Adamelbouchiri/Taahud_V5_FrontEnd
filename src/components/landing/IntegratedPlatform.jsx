import React from 'react';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  FileSignature,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  IntegratedPlatform — "منصة متكاملة" section
 *  ----------------------------------------------------------------
 *  Sits high on the landing page (right after the Hero) to make
 *  the "what is Taahud, exactly?" answer obvious before users
 *  scroll deeper. Four pillar cards in a single row on desktop,
 *  collapsing to a 2-column grid on tablet and 1-column on mobile.
 *
 *  Content lives in i18n under landing.integrated.*; only the
 *  icons + accent colors are wired here.
 * ============================================================ */

const PILLARS = [
  { key: 'verify',   icon: ShieldCheck,    accent: '#136d4a', accentSoft: 'rgba(19,109,74,0.10)' },
  { key: 'payments', icon: CreditCard,     accent: '#b8862a', accentSoft: 'rgba(184,134,42,0.12)' },
  { key: 'escrow',   icon: Lock,           accent: '#2c2f7c', accentSoft: 'rgba(44,47,124,0.10)' },
  { key: 'contracts',icon: FileSignature,  accent: '#3a3d99', accentSoft: 'rgba(58,61,153,0.10)' },
];

export default function IntegratedPlatform() {
  const { t } = useTranslation();
  return (
    <section
      id="platform"
      className="relative py-24 lg:py-28 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-center max-w-[820px] mx-auto mb-12 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-ink-soft)',
            }}
          >
            {t('landing.integrated.eyebrow')}
          </div>
          <h2
            className="font-display m-0 mb-4 animate-fade-up"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 38px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              color: '#0f1147',
            }}
          >
            {t('landing.integrated.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 14.5,
              lineHeight: 1.85,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.integrated.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => (
            <PillarCard key={p.key} pillar={p} delay={i * 0.05} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar, delay, t }) {
  const Icon = pillar.icon;
  const k = `landing.integrated.pillars.${pillar.key}`;
  return (
    <article
      className="flex flex-col rounded-[18px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: '24px 22px',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: pillar.accentSoft,
          color: pillar.accent,
          alignSelf: 'flex-start',
        }}
      >
        <Icon size={22} strokeWidth={1.85} />
      </div>
      <h3
        className="font-display m-0 mb-2"
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-ink)',
          lineHeight: 1.35,
        }}
      >
        {t(`${k}.title`)}
      </h3>
      <p
        className="m-0"
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: 'var(--text-muted)',
        }}
      >
        {t(`${k}.desc`)}
      </p>
    </article>
  );
}
