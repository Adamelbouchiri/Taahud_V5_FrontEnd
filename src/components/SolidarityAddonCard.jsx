import React from 'react';
import { Users, Check, Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import arDict from '../i18n/dictionaries/ar';
import enDict from '../i18n/dictionaries/en';
import zhDict from '../i18n/dictionaries/zh';
import urDict from '../i18n/dictionaries/ur';

const DICTS = { ar: arDict, en: enDict, zh: zhDict, ur: urDict };

/* ============================================================
 *  SolidarityAddonCard
 *  ----------------------------------------------------------------
 *  Promo box for the التضامن (solidarity) arena add-on. Used on the
 *  landing page and the dashboard subscribe page. Copy lives under
 *  the `solidarityAddon` dictionary key; `tags` and `bullets` are
 *  arrays, so they're read straight from the active dict (t() only
 *  resolves leaf strings).
 *
 *  Props:
 *    onSubscribe — handler for the "Subscribe now" button
 *    onExplore   — handler for the "Explore the arena" footer link
 *    busy        — disables the subscribe button while a checkout is
 *                  in flight
 * ============================================================ */
const ACCENT = '#8a6a1f';
const ACCENT_SOFT = 'rgba(184,134,42,0.12)';

export default function SolidarityAddonCard({ onSubscribe, onExplore, busy = false }) {
  const { t, lang, dir } = useTranslation();
  const copy = (DICTS[lang] || DICTS.ar)?.solidarityAddon || {};
  const tags = Array.isArray(copy.tags) ? copy.tags : [];
  const bullets = Array.isArray(copy.bullets) ? copy.bullets : [];
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="text-start mb-6">
        <div
          className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
          style={{
            background: ACCENT_SOFT,
            color: ACCENT,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {t('solidarityAddon.eyebrow')}
        </div>
        <h2
          className="font-display m-0 mb-3"
          style={{
            fontSize: 'clamp(24px, 3.2vw, 36px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
            color: 'var(--text-brand-deep)',
          }}
        >
          {t('solidarityAddon.title')}
        </h2>
        <p
          className="m-0 max-w-[680px]"
          style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--text-muted)' }}
        >
          {t('solidarityAddon.subtitle')}
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-[18px] flex flex-col md:flex-row gap-6 md:gap-7"
        style={{
          background: 'var(--bg-callout-warm)',
          border: '1px solid var(--border-callout-warm)',
          padding: '24px 24px 26px',
        }}
      >
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span
              className="font-bold rounded-full"
              style={{
                fontSize: 11,
                padding: '3px 10px',
                background: ACCENT_SOFT,
                color: ACCENT,
                letterSpacing: '0.04em',
              }}
            >
              {t('solidarityAddon.cardChip')}
            </span>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: ACCENT_SOFT,
                color: ACCENT,
              }}
            >
              <Users size={22} strokeWidth={1.7} />
            </div>
          </div>

          <h3
            className="font-display m-0 mb-2.5"
            style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {t('solidarityAddon.cardTitle')}
          </h3>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    background: 'rgba(184,134,42,0.08)',
                    color: ACCENT,
                    border: '1px solid rgba(184,134,42,0.2)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p
            className="m-0 mb-4"
            style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-ink-soft)' }}
          >
            {t('solidarityAddon.cardDesc')}
          </p>

          <ul className="m-0 p-0 flex flex-col gap-2.5">
            {bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 list-none"
                style={{ fontSize: 13, color: 'var(--text-ink-soft)' }}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 19,
                    height: 19,
                    borderRadius: 6,
                    background: ACCENT_SOFT,
                    color: ACCENT,
                    marginTop: 1,
                  }}
                >
                  <Check size={11} strokeWidth={2.6} />
                </span>
                <span style={{ lineHeight: 1.55 }}>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div
          className="flex flex-col flex-shrink-0 w-full md:w-[280px] rounded-[14px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(184,134,42,0.22)',
            padding: '18px 18px 16px',
          }}
        >
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {t('solidarityAddon.priceLabel')}
          </div>
          <div className="flex items-baseline gap-1.5 mt-1 mb-0.5">
            <span
              className="font-display"
              style={{ fontSize: 30, fontWeight: 700, color: ACCENT, lineHeight: 1 }}
            >
              {t('solidarityAddon.price')}
            </span>
            <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>
              {t('solidarityAddon.currency')}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('solidarityAddon.priceNote')}
          </div>

          <button
            type="button"
            onClick={onSubscribe}
            disabled={busy}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-all"
            style={{
              padding: '12px 16px',
              fontSize: 13.5,
              background: busy ? '#b8a878' : ACCENT,
              color: 'white',
              border: `1px solid ${busy ? '#b8a878' : ACCENT}`,
              cursor: busy ? 'wait' : 'pointer',
              boxShadow: busy ? 'none' : '0 6px 14px rgba(138,106,31,0.28)',
              fontFamily: 'inherit',
            }}
          >
            {t('solidarityAddon.subscribeCta')}
          </button>

          {/* Incentive sub-box */}
          <div
            className="mt-3 rounded-[10px] flex items-start gap-2.5"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
              padding: '11px 12px',
            }}
          >
            <Star
              size={15}
              strokeWidth={1.9}
              style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }}
            />
            <div className="min-w-0">
              <div
                className="font-bold mb-0.5"
                style={{ fontSize: 12, color: 'var(--text-ink)' }}
              >
                {t('solidarityAddon.incentiveTitle')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {t('solidarityAddon.incentiveBody')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explore link */}
      {onExplore && (
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 font-semibold transition-colors"
            style={{
              fontSize: 13,
              color: ACCENT,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('solidarityAddon.explore')}
            <Arrow size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
