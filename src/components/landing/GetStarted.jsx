import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Percent,
  BellRing,
  Check,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';

// Direct dictionary access — needed for array-valued keys (tags
// list). The shared t() helper only resolves leaf strings and
// returns undefined for arrays, so it falls back to the key
// string itself and arrays disappear from the rendered output.
const DICTS = { ar: arDict, en: enDict, zh: zhDict };
function lookupArray(lang, path) {
  const parts = path.split('.');
  let cur = DICTS[lang] || DICTS.ar;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return [];
  }
  return Array.isArray(cur) ? cur : [];
}

/* ============================================================
 *  GetStarted — "جاهز تبدأ مع تعاهد؟"
 *  ----------------------------------------------------------------
 *  Two cards side-by-side:
 *
 *    Academy   — coming-soon, lets the visitor leave their email
 *                for a launch notification (UI only — no backend
 *                wiring yet; submission flips to a confirmed state).
 *    Affiliate — "register your interest" CTA that points at the
 *                normal /register flow with affiliate intent.
 *
 *  Replaces the older UpcomingFeatures block. The conversion
 *  surface is identical (Academy + affiliate) but the layout
 *  is more interactive: email input on Academy, tag pills on
 *  Affiliate, and tighter visual rhythm overall.
 * ============================================================ */

export default function GetStarted() {
  const { t } = useTranslation();
  return (
    <section
      id="get-started"
      className="relative py-20 lg:py-24 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-center max-w-[640px] mx-auto mb-10 lg:mb-12">
          <h2
            className="font-display m-0 mb-3 animate-fade-up"
            style={{
              fontSize: 'clamp(24px, 3vw, 34px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: '#0f1147',
            }}
          >
            {t('landing.getStarted.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 14.5,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.getStarted.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          <AcademyCard t={t} />
          <AffiliateCard t={t} />
        </div>
      </div>
    </section>
  );
}


/* ============================================================
 *  AcademyCard — Taahud Academy, email-capture coming-soon
 * ============================================================ */
function AcademyCard({ t }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const accent = '#2c2f7c';
  const accentSoft = 'rgba(44,47,124,0.10)';

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    // No BE endpoint yet — flip the UI into a confirmed state.
    setSubmitted(true);
  };

  return (
    <article
      className="relative flex flex-col md:flex-row gap-4 rounded-[18px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: '22px 22px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Right icon (visual leading edge in RTL/LTR thanks to source order) */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: accentSoft,
          color: accent,
          alignSelf: 'flex-start',
        }}
      >
        <GraduationCap size={26} strokeWidth={1.7} />
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <h3
            className="font-display m-0"
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.getStarted.academy.title')}
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
            {t('landing.getStarted.academy.soon')}
          </span>
        </div>
        <p
          className="m-0 mb-4"
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-muted)',
          }}
        >
          {t('landing.getStarted.academy.desc')}
        </p>

        {submitted ? (
          <div
            className="inline-flex items-center gap-2 mt-auto self-start"
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
            {t('landing.getStarted.academy.notifyDone')}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-auto flex gap-2 flex-wrap">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('landing.getStarted.academy.placeholder')}
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
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${accentSoft}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 font-semibold"
              style={{
                padding: '11px 16px',
                background: accent,
                color: 'white',
                border: `1px solid ${accent}`,
                borderRadius: 11,
                fontSize: 13.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 6px 14px rgba(44,47,124,0.18)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1f2258';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = accent;
              }}
            >
              <BellRing size={14} strokeWidth={2} />
              {t('landing.getStarted.academy.notify')}
            </button>
          </form>
        )}
      </div>
    </article>
  );
}


/* ============================================================
 *  AffiliateCard — partner program teaser
 * ============================================================ */
function AffiliateCard({ t }) {
  const navigate = useNavigate();
  const { dir, lang } = useTranslation();
  const accent = '#b8862a';
  const accentSoft = 'rgba(184,134,42,0.12)';
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  // Read the tags array straight from the active dictionary —
  // t() resolves leaves only and would return undefined here.
  const tags = lookupArray(lang, 'landing.getStarted.affiliate.tags');

  return (
    <article
      className="relative flex flex-col md:flex-row gap-4 rounded-[18px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: '22px 22px',
        boxShadow: 'var(--shadow-card)',
        animationDelay: '0.05s',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: accentSoft,
          color: accent,
          alignSelf: 'flex-start',
        }}
      >
        <Percent size={26} strokeWidth={1.7} />
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <h3
          className="font-display m-0 mb-1.5"
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-ink)',
          }}
        >
          {t('landing.getStarted.affiliate.title')}
        </h3>
        <p
          className="m-0 mb-3"
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-muted)',
          }}
        >
          {t('landing.getStarted.affiliate.desc')}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-ink-soft)',
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/register')}
          className="mt-auto inline-flex items-center gap-1.5 font-semibold self-start"
          style={{
            padding: '11px 18px',
            background: accent,
            color: 'white',
            border: `1px solid ${accent}`,
            borderRadius: 11,
            fontSize: 13.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 6px 14px rgba(184,134,42,0.22)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#9a701f';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = accent;
          }}
        >
          {t('landing.getStarted.affiliate.cta')}
          <Arrow size={14} strokeWidth={2} />
        </button>
      </div>
    </article>
  );
}
