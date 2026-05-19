import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  HardHat,
  Building2,
  Compass,
  Truck,
  Gem,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';

const DICTS = { ar: arDict, en: enDict, zh: zhDict };

/* ============================================================
 *  Plans — V2 layout
 *  ----------------------------------------------------------------
 *  Three-stage selection:
 *
 *     1. Role tile   (المقاول / المكتب الهندسي / المطور / المورد)
 *     2. Tier toggle  (Basic / Premium)
 *     3. Period tier  (1 / 6 / 12 months)
 *
 *  Then we render two side-by-side panels:
 *
 *     Right (in RTL): the plan description + a short list of
 *                     "highlighted" features (the first 6).
 *     Left:           the full feature list, with category
 *                     dividers based on the existing flat array.
 *
 *  The Isnad add-on card sits below the two panels, and a single
 *  large CTA button finishes the section. Translations and the
 *  feature lists themselves still come from
 *  `landing.plans.tiers.{audience}.{tier}.features` so we can
 *  reuse the existing dictionary without restructuring it.
 * ============================================================ */

const AUDIENCES = [
  { id: 'contractor',  icon: HardHat },
  { id: 'engineering', icon: Compass },
  { id: 'developer',   icon: Building2 },
  { id: 'supplier',    icon: Truck },
];

// Highest period is the base for discount math.
const PERIODS = ['1', '6', '12'];

export default function Plans() {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const [audience, setAudience] = useState('contractor');
  const [tier, setTier] = useState('basic');
  const [period, setPeriod] = useState('1');

  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  // The feature list comes from the active dictionary directly
  // because t() only resolves leaf strings — arrays would otherwise
  // round-trip as their JSON form.
  const features = useMemo(() => {
    const dict = DICTS[lang] || DICTS.ar;
    return (
      dict?.landing?.plans?.tiers?.[audience]?.[tier]?.features || []
    );
  }, [lang, audience, tier]);

  // Same trick for price lookup — the dictionary holds nested
  // strings; we just walk it directly.
  const priceFor = (aud, tr, per) => {
    const dict = DICTS[lang] || DICTS.ar;
    return (
      dict?.landing?.plans?.tiers?.[aud]?.[tr]?.prices?.[per] || '—'
    );
  };

  const monthlyForRole = (aud) => priceFor(aud, 'basic', '1');

  return (
    <section
      id="plans"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-[760px] mx-auto mb-10 lg:mb-14">
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
            {t('landing.plans.eyebrow')}
          </div>
          <h2
            className="font-display m-0 mb-4 animate-fade-up"
            style={{
              fontSize: 'clamp(28px, 3.6vw, 42px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: '#0f1147',
            }}
          >
            {t('landing.plans.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 14.5,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.plans.subtitle')}
          </p>
        </div>

        {/* Role tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-7">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            const isActive = audience === aud.id;
            const tilePrice = monthlyForRole(aud.id);
            return (
              <button
                key={aud.id}
                type="button"
                onClick={() => {
                  setAudience(aud.id);
                  setPeriod('1');
                }}
                className="text-center transition-all"
                style={{
                  background: 'var(--bg-surface)',
                  border: `${isActive ? 2 : 1}px solid ${
                    isActive ? '#2c2f7c' : 'var(--border-default)'
                  }`,
                  borderRadius: 18,
                  padding: isActive ? '21px 18px' : '22px 19px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: isActive
                    ? '0 12px 24px rgba(44,47,124,0.14)'
                    : 'var(--shadow-card)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor =
                      'var(--border-strong)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor =
                      'var(--border-default)';
                  }
                }}
              >
                <div
                  className="flex items-center justify-center mb-3 mx-auto"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: isActive
                      ? 'rgba(44,47,124,0.10)'
                      : 'var(--bg-cream)',
                    color: isActive ? '#2c2f7c' : 'var(--text-muted)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.85} />
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-ink)',
                    marginBottom: 6,
                  }}
                >
                  {t(`landing.plans.audiences.${aud.id}`)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {t('landing.plans.startsFrom')}
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#0f1147',
                    lineHeight: 1.1,
                    margin: '2px 0',
                  }}
                >
                  {tilePrice}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('landing.plans.perMonth')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Premium / Basic toggle */}
        <div className="flex justify-center mb-6">
          <div
            className="inline-flex items-center p-1 rounded-[12px]"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            {['basic', 'premium'].map((tr) => {
              const isActive = tier === tr;
              return (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTier(tr)}
                  className="font-semibold transition-all"
                  style={{
                    fontSize: 13,
                    padding: '8px 22px',
                    background: isActive
                      ? tr === 'premium'
                        ? '#b8862a'
                        : '#2c2f7c'
                      : 'transparent',
                    color: isActive ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t(`landing.plans.${tr}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period tiers */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-[900px] mx-auto">
          {PERIODS.map((per) => {
            const isActive = period === per;
            const accent = tier === 'premium' ? '#b8862a' : '#2c2f7c';
            const accentSoft =
              tier === 'premium'
                ? 'rgba(184,134,42,0.10)'
                : 'rgba(44,47,124,0.10)';
            const monthly = priceFor(audience, tier, '1');
            const periodPrice = priceFor(audience, tier, per);
            // Discount % vs. taking 1 month × N months at headline rate.
            let discountPct = null;
            const m = parseFloat(String(monthly).replace(/[^\d.]/g, ''));
            const p = parseFloat(String(periodPrice).replace(/[^\d.]/g, ''));
            const months = parseInt(per, 10);
            if (m > 0 && p > 0 && months > 1) {
              const sticker = m * months;
              const pct = ((sticker - p) / sticker) * 100;
              if (pct > 0) discountPct = pct.toFixed(1);
            }
            return (
              <button
                key={per}
                type="button"
                onClick={() => setPeriod(per)}
                className="text-center transition-all"
                style={{
                  background: 'var(--bg-surface)',
                  border: `${isActive ? 2 : 1}px solid ${
                    isActive ? accent : 'var(--border-default)'
                  }`,
                  borderRadius: 14,
                  padding: isActive ? '13px 14px' : '14px 15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: isActive
                    ? `0 8px 18px ${accentSoft}`
                    : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive ? accent : 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t(`landing.plans.periodLabels.${per}`)}
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-ink)',
                    lineHeight: 1.15,
                  }}
                >
                  {periodPrice}
                </div>
                <div
                  className="mt-1"
                  style={{ fontSize: 11, color: 'var(--text-muted)' }}
                >
                  {t('landing.plans.perMonthShort')}
                </div>
                {discountPct && (
                  <div
                    className="mt-2 inline-flex"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(19,109,74,0.10)',
                      color: '#136d4a',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t('landing.plans.saveX', { value: discountPct })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Two-panel feature content */}
        <FeaturePanels
          audience={audience}
          tier={tier}
          features={features}
          t={t}
          lang={lang}
        />

        {/* Isnad addon */}
        <div
          className="mt-7 rounded-[16px] flex flex-col md:flex-row items-start md:items-center gap-5 max-w-[900px] mx-auto animate-fade-up"
          style={{
            background: 'var(--bg-callout-warm)',
            border: '1px solid var(--border-callout-warm)',
            padding: '20px 22px',
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="font-bold rounded-full"
                style={{
                  fontSize: 10.5,
                  padding: '2px 9px',
                  background: 'rgba(184,134,42,0.18)',
                  color: '#8a6a1f',
                  letterSpacing: '0.04em',
                }}
              >
                {t('landing.plans.addon.eyebrow')}
              </span>
              <span
                className="font-display font-bold"
                style={{ fontSize: 15, color: 'var(--text-ink)' }}
              >
                {t('landing.plans.addon.title')}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
              {t('landing.plans.addon.body', {
                price: t('landing.plans.addon.price'),
                threshold: t('landing.plans.addon.threshold'),
              })}
            </div>
          </div>
          <div
            className="flex flex-col items-end flex-shrink-0"
            style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}
          >
            <div
              className="font-display"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#8a6a1f',
                lineHeight: 1,
              }}
            >
              {t('landing.plans.addon.price')}
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}
            >
              {t('landing.plans.perMonthShort')}
            </div>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="mt-3 inline-flex items-center gap-1.5 font-semibold"
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: '#8a6a1f',
                border: '1px solid rgba(184,134,42,0.40)',
                borderRadius: 10,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('landing.plans.addon.cta')}
            </button>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 max-w-[900px] mx-auto">
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full inline-flex items-center justify-center gap-2 font-semibold transition-all"
            style={{
              padding: '15px 26px',
              fontSize: 15,
              background: '#0f1147',
              color: 'white',
              border: '1px solid #0f1147',
              borderRadius: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 10px 22px rgba(15,17,71,0.22)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.background = '#1a1d5e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = '#0f1147';
            }}
          >
            {tier === 'premium'
              ? t('landing.plans.choosePremium')
              : t('landing.plans.chooseBasic')}
            <Arrow size={16} strokeWidth={2} />
          </button>
          <div
            className="text-center mt-3"
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
          >
            {t('landing.plans.bottomNote')}
          </div>
        </div>
      </div>
    </section>
  );
}


/* ============================================================
 *  FeaturePanels
 *  ----------------------------------------------------------------
 *  Two-column feature breakdown. Right panel shows the plan
 *  description + highlighted features (first 6 from the flat
 *  list). Left panel shows every feature in a single column.
 *
 *  Above lg the columns sit side-by-side; below lg they stack so
 *  the right panel stays the "primary" reading order.
 * ============================================================ */
function FeaturePanels({ audience, tier, features, t, lang }) {
  const dict = DICTS[lang] || DICTS.ar;
  const description =
    dict?.landing?.plans?.tiers?.[audience]?.[tier]?.description || '';
  const accent = tier === 'premium' ? '#b8862a' : '#2c2f7c';
  const accentSoft =
    tier === 'premium' ? 'rgba(184,134,42,0.10)' : 'rgba(44,47,124,0.10)';

  // Split features into highlighted (first 6) and full list.
  const highlights = features.slice(0, 6);

  return (
    <div className="grid lg:grid-cols-2 gap-4 max-w-[1100px] mx-auto">
      {/* Highlights panel — primary */}
      <article
        className="rounded-[18px]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '22px 24px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-bold rounded-full"
            style={{
              fontSize: 11,
              padding: '3px 10px',
              background: accentSoft,
              color: accent,
              letterSpacing: '0.04em',
            }}
          >
            {tier === 'premium'
              ? t('landing.plans.premium')
              : t('landing.plans.basic')}
          </span>
        </div>
        <p
          className="m-0 mb-5 p-3 rounded-[12px]"
          style={{
            fontSize: 13,
            lineHeight: 1.75,
            color: 'var(--text-ink-soft)',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-soft)',
          }}
        >
          {description}
        </p>

        <div
          className="font-semibold uppercase mb-3"
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
          }}
        >
          {t('landing.plans.highlights')}
        </div>
        <ul className="m-0 p-0 flex flex-col gap-2.5">
          {highlights.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 list-none"
              style={{ fontSize: 13.5, color: 'var(--text-ink-soft)' }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: accentSoft,
                  color: accent,
                  marginTop: 1,
                }}
              >
                <Check size={12} strokeWidth={2.6} />
              </span>
              <span style={{ lineHeight: 1.55 }}>{f}</span>
            </li>
          ))}
        </ul>
      </article>

      {/* Full features panel */}
      <article
        className="rounded-[18px]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '22px 24px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          className="font-semibold uppercase mb-4"
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
          }}
        >
          {t('landing.plans.allFeatures')}
        </div>
        <ul
          className="m-0 p-0 flex flex-col gap-2 overflow-y-auto"
          style={{ maxHeight: 420 }}
          data-on-surface="true"
        >
          {features.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 list-none"
              style={{ fontSize: 13, color: 'var(--text-ink-soft)' }}
            >
              <span
                className="flex-shrink-0"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: accent,
                  marginTop: 8,
                }}
              />
              <span style={{ lineHeight: 1.6 }}>{f}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
