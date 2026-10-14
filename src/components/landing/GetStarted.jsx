import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { submitLead } from '../../utils/leads';

/* ============================================================
 *  GetStarted — affiliate-program band under the final CTA
 *  ----------------------------------------------------------------
 *  One slim row: «%» mark, «التسويق بالعمولة» + soon badge with a
 *  one-line pitch, and an email capture. The email goes to the
 *  Google Sheet via submitLead() (see src/utils/leads.js); the form
 *  then flips to a confirmed state regardless of network outcome.
 * ============================================================ */

export default function GetStarted() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const accent = '#b8862a';
  const accentSoft = 'rgba(184,134,42,0.12)';

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    submitLead(email.trim(), 'affiliate');
    setSubmitted(true);
  };

  return (
    <section
      id="get-started"
      aria-label={t('landing.getStarted.affiliate.title')}
      className="relative py-10 lg:py-12 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div
          className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 rounded-[18px] animate-fade-up"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            padding: '20px 22px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <span
            aria-hidden
            className="flex items-center justify-center flex-shrink-0 font-display"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: accentSoft,
              color: accent,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            %
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className="font-display m-0"
                style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('landing.getStarted.affiliate.title')}
              </h3>
              <span
                className="font-bold rounded-full"
                style={{
                  background: 'rgba(184,134,42,0.12)',
                  color: '#8a6a1f',
                  border: '1px solid rgba(184,134,42,0.28)',
                  fontSize: 10,
                  padding: '2px 8px',
                  letterSpacing: '0.05em',
                }}
              >
                {t('landing.roles.badges.soon')}
              </span>
            </div>
            <p
              className="m-0"
              style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
            >
              {t('landing.getStarted.affiliate.desc')}
            </p>
          </div>

          {submitted ? (
            <div
              className="inline-flex items-center gap-2 self-start md:self-center"
              style={{
                padding: '10px 14px',
                borderRadius: 11,
                background: 'rgba(19,109,74,0.08)',
                border: '1px solid rgba(19,109,74,0.22)',
                color: '#136d4a',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Check size={15} strokeWidth={2.3} />
              {t('landing.getStarted.affiliate.done')}
            </div>
          ) : (
            <form onSubmit={submit} className="flex gap-2 flex-wrap md:flex-nowrap md:w-[420px]">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('landing.getStarted.affiliate.placeholder')}
                aria-label={t('landing.getStarted.affiliate.placeholder')}
                className="flex-1 min-w-0"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 11,
                  outline: 0,
                  padding: '11px 14px',
                  fontSize: 13.5,
                  color: 'var(--text-ink)',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                className="font-semibold"
                style={{
                  padding: '11px 16px',
                  background: 'var(--bg-ink-deep)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 11,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('landing.getStarted.affiliate.cta')}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
