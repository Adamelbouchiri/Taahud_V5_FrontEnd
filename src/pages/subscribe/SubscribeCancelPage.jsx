import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  SubscribeCancelPage — /subscribe/cancel
 *  ----------------------------------------------------------------
 *  Landing page when the user bails out of Stripe Checkout (clicks
 *  the back button on Stripe's hosted page). No payment was taken;
 *  we just acknowledge and offer two paths forward.
 * ============================================================ */

export default function SubscribeCancelPage() {
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const Arrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div
        className="w-full max-w-[520px] rounded-[20px] text-center animate-fade-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '36px 30px',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div
          className="mx-auto flex items-center justify-center mb-5"
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            background: 'rgba(185,28,28,0.08)',
            color: '#b91c1c',
          }}
        >
          <XCircle size={34} strokeWidth={1.8} />
        </div>

        <div
          className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(185,28,28,0.08)',
            color: '#b91c1c',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          {t('subscribe.cancel.eyebrow')}
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
          {t('subscribe.cancel.title')}
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
          {t('subscribe.cancel.body')}
        </p>

        <div className="mt-7 flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/subscribe')}
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
            {t('subscribe.cancel.backToPlans')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
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
            {t('subscribe.cancel.backToDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
}
