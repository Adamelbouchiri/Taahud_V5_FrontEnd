import React from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Percent,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  UpcomingFeatures — coming-soon teasers above the footer
 *  ----------------------------------------------------------------
 *  Two cards on a light band that breaks up the contrast between
 *  the dark CtaBanner and the footer.
 *
 *  - Taahud Academy: training + certifications.
 *  - Affiliate marketing: partners earn a percentage on every
 *    referred deal.
 *
 *  Both buttons are intentionally disabled — clicking them does
 *  nothing yet. The "coming soon" pill on each card is the visual
 *  hint that they aren't live.
 * ============================================================ */

const FEATURES = [
  {
    id: 'academy',
    icon: GraduationCap,
    accent: '#2c2f7c',
    accentSoft: 'rgba(44,47,124,0.10)',
  },
  {
    id: 'affiliate',
    icon: Percent,
    accent: '#b8862a',
    accentSoft: 'rgba(184,134,42,0.12)',
  },
];

export default function UpcomingFeatures() {
  const { t } = useTranslation();
  return (
    <section
      id="upcoming"
      className="relative py-24 lg:py-28 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-center max-w-[680px] mx-auto mb-12 lg:mb-14">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-ink-soft)',
            }}
          >
            <Sparkles size={12} strokeWidth={2} />
            {t('landing.upcoming.eyebrow')}
          </div>
          <h2
            className="font-display m-0 mb-3 animate-fade-up"
            style={{
              fontSize: 'clamp(28px, 3.8vw, 42px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.upcoming.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 14.5,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.upcoming.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={i * 0.06} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, delay, t }) {
  const Icon = feature.icon;
  const k = `landing.upcoming.${feature.id}`;

  return (
    <article
      className="relative flex flex-col rounded-[18px] p-8 lg:p-10 transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span
        className="absolute inline-flex items-center gap-1 font-bold rounded-full"
        style={{
          top: 18,
          insetInlineStart: 18,
          background: 'rgba(184,134,42,0.12)',
          color: '#8a6a1f',
          border: '1px solid rgba(184,134,42,0.25)',
          fontSize: 10.5,
          padding: '3px 9px',
          letterSpacing: '0.04em',
        }}
      >
        <Clock size={11} strokeWidth={2.2} />
        {t('common.soon')}
      </span>

      <div
        className="flex items-center justify-center mb-6"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: feature.accentSoft,
          color: feature.accent,
          alignSelf: 'flex-end',
        }}
      >
        <Icon size={26} strokeWidth={1.7} />
      </div>

      <div
        className="font-semibold uppercase mb-2 text-start"
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          color: feature.accent,
        }}
      >
        {t(`${k}.eyebrow`)}
      </div>

      <h3
        className="font-display m-0 mb-3 text-start"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-ink)',
          lineHeight: 1.25,
        }}
      >
        {t(`${k}.label`)}
      </h3>

      <p
        className="m-0 mb-7 text-start"
        style={{
          fontSize: 14,
          lineHeight: 1.85,
          color: 'var(--text-muted)',
        }}
      >
        {t(`${k}.desc`)}
      </p>

      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-auto inline-flex items-center justify-center gap-2 self-start font-semibold rounded-[12px] transition-colors"
        style={{
          padding: '11px 18px',
          fontSize: 13.5,
          background: feature.accentSoft,
          color: feature.accent,
          border: `1px solid ${feature.accent}33`,
          cursor: 'not-allowed',
          fontFamily: 'inherit',
          opacity: 0.95,
        }}
      >
        {t(`${k}.cta`)}
        <ArrowLeft size={14} strokeWidth={2} />
      </button>
    </article>
  );
}
