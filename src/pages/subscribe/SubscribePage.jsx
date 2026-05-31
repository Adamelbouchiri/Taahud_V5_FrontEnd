import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Sparkles,
  Gem,
  Crown,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  Clock,
  BadgeCheck,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { subscriptions } from '../../services';

/* ============================================================
 *  SubscribePage — /subscribe
 *  ----------------------------------------------------------------
 *  Authenticated plans picker. Fetches /api/plans + /api/subscriptions/me
 *  in parallel, renders the live plans for the user's account type
 *  (and the universal Isnad add-on), and starts a Stripe checkout
 *  session when the user picks a plan.
 *
 *  Behavior:
 *    - On checkout success: window.location.href = stripe url
 *    - Stripe will redirect back to /subscribe/success on payment,
 *      or /subscribe/cancel on user-abort
 *    - already_subscribed / addon_already_active map to friendly
 *      inline errors instead of generic toasts
 *
 *  Empty states:
 *    - account_type === 'individual' → free-tier message, no plans
 *    - no plans returned for non-individual → "no plans" empty state
 * ============================================================ */

export default function SubscribePage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { user, loading: userLoading } = useUser();

  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [planError, setPlanError] = useState({ planId: null, message: '' });
  const [canceling, setCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState({ tone: '', text: '' });

  const refreshStatus = async () => {
    try {
      const s = await subscriptions.getStatus();
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.all([
      subscriptions.listPlans().catch(() => []),
      subscriptions.getStatus().catch(() => null),
    ])
      .then(([p, s]) => {
        if (cancelled) return;
        setPlans(p);
        setStatus(s);
      })
      .catch((err) => !cancelled && setLoadError(err?.message || ''))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Split plans into base + addon for separate sections.
  const { basePlans, addonPlans } = useMemo(() => {
    const base = [];
    const addon = [];
    for (const p of plans) {
      if (p.is_addon) addon.push(p);
      else base.push(p);
    }
    base.sort(
      (a, b) =>
        (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
        (a.billing_interval_months ?? 0) - (b.billing_interval_months ?? 0)
    );
    return { basePlans: base, addonPlans: addon };
  }, [plans]);

  // Detect the user's active base subscription (the one that gates
  // access). Two-pass detection: an explicit `is_addon === false`
  // wins, otherwise fall back to anything without `is_addon === true`
  // (covers BE responses where `plan` is trimmed and `is_addon` is
  // undefined). Last resort: take the first active sub so a stray
  // shape mismatch doesn't hide the user's real subscription.
  const activeSubs = status?.active_subscriptions || [];
  const baseSub =
    activeSubs.find((s) => s.plan && s.plan.is_addon === false) ||
    activeSubs.find((s) => !s.plan?.is_addon) ||
    activeSubs[0] ||
    null;
  const hasBaseSub = !!baseSub;
  const hasIsnadAddon = !!status?.has_isnad_addon;
  const activeSubByPlanId = useMemo(() => {
    const m = new Map();
    for (const s of activeSubs) m.set(s.plan_id, s);
    return m;
  }, [activeSubs]);

  const handleCancelSub = async () => {
    if (!baseSub) return;
    const ok = window.confirm(t('subscribe.profile.active.confirmCancel'));
    if (!ok) return;
    setCancelMessage({ tone: '', text: '' });
    setCanceling(true);
    try {
      await subscriptions.cancel(baseSub.id);
      setCancelMessage({
        tone: 'success',
        text: t('subscribe.profile.active.canceledToast'),
      });
      // Stripe webhook usually flips state within a few seconds.
      setTimeout(() => refreshStatus(), 3000);
    } catch (err) {
      setCancelMessage({
        tone: 'error',
        text: err?.message || t('subscribe.profile.active.cancelError'),
      });
    } finally {
      setCanceling(false);
    }
  };

  const handleSubscribe = async (plan) => {
    setPlanError({ planId: null, message: '' });
    setBusyPlanId(plan.id);
    try {
      const origin = window.location.origin;
      const { url } = await subscriptions.createCheckout({
        plan_id: plan.id,
        success_url: `${origin}/subscribe/success?plan_id=${plan.id}`,
        cancel_url: `${origin}/subscribe/cancel`,
      });
      if (url) {
        // Sanity-check the returned URL. When the backend has
        // PAYMENT_DRIVER=fake, the fake gateway hands back a URL that
        // points right at its own /api/subscriptions/checkout endpoint
        // — which Laravel only serves via POST. Following such a URL
        // would dump the user on a "Method Not Allowed" debug page.
        // Detect that case and surface a clear error instead.
        if (isLikelyFakeGatewayUrl(url)) {
          throw new Error(
            'Backend payment gateway is in fake mode (PAYMENT_DRIVER=fake). ' +
              'Set PAYMENT_DRIVER=stripe with a valid STRIPE_SECRET_KEY in the API .env to enable real checkout.'
          );
        }
        window.location.href = url;
        return;
      }
      throw new Error(t('subscribe.page.errors.generic'));
    } catch (err) {
      const code = err?.data?.code;
      const httpStatus = err?.status;
      let message = err?.message || t('subscribe.page.errors.generic');
      if (code === 'already_subscribed') {
        message = t('subscribe.page.errors.alreadySubscribed');
      } else if (code === 'addon_already_active') {
        message = t('subscribe.page.errors.addonActive');
      } else if (httpStatus === 403) {
        message = t('subscribe.page.errors.accountType');
      }
      setPlanError({ planId: plan.id, message });
      setBusyPlanId(null);
    }
  };

  if (userLoading || loading) {
    return <PageSkeleton t={t} />;
  }

  const isIndividual = user?.account_type === 'individual';
  const showEmpty = !plans.length;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="max-w-[1100px] mx-auto px-5 lg:px-8 py-8 lg:py-12">
        <BackBar t={t} onBack={() => navigate(-1)} />
        <PageHeader t={t} />
        {status && (
          <StatusBanner
            status={status}
            baseSub={baseSub}
            t={t}
            lang={lang}
            canceling={canceling}
            cancelMessage={cancelMessage}
            onRefresh={refreshStatus}
            onCancel={handleCancelSub}
          />
        )}

        {loadError && !plans.length && (
          <InlineError message={loadError} />
        )}

        {showEmpty ? (
          <EmptyState isIndividual={isIndividual} t={t} navigate={navigate} />
        ) : (
          <>
            {basePlans.length > 0 && (
              <PlanSection
                title={t('subscribe.page.basePlansHeader')}
                plans={basePlans}
                lang={lang}
                t={t}
                onSubscribe={handleSubscribe}
                busyPlanId={busyPlanId}
                planError={planError}
                hasBaseSub={hasBaseSub}
                activeSubByPlanId={activeSubByPlanId}
              />
            )}
            {addonPlans.length > 0 && (
              <PlanSection
                title={t('subscribe.page.addonHeader')}
                plans={addonPlans}
                lang={lang}
                t={t}
                onSubscribe={handleSubscribe}
                busyPlanId={busyPlanId}
                planError={planError}
                hasBaseSub={false}
                activeSubByPlanId={activeSubByPlanId}
                forceAddon
                hasIsnadAddon={hasIsnadAddon}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 *  Header / nav
 * ============================================================ */
function BackBar({ t, onBack }) {
  const { dir } = useTranslation();
  const Arrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 mb-6 font-semibold transition-colors"
      style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.color = 'var(--text-brand-deep)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.color = 'var(--text-muted)')
      }
    >
      <Arrow size={14} strokeWidth={1.9} />
      {t('subscribe.page.back')}
    </button>
  );
}

function PageHeader({ t }) {
  return (
    <div className="mb-8 lg:mb-10 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand-deep)',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Sparkles size={12} />
        {t('subscribe.page.eyebrow')}
      </div>
      <h1
        className="font-display m-0 mb-2"
        style={{
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          color: 'var(--text-ink)',
        }}
      >
        {t('subscribe.page.title')}
      </h1>
      <p
        className="m-0 max-w-[640px]"
        style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {t('subscribe.page.subtitle')}
      </p>
    </div>
  );
}

/* ============================================================
 *  Status banner — full subscription card
 *  ----------------------------------------------------------------
 *  Three states (in priority order):
 *    1. active base sub → green card with renew date + cancel button
 *    2. on trial        → indigo card with days-left countdown
 *    3. trial expired   → red card prompting to subscribe
 *
 *  A small refresh button sits in the top-right corner so users
 *  can manually re-poll /subscriptions/me — useful right after a
 *  successful checkout while the webhook is in flight.
 * ============================================================ */
function StatusBanner({
  status,
  baseSub,
  t,
  lang,
  canceling,
  cancelMessage,
  onRefresh,
  onCancel,
}) {
  if (baseSub) {
    const planName = pickName(baseSub.plan, lang);
    const date = formatDate(baseSub.current_period_ends_at, lang);
    const isCanceled = !!baseSub.canceled_at;
    return (
      <div
        className="mb-7 rounded-[16px] animate-fade-up"
        style={{
          background: 'rgba(19,109,74,0.05)',
          border: '1px solid rgba(19,109,74,0.22)',
          padding: '18px 20px',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: 'rgba(19,109,74,0.12)',
              color: '#0d5538',
            }}
          >
            <BadgeCheck size={20} strokeWidth={1.9} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span
                className="font-display font-bold"
                style={{ fontSize: 14.5, color: 'var(--text-ink)' }}
              >
                {planName || t('subscribe.page.activeBanner.title')}
              </span>
              <span
                className="font-bold rounded-full"
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  background: 'rgba(19,109,74,0.12)',
                  color: '#0d5538',
                  letterSpacing: '0.04em',
                }}
              >
                {t('subscribe.profile.active.label')}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-ink-soft)' }}>
              {isCanceled
                ? t('subscribe.profile.active.canceledPending')
                : t('subscribe.profile.active.period', { date })}
            </div>
          </div>
          <RefreshButton onClick={onRefresh} />
        </div>

        {cancelMessage?.text && (
          <div
            className="mt-3 flex items-start gap-2 rounded-[8px]"
            style={{
              background:
                cancelMessage.tone === 'success'
                  ? 'rgba(19,109,74,0.06)'
                  : 'rgba(185,28,28,0.06)',
              border:
                cancelMessage.tone === 'success'
                  ? '1px solid rgba(19,109,74,0.18)'
                  : '1px solid rgba(185,28,28,0.18)',
              color:
                cancelMessage.tone === 'success'
                  ? '#0d5538'
                  : 'var(--accent-danger)',
              fontSize: 12.5,
              padding: '8px 11px',
            }}
          >
            {cancelMessage.tone === 'success' ? (
              <CheckCircle2
                size={13}
                strokeWidth={2}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
            ) : (
              <AlertCircle
                size={13}
                strokeWidth={2}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
            )}
            <span>{cancelMessage.text}</span>
          </div>
        )}

        {!isCanceled && (
          <div className="mt-3 flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onCancel}
              disabled={canceling}
              className="inline-flex items-center gap-1.5 font-semibold transition-colors"
              style={{
                fontSize: 12.5,
                padding: '7px 12px',
                borderRadius: 9,
                border: '1px solid rgba(185,28,28,0.25)',
                color: 'var(--accent-danger)',
                background: 'transparent',
                cursor: canceling ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: canceling ? 0.7 : 1,
              }}
            >
              <X size={13} strokeWidth={2} />
              {canceling
                ? t('subscribe.profile.active.canceling')
                : t('subscribe.profile.active.cancelCta')}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status.on_trial) {
    return (
      <div
        className="mb-7 rounded-[14px] flex items-start gap-3 animate-fade-up"
        style={{
          background: 'rgba(44,47,124,0.06)',
          border: '1px solid rgba(44,47,124,0.22)',
          padding: '14px 18px',
        }}
      >
        <Clock
          size={18}
          strokeWidth={1.9}
          style={{ color: '#2c2f7c', flexShrink: 0, marginTop: 3 }}
        />
        <div
          className="flex-1 min-w-0"
          style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
        >
          {t('subscribe.page.trial.active', { days: status.days_left_in_trial })}
        </div>
        <RefreshButton onClick={onRefresh} />
      </div>
    );
  }

  if (!status.has_access) {
    return (
      <div
        className="mb-7 rounded-[14px] flex items-start gap-3 animate-fade-up"
        style={{
          background: 'rgba(185,28,28,0.06)',
          border: '1px solid rgba(185,28,28,0.22)',
          padding: '14px 18px',
        }}
      >
        <AlertCircle
          size={18}
          strokeWidth={1.9}
          style={{ color: '#b91c1c', flexShrink: 0, marginTop: 3 }}
        />
        <div
          className="flex-1 min-w-0"
          style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
        >
          {t('subscribe.page.trial.expired')}
        </div>
        <RefreshButton onClick={onRefresh} />
      </div>
    );
  }

  return null;
}

function RefreshButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="refresh"
      className="inline-flex items-center justify-center transition-colors flex-shrink-0"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-ink-soft)',
        cursor: 'pointer',
      }}
    >
      <RefreshCw size={13} strokeWidth={1.9} />
    </button>
  );
}

/* ============================================================
 *  Plans grid
 * ============================================================ */
function PlanSection({
  title,
  plans,
  lang,
  t,
  onSubscribe,
  busyPlanId,
  planError,
  hasBaseSub,
  activeSubByPlanId,
  forceAddon,
  hasIsnadAddon,
}) {
  return (
    <section className="mb-10">
      <h2
        className="font-display m-0 mb-4"
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const activeSub = activeSubByPlanId.get(plan.id);
          const isActive = !!activeSub;
          // Disable competing base plans when one is already active.
          // Add-ons follow their own "addon active" rule (Isnad).
          const lockedByOtherBase = !forceAddon && hasBaseSub && !isActive;
          const lockedByAddon = forceAddon && hasIsnadAddon && !isActive;
          const disabled = lockedByOtherBase || lockedByAddon;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              lang={lang}
              t={t}
              forceAddon={forceAddon}
              isActive={isActive}
              disabled={disabled}
              busy={busyPlanId === plan.id}
              error={
                planError.planId === plan.id ? planError.message : ''
              }
              onSubscribe={() => onSubscribe(plan)}
              delay={i * 0.04}
            />
          );
        })}
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  lang,
  t,
  forceAddon,
  isActive,
  disabled,
  busy,
  error,
  onSubscribe,
  delay,
}) {
  const isAddon = !!plan.is_addon || forceAddon;
  const isPremium = plan.tier === 'premium';
  const accent = isAddon ? '#b8862a' : isPremium ? '#b8862a' : '#2c2f7c';
  const accentSoft = isAddon
    ? 'rgba(184,134,42,0.10)'
    : isPremium
    ? 'rgba(184,134,42,0.10)'
    : 'rgba(44,47,124,0.10)';
  const Icon = isAddon ? Gem : isPremium ? Crown : Check;

  const name = pickName(plan, lang);
  const description = pickDescription(plan, lang);
  const price = formatPrice(plan.price, plan.currency, lang);
  const months = plan.billing_interval_months || 1;
  const features = Array.isArray(plan.features) ? plan.features : [];

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

      <h3
        className="font-display m-0 mb-1"
        style={{
          fontSize: 16.5,
          fontWeight: 700,
          lineHeight: 1.3,
          color: 'var(--text-ink)',
        }}
      >
        {name}
      </h3>
      <div
        style={{ fontSize: 12, color: 'var(--text-muted)' }}
        className="mb-3"
      >
        {t(`subscribe.page.periodLabels.${months}`) ||
          `${months} ${t('common.months')}`}
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
          {features.map((f, i) => (
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

      <div className="mt-auto flex flex-col gap-2">
        {error && <InlineError compact message={error} />}
        {isActive ? (
          <div
            className="inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold"
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
            disabled={disabled || busy}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] text-white font-semibold transition-all"
            style={{
              padding: '11px 14px',
              fontSize: 13.5,
              background: disabled ? '#8a8ca5' : accent,
              border: `1px solid ${disabled ? '#8a8ca5' : accent}`,
              cursor: disabled ? 'not-allowed' : busy ? 'wait' : 'pointer',
              boxShadow: disabled
                ? 'none'
                : `0 6px 14px ${accent}40`,
              opacity: disabled ? 0.85 : 1,
              fontFamily: 'inherit',
            }}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t('subscribe.page.processing')}
              </>
            ) : (
              t('subscribe.page.subscribeCta')
            )}
          </button>
        )}
      </div>
    </article>
  );
}

/* ============================================================
 *  Empty / error states
 * ============================================================ */
function EmptyState({ isIndividual, t, navigate }) {
  const k = isIndividual
    ? 'subscribe.page.empty.individual'
    : 'subscribe.page.empty.generic';
  return (
    <div
      className="rounded-[16px] text-center py-12 px-6 animate-fade-up"
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
        {t(`${k}.body`)}
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

function InlineError({ message, compact }) {
  return (
    <div
      className="flex items-start gap-2 rounded-[8px]"
      style={{
        background: 'rgba(185,28,28,0.06)',
        border: '1px solid rgba(185,28,28,0.18)',
        color: 'var(--accent-danger)',
        fontSize: compact ? 12 : 13,
        padding: compact ? '7px 10px' : '10px 12px',
        marginBottom: compact ? 0 : 16,
      }}
    >
      <AlertCircle
        size={compact ? 12 : 14}
        strokeWidth={2}
        style={{ flexShrink: 0, marginTop: compact ? 2 : 2 }}
      />
      <span>{message}</span>
    </div>
  );
}

function PageSkeleton({ t }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-[1100px] mx-auto px-5 lg:px-8 py-12 animate-pulse">
        <div
          style={{
            height: 24,
            width: 200,
            background: 'var(--border-soft)',
            borderRadius: 6,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            height: 14,
            width: 320,
            background: 'var(--border-soft)',
            borderRadius: 6,
            marginBottom: 32,
          }}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
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
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */
function pickName(plan, lang) {
  if (!plan) return '';
  if (lang === 'ar' && plan.name_ar) return plan.name_ar;
  if (plan.name_en) return plan.name_en;
  return plan.name_ar || plan.code || '';
}

function pickDescription(plan, lang) {
  if (!plan) return '';
  if (lang === 'ar' && plan.description_ar) return plan.description_ar;
  if (plan.description_en) return plan.description_en;
  return plan.description_ar || '';
}

function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  return 'ar-SA';
}

function formatPrice(price, currency, lang) {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (Number.isNaN(n)) return String(price ?? '');
  try {
    return new Intl.NumberFormat(localeFor(lang), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function formatDate(d, lang) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}

/* ============================================================
 *  isLikelyFakeGatewayUrl
 *  ----------------------------------------------------------------
 *  Real Stripe checkout URLs live on checkout.stripe.com. When the
 *  backend has PAYMENT_DRIVER=fake, it returns a placeholder URL
 *  that almost always points at its own /api/subscriptions/checkout
 *  endpoint — which is POST-only, so the browser following it gets
 *  a Laravel "Method Not Allowed" page. Catch both cases:
 *    1. URL whose path includes /api/ (loops to the BE)
 *    2. URL parses to anything other than a recognized Stripe host
 *       AND happens to share an origin/host with our API
 * ============================================================ */
function isLikelyFakeGatewayUrl(rawUrl) {
  if (!rawUrl) return true;
  let parsed;
  try {
    parsed = new URL(rawUrl, window.location.origin);
  } catch {
    return true;
  }
  const host = parsed.host.toLowerCase();
  const isStripe =
    host === 'checkout.stripe.com' || host.endsWith('.stripe.com');
  if (isStripe) return false;
  // Loops back to our own API.
  if (parsed.pathname.startsWith('/api/')) return true;
  // Shares host with VITE_API_URL — almost certainly the fake gateway.
  try {
    const apiBase = new URL(
      import.meta.env.VITE_API_URL || '/api',
      window.location.origin
    );
    if (apiBase.host && apiBase.host === host) return true;
  } catch {
    // fall through
  }
  return false;
}
