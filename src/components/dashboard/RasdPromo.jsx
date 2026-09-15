import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import useRasdEnrollment from '../../hooks/useRasdEnrollment';
import { canUseRasd, RASD_CTA_ROUTE } from '../../config/rasdConstants';

/* ============================================================
 *  RasdPromo — the رصد strip on the dashboard.
 *  ----------------------------------------------------------------
 *  One banner, two jobs, decided by whether the account already has
 *  رصد (useRasdEnrollment):
 *
 *    not enrolled → "اشترك في رصد"  → /subscribe
 *    enrolled     → "أنت مشترك — افتح رصد" → /rasd
 *
 *  Never both, and never the wrong one: nothing renders while the
 *  answer is still loading. Flashing a subscribe CTA at someone who
 *  already pays for the add-on is the one failure this banner can
 *  actually cause, and a half-second of blank space costs less.
 *
 *  Hidden entirely from account types رصد isn't sold to — canUseRasd
 *  is the same rule the sidebar group and the /rasd routes use, so
 *  an individual never sees the module in any form.
 *
 *  The four chips are the product in four words. They're not links:
 *  a promo for something you may not own shouldn't hand out doors
 *  that 403.
 * ============================================================ */

const CHIPS = ['projects', 'companies', 'decisionMakers', 'alerts'];

/**
 * @param {string} accountType   gates the banner (individuals never see it)
 * @param {boolean} [spaced]     bottom margin. True (default) suits a
 *   margin-stacked page like DashboardHome; pass false inside a
 *   gap-spaced flex column, where the parent already owns the rhythm.
 */
export default function RasdPromo({ accountType, spaced = true }) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { enrolled, loading } = useRasdEnrollment();

  if (!canUseRasd(accountType)) return null;
  // See the note above — no banner beats the wrong banner.
  if (loading) return null;

  const forward = lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)';

  return (
    <div
      className={`flex items-center gap-4 flex-wrap animate-fade-up${
        spaced ? ' mb-9' : ''
      }`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: '16px 18px',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--accent-primary)',
          color: '#fff',
        }}
      >
        <Search size={19} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-display"
            style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {t('rasd.promo.title')}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 9px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 700,
              background: 'var(--accent-primary)',
              color: '#fff',
            }}
          >
            {t('rasd.promo.badge')}
          </span>
        </div>

        <p
          className="m-0 mt-1"
          style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
        >
          {t('rasd.promo.subtitle')}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
          {CHIPS.map((chip) => (
            <span
              key={chip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-ink-soft)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-canvas)',
              }}
            >
              {t(`rasd.promo.chips.${chip}`)}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        // Not enrolled → the landing section's callback form, not
        // checkout: رصد is sold by conversation for now.
        onClick={() => navigate(enrolled ? '/rasd' : RASD_CTA_ROUTE)}
        className="inline-flex items-center justify-center gap-2 flex-shrink-0"
        style={{
          padding: '11px 20px',
          borderRadius: 11,
          fontSize: 13.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          // The enrolled button is a door, not a sale — outlined in the
          // brand green so it reads as a state the user is already in,
          // while the subscribe CTA keeps the solid brand fill.
          ...(enrolled
            ? {
                background: 'rgba(19,109,74,0.08)',
                border: '1px solid rgba(19,109,74,0.32)',
                color: '#136d4a',
              }
            : {
                background: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                color: '#fff',
                boxShadow: '0 6px 14px rgba(44,47,124,0.20)',
              }),
        }}
      >
        {enrolled ? (
          <>
            <CheckCircle2 size={15} strokeWidth={2} />
            {t('rasd.promo.ctaEnrolled')}
          </>
        ) : (
          <>
            {t('rasd.promo.cta')}
            <ArrowLeft size={15} strokeWidth={2.2} style={{ transform: forward }} />
          </>
        )}
      </button>
    </div>
  );
}
