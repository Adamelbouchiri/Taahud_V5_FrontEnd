import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  Partners — infinite logo marquee
 *  ----------------------------------------------------------------
 *  Sits right under the Hero and surfaces the logos of partner
 *  organizations / entities Taahud works with. Scrolls horizontally
 *  in a slow loop; hover pauses; prefers-reduced-motion disables.
 *
 *  Logos live in src/assets/partners/ and are picked up via
 *  import.meta.glob so adding/removing a file is enough — no
 *  explicit import list to maintain.
 * ============================================================ */

// Vite's glob import — pulls every image in /assets/partners. The
// keys are file paths; we sort them so the marquee order matches
// the numeric prefixes (01-..., 02-..., etc.).
const LOGO_MODULES = import.meta.glob(
  '../../assets/partners/*.{png,jpg,jpeg,svg}',
  { eager: true, import: 'default' }
);

const LOGOS = Object.keys(LOGO_MODULES)
  .sort()
  .map((path) => ({
    src: LOGO_MODULES[path],
    // Derive a readable alt from the filename slug.
    alt: path
      .split('/')
      .pop()
      .replace(/^\d+-/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' '),
  }));

export default function Partners() {
  const { t } = useTranslation();

  return (
    <section
      id="partners"
      className="relative py-14 lg:py-16 scroll-mt-20 overflow-x-clip"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 mb-8 lg:mb-10">
        <div className="text-center max-w-[680px] mx-auto">
          <h2
            className="font-display m-0 animate-fade-up"
            style={{
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.partners.title')}
          </h2>
        </div>
      </div>

      <div
        dir="ltr"
        className="relative"
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="partners-marquee">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div key={i} className="partners-tile">
              <img
                src={logo.src}
                alt={logo.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .partners-marquee {
          display: flex;
          flex-wrap: nowrap;
          width: max-content;
          direction: ltr;
          animation: partners-scroll 80s linear infinite;
          will-change: transform;
          align-items: center;
        }
        .partners-marquee:hover { animation-play-state: paused; }
        .partners-tile {
          flex-shrink: 0;
          width: 220px;
          height: 130px;
          margin-inline-end: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          transition: transform 0.25s;
        }
        .partners-tile:hover {
          transform: translateY(-2px);
        }
        .partners-tile img {
          height: 100%;
          width: auto;
          max-width: 100%;
          object-fit: contain;
          display: block;
          user-select: none;
        }
        @keyframes partners-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .partners-marquee { animation: none; }
        }
      `}</style>
    </section>
  );
}
