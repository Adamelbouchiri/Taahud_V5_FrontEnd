import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Gem, HardHat, Compass, Building2, Truck } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';

const DICTS = { ar: arDict, en: enDict, zh: zhDict };

/* ============================================================
 *  Plans — pricing
 *  ----------------------------------------------------------------
 *  Audience tabs × billing-period toggle × two tiers. Copy +
 *  feature bullets all come from i18n (`landing.plans.tiers.*`);
 *  only icons, accents, and the price-map structure live here.
 * ============================================================ */

const AUDIENCES = [
  { id: 'contractor', icon: HardHat },
  { id: 'engineering', icon: Compass },
  { id: 'developer', icon: Building2 },
  { id: 'supplier', icon: Truck },
];

const PERIODS = [
  { id: '6', months: 6 },
  { id: '12', months: 12, hasBadge: true },
];

export default function Plans() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [audience, setAudience] = useState('contractor');
  const [period, setPeriod] = useState('12');

  return (
    <section
      id="plans"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-center max-w-[680px] mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'rgba(58,61,153,0.08)',
              color: '#1f2258',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            {t('landing.plans.eyebrow')}
          </div>

          <h2
            className="font-display m-0 mb-4 animate-fade-up"
            style={{
              fontSize: 'clamp(30px, 4vw, 46px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.plans.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.plans.subtitle')}
          </p>
        </div>

        <div className="flex justify-center gap-2.5 mb-7 flex-wrap">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            const isActive = audience === aud.id;
            return (
              <button
                key={aud.id}
                type="button"
                onClick={() => setAudience(aud.id)}
                className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all whitespace-nowrap"
                style={{
                  fontSize: 13.5,
                  padding: '11px 20px',
                  background: isActive ? 'var(--bg-ink-deep)' : 'var(--bg-surface)',
                  color: isActive ? 'white' : 'var(--text-ink-soft)',
                  border: `1px solid ${isActive ? 'var(--bg-ink-deep)' : 'var(--border-default)'}`,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 8px 18px rgba(15,17,71,0.20)' : 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--bg-ink-deep)';
                    e.currentTarget.style.color = 'var(--bg-ink-deep)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.color = 'var(--text-ink-soft)';
                  }
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
                {t(`landing.plans.audiences.${aud.id}`)}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mb-12">
          <div
            className="inline-flex items-center p-1 rounded-[12px]"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            {PERIODS.map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className="inline-flex items-center gap-2 rounded-[9px] font-semibold transition-all"
                  style={{
                    fontSize: 13,
                    padding: '8px 18px',
                    background: isActive ? 'var(--bg-ink-deep)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t(`landing.plans.periods.${p.id}`)}
                  {p.hasBadge && (
                    <span
                      className="rounded-full font-bold"
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        background: isActive
                          ? 'rgba(201,163,90,0.30)'
                          : 'rgba(19,109,74,0.10)',
                        color: isActive ? '#f0c779' : '#0d5538',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {t('landing.plans.periods.saveBadge')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-[920px] mx-auto items-stretch">
          <PlanCard
            audience={audience}
            tier="basic"
            period={period}
            onChoose={() => navigate('/register')}
          />
          <PlanCard
            audience={audience}
            tier="premium"
            period={period}
            onChoose={() => navigate('/register')}
            featured
            includesBasic
          />
        </div>

        <div
          className="mt-10 p-6 lg:p-7 rounded-[16px] flex flex-col md:flex-row items-start md:items-center gap-5 animate-fade-up max-w-[920px] mx-auto"
          style={{
            background: 'var(--bg-callout-warm)',
            border: '1px solid var(--border-callout-warm)',
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(201,163,90,0.18)',
              color: '#c9a35a',
            }}
          >
            <Gem size={22} strokeWidth={1.7} />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="font-display font-bold mb-1"
              style={{ fontSize: 17, color: 'var(--text-ink)' }}
            >
              {t('landing.plans.addon.title')}
            </div>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                lineHeight: 1.7,
                color: 'var(--text-ink-soft)',
              }}
            >
              {t('landing.plans.addon.body', {
                price: t('landing.plans.addon.price'),
                threshold: t('landing.plans.addon.threshold'),
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  audience,
  tier,
  period,
  onChoose,
  featured,
  includesBasic,
}) {
  const { t, lang } = useTranslation();
  const kTier = `landing.plans.tiers.${audience}.${tier}`;
  const name = t(`landing.plans.${tier}`);
  const price = t(`${kTier}.prices.${period}`);
  const description = t(`${kTier}.description`);
  const periodLabel = t(`landing.plans.periods.${period}`);

  // Read features array from the dictionary. The lookup helper
  // returns the raw value for arrays, so we tolerate either a
  // pre-parsed array or a stringified one.
  const features = readArray(audience, tier, lang);

  const dailyCost = (() => {
    const totalDays = period === '12' ? 365 : 180;
    const numericPrice = parseInt(String(price).replace(/,/g, ''), 10);
    if (!numericPrice || isNaN(numericPrice)) return null;
    return Math.round(numericPrice / totalDays);
  })();

  return (
    <article
      className="relative p-7 lg:p-8 rounded-[18px] transition-all flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        border: featured ? '2px solid #0f1147' : '1px solid var(--border-default)',
        boxShadow: featured ? '0 24px 48px rgba(15,17,71,0.10)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!featured) {
          e.currentTarget.style.borderColor = 'var(--border-strong)';
          e.currentTarget.style.boxShadow = '0 14px 28px rgba(15,17,71,0.06)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!featured) {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {featured && (
        <div
          className="absolute font-bold"
          style={{
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-ink-deep)',
            color: 'white',
            fontSize: 11,
            padding: '5px 14px',
            borderRadius: 999,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          {t('landing.plans.mostPopular')}
        </div>
      )}

      <div
        className="font-display font-bold mb-2"
        style={{
          fontSize: 16,
          color: featured ? 'var(--bg-ink-deep)' : 'var(--text-muted)',
        }}
      >
        {name}
      </div>

      <p
        className="m-0 mb-6"
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--text-muted)',
        }}
      >
        {description}
      </p>

      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="font-display"
          style={{
            fontSize: 'clamp(38px, 4vw, 48px)',
            fontWeight: 700,
            color: 'var(--text-ink)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {price}
        </span>
        <span
          style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}
        >
          {t('common.currency')}
        </span>
      </div>
      <div className="mb-1" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        {t('landing.plans.forMonths', { value: periodLabel })}
      </div>

      {dailyCost !== null && (
        <div
          className="mb-6 inline-flex items-center gap-1.5"
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span
            className="rounded-full"
            style={{
              width: 5,
              height: 5,
              background: featured ? '#c9a35a' : '#136d4a',
            }}
          />
          {t('landing.plans.perDayApprox', {
            value: dailyCost,
            currency: t('common.currency'),
          })}
        </div>
      )}

      <ul className="m-0 p-0 mb-7 space-y-2.5 flex-1">
        {includesBasic && (
          <li
            className="list-none flex items-start gap-2"
            style={{
              fontSize: 13,
              color: 'var(--text-ink)',
              lineHeight: 1.55,
              fontWeight: 700,
              paddingBottom: 8,
              borderBottom: '1px dashed var(--border-default)',
              marginBottom: 8,
            }}
          >
            <Check
              size={14}
              strokeWidth={2.5}
              style={{
                color: 'var(--text-ink)',
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            <span>{t('landing.plans.includesBasic')}</span>
          </li>
        )}
        {features.map((f, i) => (
          <li
            key={i}
            className="list-none flex items-start gap-2"
            style={{
              fontSize: 13,
              color: 'var(--text-ink-soft)',
              lineHeight: 1.55,
            }}
          >
            <Check
              size={14}
              strokeWidth={2.5}
              style={{
                color: featured ? 'var(--bg-ink-deep)' : '#136d4a',
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onChoose}
        className="w-full font-semibold rounded-[10px] transition-all"
        style={{
          fontSize: 13.5,
          padding: '11px 16px',
          background: featured ? 'var(--bg-ink-deep)' : 'var(--bg-surface)',
          color: featured ? 'white' : 'var(--bg-ink-deep)',
          border: `1px solid ${featured ? 'var(--bg-ink-deep)' : 'var(--border-strong)'}`,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (featured) {
            e.currentTarget.style.background = 'var(--bg-ink-deep-hover)';
          } else {
            e.currentTarget.style.borderColor = 'var(--bg-ink-deep)';
            e.currentTarget.style.background = 'var(--bg-canvas)';
          }
        }}
        onMouseLeave={(e) => {
          if (featured) {
            e.currentTarget.style.background = 'var(--bg-ink-deep)';
          } else {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }
        }}
      >
        {t('landing.plans.cta', { name })}
      </button>
    </article>
  );
}

/* `t()` only returns strings — arrays are pulled straight from
   the dictionary module. Falls back to Arabic if the requested
   language is missing a key so we never render `[]`. */
function readArray(audience, tier, lang) {
  const dict = DICTS[lang] || DICTS.ar;
  try {
    return (
      dict.landing.plans.tiers[audience][tier].features ||
      DICTS.ar.landing.plans.tiers[audience][tier].features ||
      []
    );
  } catch {
    return [];
  }
}
