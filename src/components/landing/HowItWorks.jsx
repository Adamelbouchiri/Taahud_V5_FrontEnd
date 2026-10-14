import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  HowItWorks — «كيف تعمل تعاهُد؟», three numbered steps
 *  ----------------------------------------------------------------
 *  Sits under Partners. id="how" is the target of the hero's
 *  «كيف تعمل المنصة؟» button (and of /#how links).
 *
 *  The arrow between cards follows the reading direction (← in
 *  RTL, → in LTR) and turns ↓ once the cards stack on mobile. The
 *  last step's number is gold — it's the step where you get paid.
 * ============================================================ */

const STEP_KEYS = ['register', 'browse', 'deliver'];

export default function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section
      id="how"
      className="relative py-16 lg:py-[72px] scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-center max-w-[680px] mx-auto mb-9">
          <h2
            className="font-display m-0 animate-fade-up"
            style={{
              fontSize: 'clamp(26px, 3vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.25,
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.how.title')}
          </h2>
          <p
            className="m-0 mt-2 animate-fade-up"
            style={{ fontSize: 16.5, lineHeight: 1.8, color: 'var(--text-muted)' }}
          >
            {t('landing.how.subtitle')}
          </p>
        </div>

        <ol className="how-steps">
          {STEP_KEYS.map((k, i) => (
            <li key={k} className="how-step animate-fade-up">
              <span className="how-n font-display">{i + 1}</span>
              <h3>{t(`landing.how.steps.${k}.title`)}</h3>
              <p>{t(`landing.how.steps.${k}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        .how-steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .how-step {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 18px;
          padding: 26px 24px 24px;
        }
        .how-step + .how-step::before {
          content: "→";
          position: absolute;
          inset-inline-start: -15px;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--bg-canvas);
          border: 1px solid var(--border-default);
          display: grid;
          place-items: center;
          font-size: 13px;
          color: #b08a3e;
          z-index: 1;
        }
        [dir="rtl"] .how-step + .how-step::before { content: "←"; }
        .how-n {
          display: inline-grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: var(--bg-ink-deep);
          color: #fff;
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 14px;
        }
        .how-step:last-child .how-n {
          background: #c9a35a;
          color: #14163f;
        }
        .how-step h3 {
          font-size: 19px;
          font-weight: 700;
          margin: 0 0 6px;
          color: var(--text-ink);
        }
        .how-step p {
          margin: 0;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.75;
        }
        @media (max-width: 860px) {
          .how-steps { grid-template-columns: 1fr; }
          .how-step + .how-step::before,
          [dir="rtl"] .how-step + .how-step::before {
            content: "↓";
            inset-inline-start: 50%;
            top: -15px;
            transform: translateX(-50%);
          }
          [dir="rtl"] .how-step + .how-step::before { transform: translateX(50%); }
        }
      `}</style>
    </section>
  );
}
