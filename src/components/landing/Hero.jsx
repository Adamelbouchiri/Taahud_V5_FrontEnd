import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  Hero — landing page first viewport
 *  ----------------------------------------------------------------
 *  Centered layout:
 *    - Pill with green dot (landing.hero.pill)
 *    - Headline: a fixed first line («حلول رقمية») and a gold second
 *      line that rotates through ROTATE_KEYS; the subtitle under it
 *      rotates in step, so each line keeps its own explanation
 *    - Two CTAs: free trial → /register, «how it works» → #how
 *    - Trial note, then the «3,500+ active projects» pill
 *
 *  Rotating lines are stacked in one grid cell rather than absolutely
 *  positioned, so the box is always as tall as the longest line in
 *  the current language — no hand-tuned min-height per locale.
 *
 *  Background: faint perpendicular grid lines for the technical /
 *  blueprint feel.
 * ============================================================ */

const ROTATE_KEYS = ['sector', 'opportunity', 'agreement', 'payment', 'manage', 'market'];
const ROTATE_MS = 4200;

function useRotation(count) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || count < 2) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [count]);
  return index;
}

export default function Hero() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const active = useRotation(ROTATE_KEYS.length);
  // The outgoing line leaves upward while the next one rises in.
  const prev = (active - 1 + ROTATE_KEYS.length) % ROTATE_KEYS.length;
  const rotClass = (i) => (i === active ? 'on' : i === prev ? 'out' : '');

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

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 pt-[120px] lg:pt-[150px] pb-14 lg:pb-20">
        <div className="text-center max-w-[880px] mx-auto">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full animate-fade-up"
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

          {/* Headline — fixed line + rotating gold line */}
          <h1
            className="font-display m-0 mb-6 animate-fade-up"
            aria-live="polite"
            style={{
              fontSize: 'clamp(34px, 5.4vw, 70px)',
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--text-ink)',
            }}
          >
            <span className="block">{t('landing.hero.titleFixed')}</span>
            <span className="hero-rot" style={{ color: '#c9a35a' }}>
              {ROTATE_KEYS.map((k, i) => (
                <span key={k} className={rotClass(i)} aria-hidden={i !== active}>
                  {t(`landing.hero.rotate.${k}.title`)}
                </span>
              ))}
            </span>
          </h1>

          {/* Subtitle — rotates with the headline */}
          <p
            className="hero-rot hero-rot-sub m-0 animate-fade-up max-w-[720px] mx-auto"
            style={{
              fontSize: 'clamp(15px, 1.4vw, 17px)',
              lineHeight: 1.9,
              color: 'var(--text-ink-soft)',
            }}
          >
            {ROTATE_KEYS.map((k, i) => (
              <span key={k} className={rotClass(i)} aria-hidden={i !== active}>
                {t(`landing.hero.rotate.${k}.sub`)}
              </span>
            ))}
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap mt-10 lg:mt-12 animate-fade-up">
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
              {t('landing.hero.ctaTrial')}
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('how');
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
              {t('landing.hero.ctaHow')}
            </button>
          </div>

          {/* Trial note */}
          <p className="m-0 mt-4 animate-fade-up" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {t('landing.hero.note')} ·{' '}
            <b style={{ color: 'var(--text-ink)', fontWeight: 700 }}>{t('landing.hero.noteStrong')}</b>
          </p>

          {/* Active projects pill */}
          <div
            className="inline-flex items-center gap-2.5 mt-8 rounded-full animate-fade-up"
            style={{
              padding: '9px 18px 9px 14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 6px 18px -12px rgba(0,20,128,0.35)',
            }}
          >
            <span
              className="grid place-items-center rounded-full flex-none"
              style={{
                width: 28,
                height: 28,
                background: 'rgba(15,17,71,0.07)',
                color: 'var(--text-ink)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3.5 20.5h17" />
                <path d="M6 20.5V9.5l6-4 6 4v11" />
                <path d="M10 20.5v-5h4v5" />
              </svg>
            </span>
            <b
              dir="ltr"
              className="font-display inline-flex items-baseline"
              style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1, gap: 1 }}
            >
              {t('landing.hero.activeProjects.value')}
              <i style={{ fontStyle: 'normal', fontSize: '0.8em', color: '#b08a3e', fontWeight: 800 }}>+</i>
            </b>
            <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              {t('landing.hero.activeProjects.label')}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .hero-rot {
          display: grid;
        }
        .hero-rot > span {
          grid-area: 1 / 1;
          opacity: 0;
          transform: translateY(0.25em);
          filter: blur(5px);
          transition: opacity .55s cubic-bezier(.22,.61,.36,1),
                      transform .55s cubic-bezier(.22,.61,.36,1),
                      filter .55s;
          pointer-events: none;
        }
        .hero-rot > span.out {
          transform: translateY(-0.25em);
        }
        .hero-rot > span.on {
          opacity: 1;
          transform: none;
          filter: none;
          pointer-events: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-rot > span { transition: none; filter: none; transform: none; }
        }
      `}</style>
    </section>
  );
}
