import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  GuaranteeStrip — slim "100% refund" reassurance band
 *  ----------------------------------------------------------------
 *  Single horizontal card with a shield icon on the leading edge,
 *  refund headline, links to the legal pages, and a "guaranteed"
 *  pill on the opposite side. Slots between the plans table and
 *  the conversion CTA to soften the pricing reveal — no big
 *  numbers, just the trust signal.
 * ============================================================ */

export default function GuaranteeStrip() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section
      className="relative py-10 lg:py-12 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[16px] animate-fade-up"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            padding: '18px 22px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Leading: shield + copy */}
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--bg-cream)',
                color: '#b8862a',
              }}
            >
              <ShieldCheck size={20} strokeWidth={1.85} />
            </div>
            <div className="min-w-0">
              <div
                className="flex flex-wrap items-baseline gap-x-2"
                style={{ fontSize: 14, color: 'var(--text-ink-soft)' }}
              >
                <span
                  className="font-bold"
                  style={{ color: '#b8862a', fontSize: 14.5 }}
                >
                  {t('landing.guarantee.title')}
                </span>
                <span style={{ color: 'var(--border-strong)' }}>|</span>
                <span style={{ color: 'var(--text-ink-soft)' }}>
                  {t('landing.guarantee.headline')}
                </span>
              </div>
              <div
                className="flex flex-wrap items-center gap-x-1 mt-1"
                style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
              >
                <span>{t('landing.guarantee.subjectTo')}</span>
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="font-semibold"
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    color: '#b8862a',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t('landing.guarantee.terms')}
                </button>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <button
                  type="button"
                  onClick={() => navigate('/refund-policy')}
                  className="font-semibold"
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    color: '#b8862a',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t('landing.guarantee.refundPolicy')}
                </button>
              </div>
            </div>
          </div>

          {/* Trailing: guaranteed pill */}
          <div
            className="inline-flex items-center gap-2 flex-shrink-0"
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              background: 'rgba(184,134,42,0.10)',
              border: '1px solid rgba(184,134,42,0.28)',
              color: '#8a6a1f',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#b8862a',
                display: 'inline-block',
              }}
            />
            {t('landing.guarantee.badge')}
          </div>
        </div>
      </div>
    </section>
  );
}
