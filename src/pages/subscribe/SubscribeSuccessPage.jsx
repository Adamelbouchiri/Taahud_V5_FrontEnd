import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  Clock,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { subscriptions } from '../../services';

/* ============================================================
 *  SubscribeSuccessPage — /subscribe/success
 *  ----------------------------------------------------------------
 *  Lands here after Stripe Checkout. Stripe redirects BEFORE its
 *  webhook fires, so we can't trust /subscriptions/me on first
 *  read. We poll for up to 10s, then fall through to a "pending"
 *  view if the webhook still hasn't landed.
 *
 *  Two visual states:
 *    - "verifying": initial poll in progress
 *    - "confirmed": active_subscriptions non-empty
 *    - "pending":   poll budget exhausted but payment did succeed
 *                   (Stripe wouldn't have redirected otherwise)
 * ============================================================ */

const STATE = {
  verifying: 'verifying',
  confirmed: 'confirmed',
  pending: 'pending',
};

export default function SubscribeSuccessPage() {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const [state, setState] = useState(STATE.verifying);
  const [status, setStatus] = useState(null);
  const inflight = useRef(false);

  const runPoll = async () => {
    if (inflight.current) return;
    inflight.current = true;
    setState(STATE.verifying);
    try {
      const result = await subscriptions.pollUntilActive({
        attempts: 10,
        intervalMs: 1000,
      });
      setStatus(result);
      if (result?.active_subscriptions?.length > 0) {
        setState(STATE.confirmed);
      } else {
        setState(STATE.pending);
      }
    } finally {
      inflight.current = false;
    }
  };

  useEffect(() => {
    runPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Arrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const activeSub = status?.active_subscriptions?.[0];
  const planName = activeSub ? pickName(activeSub.plan, lang) : '';

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ background: 'var(--bg-canvas)' }}>
      <div
        className="w-full max-w-[520px] rounded-[20px] text-center animate-fade-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '36px 30px',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <StatusIcon state={state} />

        <div
          className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
          style={{
            background:
              state === STATE.confirmed
                ? 'rgba(19,109,74,0.10)'
                : 'rgba(44,47,124,0.08)',
            color:
              state === STATE.confirmed ? '#0d5538' : 'var(--text-brand-deep)',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          {t('subscribe.success.eyebrow')}
        </div>

        <h1
          className="font-display m-0 mb-3"
          style={{
            fontSize: 'clamp(22px, 3.2vw, 28px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            color: 'var(--text-ink)',
          }}
        >
          {titleFor(state, t)}
        </h1>

        <p
          className="m-0 mx-auto"
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: 'var(--text-muted)',
            maxWidth: 380,
          }}
        >
          {bodyFor(state, t, planName)}
        </p>

        <div
          className="mt-7 flex items-center justify-center gap-2.5 flex-wrap"
        >
          {state === STATE.pending && (
            <button
              type="button"
              onClick={runPoll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <RefreshCw size={14} strokeWidth={2} />
              {t('subscribe.success.refresh')}
            </button>
          )}
          {state !== STATE.verifying && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: 'var(--bg-ink-deep)',
                border: '1px solid var(--bg-ink-deep)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 6px 14px rgba(15,17,71,0.20)',
              }}
            >
              <Arrow size={14} strokeWidth={2} />
              {t('subscribe.success.backToDashboard')}
            </button>
          )}
        </div>

        {state === STATE.verifying && (
          <div
            className="mt-5"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            {t('subscribe.success.verifyingHint')}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ state }) {
  if (state === STATE.confirmed) {
    return (
      <div
        className="mx-auto flex items-center justify-center mb-5"
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          background: 'linear-gradient(135deg, #136d4a, #0d5538)',
          color: 'white',
          boxShadow: '0 14px 30px rgba(19,109,74,0.32)',
        }}
      >
        <CheckCircle2 size={34} strokeWidth={1.8} />
      </div>
    );
  }
  if (state === STATE.pending) {
    return (
      <div
        className="mx-auto flex items-center justify-center mb-5"
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          background: 'rgba(184,134,42,0.14)',
          color: '#8a6a1f',
        }}
      >
        <Clock size={32} strokeWidth={1.8} />
      </div>
    );
  }
  return (
    <div
      className="mx-auto flex items-center justify-center mb-5"
      style={{
        width: 76,
        height: 76,
        borderRadius: 22,
        background: 'rgba(44,47,124,0.10)',
        color: '#2c2f7c',
      }}
    >
      <Loader2 size={32} className="animate-spin" />
    </div>
  );
}

function titleFor(state, t) {
  if (state === STATE.confirmed) return t('subscribe.success.confirmedTitle');
  if (state === STATE.pending) return t('subscribe.success.pendingTitle');
  return t('subscribe.success.verifying');
}

function bodyFor(state, t, planName) {
  if (state === STATE.confirmed)
    return t('subscribe.success.confirmedBody', { name: planName });
  if (state === STATE.pending) return t('subscribe.success.pendingBody');
  return t('subscribe.success.verifyingHint');
}

function pickName(plan, lang) {
  if (!plan) return '';
  if (lang === 'ar' && plan.name_ar) return plan.name_ar;
  if (plan.name_en) return plan.name_en;
  return plan.name_ar || plan.code || '';
}
