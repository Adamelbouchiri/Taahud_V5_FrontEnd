import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  HardHat,
  Building2,
  Compass,
  Truck,
  Gem,
  Crown,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { subscriptions, auth } from '../../services';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';
import urDict from '../../i18n/dictionaries/ur';

const DICTS = { ar: arDict, en: enDict, zh: zhDict, ur: urDict };

/* ============================================================
 *  Plans — landing section
 *  ----------------------------------------------------------------
 *  Two render paths, decided by auth state:
 *
 *    Guest (no token)  → the static marketing picker (audience tile
 *                        → tier toggle → period tier), with prices
 *                        and features pulled from the i18n
 *                        dictionaries. See GuestPlansBody.
 *
 *    Authenticated     → live plans from GET /plans, which the
 *                        backend already scopes to the user's
 *                        account_type (+ the universal Isnad add-on).
 *                        Rendered as a card grid. See AuthPlansBody.
 *
 *  The section header and the subscription-status banner are shared
 *  by both paths.
 * ============================================================ */

const AUDIENCES = [
  { id: 'contractor',  icon: HardHat },
  { id: 'engineering', icon: Compass },
  { id: 'developer',   icon: Building2 },
  { id: 'supplier',    icon: Truck },
];

// Highest period is the base for discount math.
const PERIODS = ['1', '6', '12'];

// account_type (from the API/user) → landing dictionary audience key.
const AUDIENCE_BY_ACCOUNT_TYPE = {
  entrepreneur: 'contractor',
  contractor: 'contractor',
  engineering: 'engineering',
  developer: 'developer',
  supplier: 'supplier',
};

export default function Plans() {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const data = usePlansData();

  // Individuals use the platform for free — they never need a plan, so the
  // whole section (header, status banner, plans) is hidden for them. While
  // an authed visitor's profile is still loading we hold the section back
  // rather than flash plans that would then vanish once we learn they're
  // an individual. Guests (data.auth === false) fall straight through to
  // the static marketing view.
  if (data.auth && data.loading) return null;
  if (data.auth && data.user?.account_type === 'individual') return null;

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
              color: 'var(--text-brand-deep)',
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

        {/* Subscription status banner — only renders for authenticated
            users (uses /api/subscriptions/me). Three variants: active
            base sub, trial in progress, trial expired. Guests see
            nothing here and continue to the normal plans flow. */}
        <SubscriptionStatusCard
          status={data.status}
          lang={lang}
          t={t}
          onNavigate={navigate}
        />

        {data.auth ? (
          <AuthPlansBody
            t={t}
            lang={lang}
            navigate={navigate}
            loading={data.loading}
            plans={data.plans}
            status={data.status}
            user={data.user}
            error={data.error}
          />
        ) : (
          <GuestPlansBody t={t} lang={lang} dir={dir} navigate={navigate} />
        )}
      </div>
    </section>
  );
}


/* ============================================================
 *  GuestPlansBody — the static marketing picker
 *  ----------------------------------------------------------------
 *  Unchanged behavior from the original component: a three-stage
 *  selection (role tile → tier toggle → period tier) with prices and
 *  feature lists read directly from the active dictionary. No API
 *  calls — this is what an anonymous visitor sees.
 * ============================================================ */
function GuestPlansBody({ t, lang, dir, navigate }) {
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
    <>
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
                  color: 'var(--text-brand-deep)',
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
    </>
  );
}


/* ============================================================
 *  AuthPlansBody — live, account-type-scoped plans
 *  ----------------------------------------------------------------
 *  For signed-in visitors we drop the marketing picker and show the
 *  real plans the backend returns from GET /plans (already filtered
 *  to the user's account_type, active only, plus the universal Isnad
 *  add-on). Picking a plan sends the user to /subscribe, which owns
 *  the full checkout + cancel + active-state flow.
 *
 *  Empty handling mirrors SubscribePage: individual accounts are on
 *  the free tier (no plans), everyone else falls back to a generic
 *  "no plans" message.
 * ============================================================ */
function AuthPlansBody({ t, lang, navigate, loading, plans, status, user, error }) {
  if (loading) return <AuthPlansSkeleton />;

  const activeByPlanId = new Map();
  for (const s of status?.active_subscriptions || []) {
    activeByPlanId.set(s.plan_id, s);
  }

  const base = [];
  const addon = [];
  for (const p of plans || []) {
    if (p.is_addon) addon.push(p);
    else base.push(p);
  }
  base.sort(
    (a, b) =>
      (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
      (a.billing_interval_months ?? 0) - (b.billing_interval_months ?? 0)
  );

  if (!base.length && !addon.length) {
    return (
      <AuthEmptyState
        isIndividual={user?.account_type === 'individual'}
        error={error}
        t={t}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      {status?.on_trial && (
        <TrialNotice days={status.days_left_in_trial ?? 0} t={t} />
      )}
      {base.length > 0 && (
        <AuthPlanSection
          title={t('subscribe.page.basePlansHeader')}
          plans={base}
          activeByPlanId={activeByPlanId}
          lang={lang}
          t={t}
          navigate={navigate}
        />
      )}
      {addon.length > 0 && (
        <AuthPlanSection
          title={t('subscribe.page.addonHeader')}
          plans={addon}
          activeByPlanId={activeByPlanId}
          lang={lang}
          t={t}
          navigate={navigate}
        />
      )}
    </div>
  );
}

/* Slim trial reminder pinned above the plans grid. Unlike the
   full-width StatusBanner, this stays out of the way so a trialing
   user can still scan and pick a plan. */
function TrialNotice({ days, t }) {
  return (
    <div
      className="mb-6 rounded-[12px] flex items-center gap-2.5 animate-fade-up"
      style={{
        background: 'rgba(44,47,124,0.06)',
        border: '1px solid rgba(44,47,124,0.18)',
        padding: '9px 14px',
      }}
    >
      <Clock
        size={15}
        strokeWidth={2}
        style={{ color: '#2c2f7c', flexShrink: 0 }}
      />
      <span
        style={{ fontSize: 12.5, color: 'var(--text-ink-soft)', lineHeight: 1.5 }}
      >
        {t('subscribe.page.trial.active', { days })}
      </span>
    </div>
  );
}

function AuthPlanSection({ title, plans, activeByPlanId, lang, t, navigate }) {
  return (
    <section className="mb-10">
      <h3
        className="font-display m-0 mb-4"
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <AuthPlanCard
            key={plan.id}
            plan={plan}
            isActive={activeByPlanId.has(plan.id)}
            lang={lang}
            t={t}
            onSubscribe={() => navigate('/subscribe')}
            delay={i * 0.04}
          />
        ))}
      </div>
    </section>
  );
}

function AuthPlanCard({ plan, isActive, lang, t, onSubscribe, delay }) {
  const isAddon = !!plan.is_addon;
  const isPremium = plan.tier === 'premium';
  const accent = isAddon || isPremium ? '#b8862a' : '#2c2f7c';
  const accentSoft =
    isAddon || isPremium ? 'rgba(184,134,42,0.10)' : 'rgba(44,47,124,0.10)';
  const Icon = isAddon ? Gem : isPremium ? Crown : Check;

  const { name, description, features } = localizedPlanContent(plan, { lang, t });
  const price = formatPrice(plan.price, lang);
  const months = plan.billing_interval_months || 1;

  return (
    <article
      className="relative flex flex-col rounded-[16px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: `${isActive ? 2 : 1}px solid ${
          isActive ? accent : 'var(--border-default)'
        }`,
        padding: '22px 22px 20px',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: accentSoft,
            color: accent,
          }}
        >
          <Icon size={18} strokeWidth={1.85} />
        </div>
        <span
          className="font-bold rounded-full"
          style={{
            fontSize: 10.5,
            padding: '3px 9px',
            background: accentSoft,
            color: accent,
            letterSpacing: '0.04em',
          }}
        >
          {isAddon
            ? t('subscribe.page.tierLabels.addon')
            : t(`subscribe.page.tierLabels.${plan.tier}`)}
        </span>
      </header>

      <h4
        className="font-display m-0 mb-1"
        style={{
          fontSize: 16.5,
          fontWeight: 700,
          lineHeight: 1.3,
          color: 'var(--text-ink)',
        }}
      >
        {name}
      </h4>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mb-3">
        {t(`subscribe.page.periodLabels.${months}`)}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="font-display"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-brand-deep)',
            lineHeight: 1,
          }}
        >
          {price}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {plan.currency || 'SAR'} · {t(`subscribe.page.periodLabels.${months}`)}
        </span>
      </div>

      {description && (
        <p
          className="m-0 mb-4"
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--text-ink-soft)',
          }}
        >
          {description}
        </p>
      )}

      {features.length > 0 && (
        <ul className="m-0 p-0 flex flex-col gap-2 mb-5">
          {features.slice(0, 6).map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 list-none"
              style={{ fontSize: 12.5, color: 'var(--text-ink-soft)' }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: accentSoft,
                  color: accent,
                  marginTop: 1,
                }}
              >
                <Check size={11} strokeWidth={2.6} />
              </span>
              <span style={{ lineHeight: 1.5 }}>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto">
        {isActive ? (
          <div
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] font-semibold"
            style={{
              padding: '11px 14px',
              fontSize: 13,
              background: accentSoft,
              color: accent,
              border: `1px solid ${accent}`,
            }}
          >
            <BadgeCheck size={14} strokeWidth={2} />
            {t('subscribe.page.activeChip')}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSubscribe}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] text-white font-semibold transition-all"
            style={{
              padding: '11px 14px',
              fontSize: 13.5,
              background: accent,
              border: `1px solid ${accent}`,
              cursor: 'pointer',
              boxShadow: `0 6px 14px ${accent}40`,
              fontFamily: 'inherit',
            }}
          >
            {t('subscribe.page.subscribeCta')}
          </button>
        )}
      </div>
    </article>
  );
}

function AuthEmptyState({ isIndividual, error, t, navigate }) {
  const k = isIndividual
    ? 'subscribe.page.empty.individual'
    : 'subscribe.page.empty.generic';
  return (
    <div
      className="rounded-[16px] text-center py-12 px-6 max-w-[760px] mx-auto animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <h3
        className="font-display m-0 mb-2"
        style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {t(`${k}.title`)}
      </h3>
      <p
        className="m-0 max-w-md mx-auto"
        style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {error && !isIndividual
          ? t('subscribe.page.empty.generic.body')
          : t(`${k}.body`)}
      </p>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
        style={{
          background: 'var(--bg-ink-deep)',
          color: 'white',
          fontSize: 13.5,
          border: '1px solid var(--bg-ink-deep)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {t('subscribe.cancel.backToDashboard')}
      </button>
    </div>
  );
}

function AuthPlansSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto">
      <div
        className="mb-4 animate-pulse"
        style={{
          height: 20,
          width: 160,
          background: 'var(--border-soft)',
          borderRadius: 6,
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: 320,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
            }}
          />
        ))}
      </div>
    </div>
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


/* ============================================================
 *  usePlansData
 *  ----------------------------------------------------------------
 *  Decides the landing plans render path and feeds the auth view.
 *
 *    { auth: false }                          no token → guest path
 *    { auth: true, loading: true }            requests in flight
 *    { auth: true, loading: false, plans,     ready: account-type
 *      status, user, error }                  plans + sub status + user
 *
 *  We read the token synchronously so the first paint already picks
 *  the right path (no guest→auth flash), and bail without hitting the
 *  API for anonymous visitors so they never generate a 401.
 * ============================================================ */
function usePlansData() {
  const hasToken =
    typeof window !== 'undefined' &&
    !!(localStorage.getItem('token') || sessionStorage.getItem('token'));

  const [state, setState] = useState({
    auth: hasToken,
    loading: hasToken,
    plans: [],
    status: null,
    user: null,
    error: '',
  });

  useEffect(() => {
    if (!hasToken) return undefined;

    let cancelled = false;
    Promise.all([
      subscriptions.listPlans().catch(() => []),
      subscriptions.getStatus().catch(() => null),
      auth.me().catch(() => null),
    ])
      .then(([plans, status, user]) => {
        if (cancelled) return;
        setState({
          auth: true,
          loading: false,
          plans: Array.isArray(plans) ? plans : [],
          status,
          user,
          error: '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: 'load' }));
      });

    return () => {
      cancelled = true;
    };
    // hasToken is derived from storage and stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}


/* ============================================================
 *  SubscriptionStatusCard
 *  ----------------------------------------------------------------
 *  Renders one of three pills for authenticated users:
 *    - active base subscription → green "subscribed" card
 *    - on trial → indigo countdown card
 *    - trial expired (has_access false) → red "renew" card
 *
 *  Guests (status === null) render nothing so the section layout
 *  stays identical for the default landing-page visitor.
 * ============================================================ */
function SubscriptionStatusCard({ status, lang, t, onNavigate }) {
  if (!status) return null;

  const baseSub = (status?.active_subscriptions || []).find(
    (s) => !s.plan?.is_addon
  );

  if (baseSub) {
    const planName = pickPlanName(baseSub.plan, lang);
    const date = formatPlanDate(baseSub.current_period_ends_at, lang);
    return (
      <StatusBanner
        tone="success"
        icon={BadgeCheck}
        title={t('subscribe.page.activeBanner.title')}
        body={t('subscribe.page.activeBanner.body', { name: planName, date })}
        actionLabel={t('subscribe.page.activeBanner.manage')}
        onAction={() => onNavigate('/subscribe')}
      />
    );
  }

  // On-trial users keep browsing the plans below — instead of this
  // full-width banner they get a slim notice pinned above the grid
  // (see TrialNotice in AuthPlansBody), so it informs without
  // crowding out the plans.
  if (status?.on_trial) return null;

  if (status && !status.has_access) {
    return (
      <StatusBanner
        tone="danger"
        icon={AlertCircle}
        body={t('subscribe.page.trial.expired')}
        actionLabel={t('subscribe.profile.noAccess.cta')}
        onAction={() => onNavigate('/subscribe')}
      />
    );
  }

  return null;
}

function StatusBanner({ tone, icon: Icon, title, body, actionLabel, onAction }) {
  const palettes = {
    success: {
      bg: 'rgba(19,109,74,0.06)',
      border: 'rgba(19,109,74,0.22)',
      iconColor: '#0d5538',
      btnBorder: 'rgba(19,109,74,0.30)',
      btnColor: '#0d5538',
    },
    info: {
      bg: 'rgba(44,47,124,0.06)',
      border: 'rgba(44,47,124,0.22)',
      iconColor: '#2c2f7c',
      btnBorder: 'rgba(44,47,124,0.30)',
      btnColor: '#2c2f7c',
    },
    danger: {
      bg: 'rgba(185,28,28,0.06)',
      border: 'rgba(185,28,28,0.22)',
      iconColor: '#b91c1c',
      btnBorder: 'rgba(185,28,28,0.30)',
      btnColor: '#b91c1c',
    },
  };
  const p = palettes[tone] || palettes.info;

  return (
    <div
      className="max-w-[900px] mx-auto mb-8 rounded-[14px] flex items-start gap-3 animate-fade-up"
      style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        padding: '14px 18px',
      }}
    >
      <Icon
        size={20}
        strokeWidth={1.9}
        style={{ color: p.iconColor, flexShrink: 0, marginTop: 2 }}
      />
      <div className="flex-1 min-w-0">
        {title && (
          <div
            className="font-display font-bold mb-0.5"
            style={{ fontSize: 14, color: 'var(--text-ink)' }}
          >
            {title}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {body}
        </div>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 font-semibold transition-colors flex-shrink-0"
          style={{
            fontSize: 12.5,
            padding: '7px 12px',
            borderRadius: 9,
            border: `1px solid ${p.btnBorder}`,
            color: p.btnColor,
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}


/* ============================================================
 *  Localized plan copy (UX-only)
 *  ----------------------------------------------------------------
 *  The backend stores plan name/description/features in English
 *  only. For the Arabic (and Chinese) UI we reuse the fully
 *  translated marketing copy that already lives in the landing
 *  dictionary under landing.plans.tiers.{audience}.{tier}, keyed by
 *  the plan's own account_type + tier. Presentation only —
 *  enrollment still sends the real backend plan.id.
 *
 *  Falls back to the backend fields whenever there's no localized
 *  entry (unmapped account type, a new plan shape, or missing copy).
 * ============================================================ */
function localizedPlanContent(plan, { lang, t }) {
  const dict = DICTS[lang] || DICTS.ar;
  const backendFeatures = Array.isArray(plan.features) ? plan.features : [];
  const fallback = {
    name: pickPlanName(plan, lang),
    description: pickPlanDescription(plan, lang),
    features: backendFeatures,
  };

  // Arena add-ons — universal, not audience-specific. Each add-on
  // (isnad / solidarity) has its own copy block keyed by plan.code.
  if (plan.is_addon) {
    const addonKey =
      plan.code === 'solidarity_addon' ? 'solidarityAddon' : 'addon';
    const addon = dict?.landing?.plans?.[addonKey];
    if (!addon) return fallback;
    return {
      name: addon.title || fallback.name,
      description:
        t(`landing.plans.${addonKey}.body`, {
          price: t(`landing.plans.${addonKey}.price`),
          threshold: t('landing.plans.addon.threshold'),
        }) || fallback.description,
      features:
        Array.isArray(addon.features) && addon.features.length
          ? addon.features
          : backendFeatures,
    };
  }

  const audience = AUDIENCE_BY_ACCOUNT_TYPE[plan.account_type];
  const tier = plan.tier === 'premium' ? 'premium' : 'basic';
  const entry = audience && dict?.landing?.plans?.tiers?.[audience]?.[tier];
  if (!entry) return fallback;

  const roleLabel = dict?.landing?.plans?.audiences?.[audience] || '';
  const tierLabel = t(`subscribe.page.tierLabels.${tier}`);
  return {
    name: roleLabel ? `${roleLabel} — ${tierLabel}` : fallback.name,
    description: entry.description || fallback.description,
    features:
      Array.isArray(entry.features) && entry.features.length
        ? entry.features
        : backendFeatures,
  };
}

function pickPlanName(plan, lang) {
  if (!plan) return '';
  if (lang === 'ar' && plan.name_ar) return plan.name_ar;
  if (plan.name_en) return plan.name_en;
  return plan.name_ar || plan.code || '';
}

function pickPlanDescription(plan, lang) {
  if (!plan) return '';
  if (lang === 'ar' && plan.description_ar) return plan.description_ar;
  if (plan.description_en) return plan.description_en;
  return plan.description_ar || '';
}

function formatPrice(price, lang) {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (n == null || Number.isNaN(n)) return String(price ?? '');
  const locale = lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'ar-SA';
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function formatPlanDate(d, lang) {
  if (!d) return '';
  try {
    const locale =
      lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'ar-SA';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}
