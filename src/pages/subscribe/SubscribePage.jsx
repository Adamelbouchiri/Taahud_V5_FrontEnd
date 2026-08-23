import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Check,
  Sparkles,
  Gem,
  Handshake,
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
import { deriveArenaAddons } from '../../services/subscriptions';
import ConfirmDialog from '../../components/ConfirmDialog';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';
import urDict from '../../i18n/dictionaries/ur';

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
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

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
  // Arena add-ons owned by the user (isnad / solidarity), resolved from
  // active subscriptions. OR in the legacy has_isnad_addon boolean.
  const ownedAddons = deriveArenaAddons(status);
  const hasIsnadAddon = ownedAddons.isnad_addon || !!status?.has_isnad_addon;
  const hasSolidarityAddon = ownedAddons.solidarity_addon;
  const activeSubByPlanId = useMemo(() => {
    const m = new Map();
    for (const s of activeSubs) m.set(s.plan_id, s);
    return m;
  }, [activeSubs]);

  // Open the confirmation modal (replaces the native window.confirm).
  const handleCancelSub = () => {
    if (!baseSub) return;
    setConfirmCancelOpen(true);
  };

  // Runs the actual cancellation once the user confirms in the modal.
  const confirmCancelSub = async () => {
    if (!baseSub) return;
    setCancelMessage({ tone: '', text: '' });
    setCanceling(true);
    try {
      await subscriptions.cancel(baseSub.id);
      setConfirmCancelOpen(false);
      setCancelMessage({
        tone: 'success',
        text: t('subscribe.profile.active.canceledToast'),
      });
      // Webhook usually flips state within a few seconds.
      setTimeout(() => refreshStatus(), 3000);
    } catch (err) {
      setConfirmCancelOpen(false);
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

    // Create a checkout session and redirect to the URL the backend
    // returns. With Moyasar that URL is our OWN /pay/:sessionId page
    // (Moyasar has no hosted checkout) — but the redirect logic is the
    // same regardless of provider: window.location.href = url.
    try {
      const origin = window.location.origin;
      const { url } = await subscriptions.createCheckout({
        plan_id: plan.id,
        success_url: `${origin}/subscribe/success?plan_id=${plan.id}`,
        cancel_url: `${origin}/subscribe/cancel`,
      });
      if (url) {
        // With Moyasar the checkout URL is our OWN /pay/:sessionId page.
        // The backend may render it with the production host (or a wrong
        // host/port in dev) — a hard window.location redirect to that
        // host would land us off-origin and drop the auth token from
        // storage (→ "unauthenticated"). So when the URL points at our
        // own pay page, ignore the host and navigate client-side: we
        // stay inside the SPA on the current origin, token intact.
        const payPath = toInAppPayPath(url);
        if (payPath) {
          navigate(payPath);
          return;
        }
        // External provider page (e.g. a hosted gateway) — hard redirect.
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

  /* Brokers have no plans in V5 — their commission model is settled
     out of band, so the whole subscribe flow is hidden for them (the
     sidebar link is already broker-less). Bounce direct hits on the
     URL back to the dashboard rather than showing an empty picker. */
  if (user?.account_type === 'broker') {
    return <Navigate to="/dashboard" replace />;
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

        {/* Active arena add-on banners — mirror the profile page so an
            enrolled user sees each active add-on here too. */}
        {hasIsnadAddon && (
          <AddonBanner
            t={t}
            icon={Gem}
            accent="#0d5538"
            accentBg="rgba(13,85,56,0.06)"
            accentBorder="rgba(13,85,56,0.28)"
            chipBg="rgba(13,85,56,0.12)"
            labelKey="subscribe.profile.isnadAddon.label"
            bodyKey="subscribe.profile.isnadAddon.body"
          />
        )}
        {hasSolidarityAddon && (
          <AddonBanner
            t={t}
            icon={Handshake}
            accent="#8a6a1f"
            accentBg="rgba(184,134,42,0.06)"
            accentBorder="rgba(184,134,42,0.28)"
            chipBg="rgba(184,134,42,0.14)"
            labelKey="subscribe.profile.solidarityAddon.label"
            bodyKey="subscribe.profile.solidarityAddon.body"
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
                accountType={user?.account_type}
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
                accountType={user?.account_type}
                onSubscribe={handleSubscribe}
                busyPlanId={busyPlanId}
                planError={planError}
                hasBaseSub={false}
                activeSubByPlanId={activeSubByPlanId}
                forceAddon
                ownedAddons={ownedAddons}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        title={t('subscribe.profile.active.confirmTitle')}
        message={t('subscribe.profile.active.confirmCancel')}
        confirmLabel={
          canceling
            ? t('subscribe.profile.active.canceling')
            : t('subscribe.profile.active.confirmYes')
        }
        cancelLabel={t('subscribe.profile.active.confirmKeep')}
        onConfirm={confirmCancelSub}
        onCancel={() => setConfirmCancelOpen(false)}
        busy={canceling}
        tone="danger"
      />
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

/* Active arena add-on banner — shown on the subscribe page when the
   user owns the add-on, mirroring the profile page's AddonRow. Themed
   per add-on (icon + accent) so isnad and solidarity read distinctly. */
function AddonBanner({
  t,
  icon: Icon,
  accent,
  accentBg,
  accentBorder,
  chipBg,
  labelKey,
  bodyKey,
}) {
  return (
    <div
      className="mb-7 rounded-[16px] flex items-start gap-3 animate-fade-up"
      style={{
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        padding: '16px 20px',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: chipBg,
          color: accent,
        }}
      >
        <Icon size={20} strokeWidth={1.9} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className="font-display font-bold"
            style={{ fontSize: 14.5, color: 'var(--text-ink)' }}
          >
            {t(labelKey)}
          </span>
          <span
            className="font-bold rounded-full"
            style={{
              fontSize: 10,
              padding: '2px 8px',
              background: chipBg,
              color: accent,
              letterSpacing: '0.04em',
            }}
          >
            {t('subscribe.profile.active.label')}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-ink-soft)' }}>
          {t(bodyKey)}
        </div>
      </div>
    </div>
  );
}

function RefreshButton({ onClick }) {
  const [spinning, setSpinning] = useState(false);
  // Avoid setting state after the banner unmounts (the min-spin timer
  // can outlive a status flip that swaps the banner variant).
  const mounted = useRef(true);
  useEffect(() => {
    // Set on mount too: under StrictMode the effect runs mount → cleanup
    // → mount, so without re-setting here the flag stays false after the
    // double-invoke and the stop callback never clears the spin.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);
    const started = Date.now();
    try {
      await onClick?.();
    } finally {
      // Keep the icon spinning for at least one full turn even when the
      // request resolves instantly, so the refresh reads as deliberate.
      const remaining = 650 - (Date.now() - started);
      const stop = () => mounted.current && setSpinning(false);
      if (remaining > 0) setTimeout(stop, remaining);
      else stop();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={spinning}
      aria-label="refresh"
      aria-busy={spinning}
      className="inline-flex items-center justify-center transition-colors flex-shrink-0"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-ink-soft)',
        cursor: spinning ? 'default' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (spinning) return;
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.color = 'var(--text-brand-deep)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.color = 'var(--text-ink-soft)';
      }}
    >
      <RefreshCw
        size={13}
        strokeWidth={1.9}
        className={spinning ? 'animate-spin' : ''}
      />
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
  accountType,
  onSubscribe,
  busyPlanId,
  planError,
  hasBaseSub,
  activeSubByPlanId,
  forceAddon,
  ownedAddons = {},
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
          // For add-ons, only lock the card whose specific add-on the
          // user already owns (by plan.code) — so owning isnad doesn't
          // lock the solidarity card and vice-versa.
          const lockedByOtherBase = !forceAddon && hasBaseSub && !isActive;
          const lockedByAddon =
            forceAddon && !!ownedAddons[plan.code] && !isActive;
          const disabled = lockedByOtherBase || lockedByAddon;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              lang={lang}
              t={t}
              accountType={accountType}
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
  accountType,
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

  const { name, description, features } = localizedPlanContent(plan, {
    lang,
    accountType,
    isAddon,
    t,
  });
  const price = formatPrice(plan.price, plan.currency, lang);
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

/* ============================================================
 *  Localized plan copy (UX-only)
 *  ----------------------------------------------------------------
 *  The backend stores plan name/description/features in English
 *  only. For the Arabic (and Chinese) UI we reuse the fully
 *  translated marketing copy that already lives in the landing
 *  dictionary under landing.plans.tiers.{audience}.{tier}, keyed by
 *  the user's account_type + the plan tier. This is presentation
 *  only — enrollment still sends the real backend plan.id, so no
 *  Arabic copy is needed on the backend.
 *
 *  Falls back to the backend fields whenever there's no localized
 *  entry (unmapped account type, a new plan shape, or missing copy).
 * ============================================================ */
const DICTS = { ar: arDict, en: enDict, zh: zhDict, ur: urDict };

// account_type (from the API/user) → landing dictionary audience key.
const AUDIENCE_BY_ACCOUNT_TYPE = {
  entrepreneur: 'contractor',
  contractor: 'contractor',
  engineering: 'engineering',
  developer: 'developer',
  supplier: 'supplier',
};

function localizedPlanContent(plan, { lang, accountType, isAddon, t }) {
  const dict = DICTS[lang] || DICTS.ar;
  const backendFeatures = Array.isArray(plan.features) ? plan.features : [];
  const fallback = {
    name: pickName(plan, lang),
    description: pickDescription(plan, lang),
    features: backendFeatures,
  };

  // Arena add-ons — universal, not audience-specific. Each add-on
  // (isnad / solidarity) has its own copy block keyed by plan.code.
  if (isAddon || plan.is_addon) {
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

  const audience = AUDIENCE_BY_ACCOUNT_TYPE[accountType];
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
 *  toInAppPayPath
 *  ----------------------------------------------------------------
 *  The checkout endpoint returns a URL for our own Moyasar pay page,
 *  e.g. https://taahud.sa/pay/mch_xxx. We only care about the PATH —
 *  the host the backend embeds may be the production domain (or a
 *  wrong host/port in dev), and following it as an absolute URL would
 *  bounce us off the current origin and lose the auth token in
 *  storage. Extract just `/pay/:sessionId[?query]` so the caller can
 *  navigate client-side. Returns null for any URL that isn't our
 *  pay page (those still get a normal redirect).
 * ============================================================ */
function toInAppPayPath(rawUrl) {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl, window.location.origin);
    return /^\/pay\/[^/]+\/?$/.test(u.pathname) ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

