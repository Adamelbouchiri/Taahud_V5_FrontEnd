import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  Hero — landing page first viewport
 *  ----------------------------------------------------------------
 *  Centered layout (per screenshots):
 *    - Pill with green dot (i18n key landing.hero.pill)
 *    - Massive two-line serif headline, second line in gold
 *    - Subtitle paragraph
 *    - Two CTAs side by side
 *    - Stats strip baked into the same viewport — no separate
 *      stats section
 *
 *  Background: faint perpendicular grid lines for the technical /
 *  blueprint feel.
 * ============================================================ */

const STAT_KEYS = ['support', 'satisfaction', 'projects', 'contractors'];

export default function Hero() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'var(--bg-canvas)' }}
    >
      {/* Faint grid background — fades out near edges via radial mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(15,17,71,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15,17,71,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          // Fade the grid out near the section edges so the lines feel
          // like they're emanating from the center rather than tiling
          // edge-to-edge. Both prefixed and standard properties for
          // wider browser support.
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
          maskImage:
            'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
        }}
      />

      {/* Soft radial spotlight under the headline */}
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background:
            'radial-gradient(ellipse, rgba(19,109,74,0.06), transparent 70%)',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 pt-[120px] lg:pt-[160px] pb-14 lg:pb-20">
        <div className="text-center max-w-[820px] mx-auto">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-ink-soft)',
              boxShadow: '0 2px 8px rgba(15,17,41,0.04)',
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: '#136d4a',
                boxShadow: '0 0 0 3px rgba(19,109,74,0.15)',
              }}
            />
            {t('landing.hero.pill')}
          </div>

          {/* Headline */}
          <h1
            className="font-display m-0 mb-6 animate-fade-up"
            style={{
              fontSize: 'clamp(40px, 6.4vw, 84px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.hero.titleLine1')}
            <br />
            <span style={{ color: '#c9a35a' }}>{t('landing.hero.titleLine2')}</span>
          </h1>

          {/* Subtitle */}
          <p
            className="m-0 mb-9 animate-fade-up max-w-[640px] mx-auto"
            style={{
              fontSize: 'clamp(15px, 1.4vw, 17.5px)',
              lineHeight: 1.75,
              color: 'var(--text-ink-soft)',
            }}
          >
            {t('landing.hero.subtitle')}
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-14 lg:mb-16 animate-fade-up">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
              style={{
                fontSize: 14.5,
                padding: '13px 24px',
                background: 'var(--bg-ink-deep)',
                color: 'white',
                border: '1px solid var(--bg-ink-deep)',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(15,17,71,0.20)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-ink-deep-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-ink-deep)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Sparkles size={15} strokeWidth={2} />
              {t('landing.hero.ctaPrimary')}
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('services');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
              style={{
                fontSize: 14.5,
                padding: '13px 24px',
                background: 'var(--bg-surface)',
                color: 'var(--text-ink-soft)',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--bg-ink-deep)';
                e.currentTarget.style.color = 'var(--bg-ink-deep)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-ink-soft)';
              }}
            >
              <Compass size={15} strokeWidth={1.8} />
              {t('landing.hero.ctaSecondary')}
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-12 max-w-[800px] mx-auto animate-fade-up">
            {STAT_KEYS.map((k) => (
              <div key={k} className="text-center">
                <div
                  className="font-display"
                  style={{
                    fontSize: 'clamp(28px, 3.4vw, 40px)',
                    fontWeight: 700,
                    color: 'var(--text-ink)',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t(`landing.hero.stats.${k}.value`)}
                </div>
                <div
                  className="mt-2"
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  {t(`landing.hero.stats.${k}.label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
