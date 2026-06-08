import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ShieldCheck,
  XCircle,
  ArrowLeft,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { subscriptions } from '../../services';

/* ============================================================
 *  CheckoutPage — /pay/:sessionId
 *  ----------------------------------------------------------------
 *  Moyasar has no hosted subscription checkout like Stripe. Instead
 *  the backend hands us a session id and we render Moyasar.js's
 *  embedded card form on our OWN page (this one). The flow:
 *
 *    1. Read :sessionId from the route.
 *    2. GET /payments/moyasar/checkout/:sessionId for the config
 *       (uses the shared axios instance — bearer token attached).
 *    3. Dynamically load Moyasar.js (CSS + JS) from the CDN.
 *    4. window.Moyasar.init(...) the embedded form.
 *    5. The user pays; Moyasar handles 3D Secure and redirects to
 *       the backend callback_url (out of scope here).
 *
 *  RTL note: the app is Arabic-first (RTL), but card number / expiry
 *  / CVV must read left-to-right. We force dir="ltr" on the form
 *  wrapper and keep the Moyasar form isolated as LTR so the app's
 *  direction never leaks into it.
 *
 *  CDN version: 1.19.0 is the latest Moyasar.js at time of writing
 *  (confirmed against cdn.moyasar.com — bump if a newer one ships).
 * ============================================================ */

const MOYASAR_VERSION = '1.19.0';
const MOYASAR_CSS = `https://cdn.moyasar.com/mpf/${MOYASAR_VERSION}/moyasar.css`;
const MOYASAR_JS = `https://cdn.moyasar.com/mpf/${MOYASAR_VERSION}/moyasar.js`;

function loadCss(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    // A failed stylesheet shouldn't block the (functional) form.
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // If Moyasar.js already initialised globally, we're done — this also
    // covers the case where the <script> finished loading on a previous
    // visit (its one-shot `load` event won't fire again for a new listener).
    if (window.Moyasar) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true' || window.Moyasar) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Moyasar.js')),
      );
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Moyasar.js'));
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // The Moyasar form is injected into this node. We keep a ref so each
  // init can start from a clean container. The route component is reused
  // across checkout sessions (pay ➜ browser-back ➜ pick a plan ➜
  // /pay/:newSession), so without clearing it the box would keep a stale
  // form and sit on the loader until a hard refresh.
  const formRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const config = await subscriptions.getMoyasarCheckout(sessionId);

        await loadCss(MOYASAR_CSS);
        await loadScript(MOYASAR_JS);
        if (cancelled) return;
        if (!window.Moyasar) throw new Error('Moyasar.js unavailable');

        // Always start from a clean container. Moyasar.init appends its
        // form to the element; on a re-init (new session on the same
        // mounted component) a leftover form would otherwise stack up or
        // leave the box stuck on the loader.
        if (formRef.current) formRef.current.innerHTML = '';

        window.Moyasar.init({
          element: '.mysr-form',
          // amount is already in halalas (1 SAR = 100) — pass as-is.
          amount: config.amount,
          currency: config.currency,
          description: config.description,
          publishable_api_key: config.publishable_key,
          // callback_url is set by the backend — pass it straight through.
          callback_url: config.callback_url,
          // Apple Pay is intentionally omitted for now: Moyasar requires
          // an apple_pay config block with `label`, `country` and a
          // `validate_merchant_url` (a backend endpoint that validates the
          // Apple Pay merchant session). Until that backend piece exists,
          // enabling 'applepay' makes Moyasar.js throw "Apple Pay label is
          // required" etc. and refuse to render the form. To re-enable:
          // add 'applepay' back here and an apple_pay: { label, country,
          // validate_merchant_url, save_card: true } block below.
          methods: ['creditcard', 'stcpay'],
          // metadata must be forwarded unchanged.
          metadata: config.metadata,
          // Recurring renewals on the backend need a reusable card
          // token from this first payment. In current Moyasar.js the
          // save-card flag lives under each method (verified against
          // docs.moyasar.com form-configuration), not at the top level.
          credit_card: { save_card: true },
        });

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (cancelled) return;
        // http.js normalizes errors onto `.status` (not e.response.status).
        const s = e?.status;
        setError(
          s === 404
            ? t('subscribe.pay.errors.expired')
            : s === 403
              ? t('subscribe.pay.errors.forbidden')
              : t('subscribe.pay.errors.generic'),
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /* ---- Error state — mirrors the SubscribeCancel card style ---- */
  if (error) {
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

          <p
            className="m-0 mx-auto mb-7"
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
              maxWidth: 380,
            }}
          >
            {error}
          </p>

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
            {t('subscribe.pay.backToPlans')}
          </button>
        </div>
      </div>
    );
  }

  /* ---- Form state ---- */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{
        background:
          'radial-gradient(125% 125% at 50% 0%, var(--bg-surface) 0%, var(--bg-canvas) 58%)',
      }}
    >
      <div
        className="w-full max-w-[480px] rounded-[24px] overflow-hidden animate-fade-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Brand accent strip across the top of the card. */}
        <div
          style={{
            height: 4,
            background:
              'linear-gradient(90deg, var(--bg-ink-deep), #136d4a 58%, #1f9d6b)',
          }}
        />

        <div style={{ padding: '36px 30px 32px' }}>
          <div className="text-center mb-7">
            <div
              className="mx-auto flex items-center justify-center mb-4"
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: 'rgba(19,109,74,0.10)',
                color: '#0d5538',
              }}
            >
              <CreditCard size={26} strokeWidth={1.8} />
            </div>

            <h1
              className="font-display m-0 mb-3"
              style={{
                fontSize: 'clamp(20px, 3vw, 26px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: 'var(--text-ink)',
              }}
            >
              {t('subscribe.pay.title')}
            </h1>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(19,109,74,0.10)',
                color: '#0d5538',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <ShieldCheck size={13} strokeWidth={2.2} />
              {t('subscribe.pay.secureNote')}
            </div>
          </div>

          {loading && (
            <div
              className="flex flex-col items-center justify-center gap-3 py-10"
              style={{ color: 'var(--text-muted)' }}
            >
              <Loader2 size={28} className="animate-spin" />
              <span style={{ fontSize: 13.5 }}>
                {t('subscribe.pay.loading')}
              </span>
            </div>
          )}

          {/* Card number / expiry / CVV must always read LTR, regardless
              of the app's RTL direction. Keep the Moyasar form isolated. */}
          <div dir="ltr" className="mysr-form" ref={formRef} />
        </div>
      </div>
    </div>
  );
}
