import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { RASD_CTA_ROUTE } from '../../config/rasdConstants';

/* ============================================================
 *  RasdAccessNotice — the `rasd.access` middleware's refusal.
 *  ----------------------------------------------------------------
 *  Shown instead of the page whenever a RASD endpoint answers 403.
 *
 *  The one rule that matters here: the BE's `message` is rendered
 *  VERBATIM and is never mapped onto copy of our own. A RASD 403 has
 *  four distinct causes —
 *
 *    the account owner has no RASD subscription
 *    the caller has no active membership on the account
 *    the account is suspended
 *    the global kill switch is off
 *
 *  — and three of them are things the user can act on. Collapsing
 *  them into one «لا تملك صلاحية» sends someone to support for
 *  something they could have fixed themselves.
 *
 *  Our own copy is therefore limited to the heading and the CTA,
 *  which say nothing about WHY. The CTA is the right action for the
 *  common case (no subscription) and harmless in the other three,
 *  where the message above it already explains that asking for the
 *  add-on isn't what's needed. It leads to the رصد section's callback
 *  form rather than a checkout — see RASD_CTA_ROUTE.
 *
 *  `message` may be null when the failure never reached the gate
 *  (offline, 500). The dictionary fallback covers that and only
 *  that — it is never used to paraphrase a message we DID receive.
 * ============================================================ */
export default function RasdAccessNotice({ message, onBack }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center animate-fade-up">
      <div
        className="mx-auto mb-6 flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--accent-primary)',
        }}
      >
        <Lock size={30} strokeWidth={1.7} />
      </div>

      <h2
        className="font-display m-0 mb-3"
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {t('rasd.access.title')}
      </h2>

      {/* The backend's own words, untouched. */}
      <p
        className="m-0"
        style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-muted)' }}
      >
        {message || t('rasd.access.unavailable')}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
        <button
          type="button"
          onClick={() => navigate(RASD_CTA_ROUTE)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 14,
            background: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)',
            cursor: 'pointer',
            boxShadow: '0 6px 14px rgba(44,47,124,0.22)',
          }}
        >
          <Crown size={15} strokeWidth={2} />
          {t('rasd.access.cta')}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary"
            style={{ width: 'auto' }}
          >
            <ArrowRight size={15} />
            {t('rasd.access.back')}
          </button>
        )}
      </div>
    </div>
  );
}
