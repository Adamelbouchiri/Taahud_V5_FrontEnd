import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import { auth } from '../../services';
import { hasToken } from '../../services/session';
import { AUDIENCES, usePlansCatalog } from './plansCatalog';

/* ============================================================
 *  Plans — landing «باقة مناسبة لكل دور»
 *  ----------------------------------------------------------------
 *  A short strip, not the full picker: one card per role with its
 *  live «يبدأ من» price, and a button to /pricing where the tiers,
 *  periods, features and add-ons live.
 *
 *  Prices come from the public catalog (plansCatalog.js) with the
 *  dictionary as fallback. Individuals use the platform for free, so
 *  a signed-in individual doesn't see the strip at all.
 * ============================================================ */

export default function Plans() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const catalog = usePlansCatalog(lang);
  const hidden = useHiddenForIndividual();

  if (hidden) return null;

  return (
    <section
      id="plans"
      className="relative py-16 lg:py-[72px] scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-7">
          <div>
            <h2
              className="font-display m-0 animate-fade-up"
              style={{
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.25,
                color: 'var(--text-ink)',
              }}
            >
              {t('landing.plans.title')}
            </h2>
            <p
              className="m-0 mt-1.5 animate-fade-up"
              style={{ fontSize: 17, lineHeight: 1.8, color: 'var(--text-muted)' }}
            >
              {t('landing.plans.briefSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center rounded-[12px] font-semibold transition-all"
            style={{
              fontSize: 14.5,
              padding: '13px 24px',
              background: 'var(--bg-ink-deep)',
              color: 'white',
              border: '1px solid var(--bg-ink-deep)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-ink-deep-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-ink-deep)')}
          >
            {t('landing.plans.seeAll')}
          </button>
        </div>

        <div className="pb-grid">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            return (
              <button
                key={aud.id}
                type="button"
                className="pb-card animate-fade-up"
                onClick={() => navigate(`/pricing?role=${aud.id}`)}
              >
                <Icon size={24} strokeWidth={1.6} style={{ color: '#a77f33', marginBottom: 8 }} />
                <b>{t(`landing.plans.audiences.${aud.id}`)}</b>
                <span>{t('landing.plans.startsFrom')}</span>
                <strong className="font-display">{catalog.startsFrom(aud.id)}</strong>
                <small>{t('landing.plans.perMonth')}</small>
              </button>
            );
          })}
        </div>

        <p
          className="m-0 mt-5 text-center"
          style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-muted)' }}
        >
          {t('landing.plans.briefNote')}
        </p>
      </div>

      <style>{`
        .pb-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 860px) { .pb-grid { grid-template-columns: repeat(2, 1fr); } }
        .pb-card {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          display: grid;
          gap: 2px;
          text-align: start;
          padding: 22px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          transition: border-color .15s, transform .15s, box-shadow .15s;
        }
        .pb-card:hover {
          border-color: var(--bg-ink-deep);
          transform: translateY(-2px);
          box-shadow: 0 14px 30px -22px rgba(20,22,63,.45);
        }
        .pb-card:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 2px; }
        .pb-card b { font-size: 18px; font-weight: 700; color: var(--text-ink); }
        .pb-card span { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
        .pb-card strong { font-size: 40px; font-weight: 700; line-height: 1.1; color: var(--text-ink); }
        .pb-card small { font-size: 13px; color: var(--text-muted); }
      `}</style>
    </section>
  );
}

/* Signed-in individuals are on the free tier — no plans to sell
   them. Hidden while their profile loads, so the strip doesn't flash
   in and vanish. Guests never hit the API. */
function useHiddenForIndividual() {
  const signedIn = typeof window !== 'undefined' && hasToken();
  const [hidden, setHidden] = useState(signedIn);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    auth
      .me()
      .then((me) => {
        if (!cancelled) setHidden(me?.account_type === 'individual');
      })
      .catch(() => {
        if (!cancelled) setHidden(false);
      });
    return () => {
      cancelled = true;
    };
    // signedIn is read from storage and stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hidden;
}
