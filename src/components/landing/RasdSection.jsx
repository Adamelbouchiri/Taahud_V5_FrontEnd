import React, { useState } from 'react';
import { Check, Sparkles, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Field from '../form/Field';
import SelectField from '../form/SelectField';
import { useTranslation } from '../../i18n/LanguageContext';
import { submitRasdLead, normalizeSaudiPhone } from '../../utils/leads';

/* ============================================================
 *  RasdSection — رصد on the landing page.
 *  ----------------------------------------------------------------
 *  Two halves of one pitch. The left column explains what رصد does;
 *  the right is a callback request that goes to the sales team's
 *  Google Sheet (see utils/leads.js → submitRasdLead).
 *
 *  It is a LEAD form, not a signup: no account, no password, no
 *  backend of ours involved. رصد is sold with a conversation —
 *  someone walks the buyer through it on their own account — so the
 *  ask is a phone number, and the form says a human will call.
 *
 *  Six feature lines, not sixteen. Each is a thing رصد tells you
 *  that you can't get by refreshing a tenders portal.
 * ============================================================ */

/* Stable slugs, localized labels. The slug is what lands in the
   sheet, so a label edit here never breaks the sales team's filters
   and an Arabic column never has to be parsed back into a category. */
const SECTORS = [
  'general_contracting',
  'specialized_contracting',
  'real_estate_development',
  'engineering_office',
  'building_materials',
  'logistics_equipment',
  'finance_investment',
  'government',
  'other',
];

const FEATURES = ['tracking', 'openRoles', 'decisionMakers', 'fitScore', 'profiles', 'alerts'];

const ACCENT = '#8a6d2f';
const ACCENT_DARK = '#6e5626';

const EMPTY_FORM = { name: '', phone: '', email: '', sector: '', company: '' };

export default function RasdSection() {
  const { t, lang } = useTranslation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  // null | 'new' | 'duplicate' — the two success shapes read
  // differently to someone who already filled this in last week.
  const [sent, setSent] = useState(null);
  const [failed, setFailed] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    // Clear the field's error as soon as they start fixing it —
    // leaving it up while they type reads as "still wrong".
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = t('rasd.landing.form.errors.name');
    // Accepts what people actually type (05…), not just E.164 — the
    // normalization on the way to the sheet handles the rest.
    const digits = form.phone.replace(/\D/g, '');
    if (!/^0?5\d{8}$/.test(digits) && !/^9665\d{8}$/.test(digits)) {
      next.phone = t('rasd.landing.form.errors.phone');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = t('rasd.landing.form.errors.email');
    }
    if (!form.sector) next.sector = t('rasd.landing.form.errors.sector');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFailed('');
    if (!validate()) return;

    setBusy(true);
    const res = await submitRasdLead({
      name: form.name.trim(),
      phone: normalizeSaudiPhone(form.phone),
      email: form.email.trim(),
      sector: form.sector,
      company: form.company.trim(),
      // Which language the visitor was reading when they asked —
      // the person calling them back needs to know.
      lang,
      source: 'landing-rasd',
      page: typeof window !== 'undefined' ? window.location.href : '',
    });

    setBusy(false);
    if (res.ok) {
      setSent(res.duplicate ? 'duplicate' : 'new');
      setForm(EMPTY_FORM);
      return;
    }
    setFailed(t('rasd.landing.form.errors.submit'));
  };

  return (
    <section
      id="rasd"
      className="relative py-20 lg:py-28 scroll-mt-20"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-14 items-start">
          {/* ---------- The pitch ---------- */}
          <div className="animate-fade-up">
            <div
              className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
              style={{
                background: `${ACCENT}18`,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: ACCENT,
              }}
            >
              {t('rasd.landing.eyebrow')}
            </div>

            <h2
              className="font-display m-0 mb-4"
              style={{
                fontSize: 'clamp(26px, 3.4vw, 40px)',
                fontWeight: 700,
                lineHeight: 1.22,
                letterSpacing: '-0.015em',
                color: 'var(--text-brand-deep)',
              }}
            >
              {t('rasd.landing.title')}
            </h2>

            <p
              className="m-0 mb-7 max-w-[640px]"
              style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text-muted)' }}
            >
              {t('rasd.landing.subtitle')}
            </p>

            {/* The AI agent line gets its own strip: it's the part of
                رصد that does work for you rather than showing you
                data, so it shouldn't sit in the checklist. */}
            <div
              className="flex items-start gap-3 mb-8 rounded-[14px]"
              style={{
                background: 'rgba(58,61,153,0.07)',
                border: '1px solid rgba(58,61,153,0.16)',
                padding: '14px 16px',
              }}
            >
              <Sparkles
                size={17}
                strokeWidth={1.9}
                style={{ color: '#3a3d99', flexShrink: 0, marginTop: 2 }}
              />
              <p
                className="m-0"
                style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-ink-soft)' }}
              >
                <strong style={{ color: 'var(--text-ink)' }}>
                  {t('rasd.landing.agent.name')}
                </strong>{' '}
                {t('rasd.landing.agent.body')}
              </p>
            </div>

            <ul className="m-0 p-0 grid sm:grid-cols-2 gap-x-6 gap-y-3.5 mb-8">
              {FEATURES.map((key) => (
                <li key={key} className="list-none flex items-start gap-2.5">
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: `${ACCENT}1f`,
                      color: ACCENT,
                      marginTop: 2,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span
                    style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-ink-soft)' }}
                  >
                    {t(`rasd.landing.features.${key}`)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Every رصد CTA in the app now lands on THIS section, so
                this link can't send people away again — it walks them
                down to the callback form, which is the only way to get
                رصد today. (A subscriber who already has it reaches the
                module from the sidebar, not from a marketing page.) */}
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('rasd-lead')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
              className="inline-flex items-center gap-2"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 700,
                color: 'var(--accent-primary)',
                cursor: 'pointer',
              }}
            >
              {t('rasd.landing.more')}
              <ArrowLeft
                size={15}
                strokeWidth={2.2}
                style={{
                  // Points "forward" — left in RTL, right in LTR.
                  transform: lang === 'ar' || lang === 'ur' ? 'none' : 'rotate(180deg)',
                }}
              />
            </button>
          </div>

          {/* ---------- The callback request ---------- */}
          <div
            id="rasd-lead"
            className="rounded-[18px] animate-fade-up scroll-mt-24"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
              padding: '24px 22px',
              animationDelay: '0.08s',
            }}
          >
            <div
              className="inline-flex items-center px-3 py-1 rounded-full mb-4"
              style={{
                background: ACCENT,
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.03em',
              }}
            >
              {t('rasd.landing.form.badge')}
            </div>

            <h3
              className="font-display m-0 mb-2"
              style={{
                fontSize: 19,
                fontWeight: 700,
                lineHeight: 1.4,
                color: 'var(--text-ink)',
              }}
            >
              {t('rasd.landing.form.title')}
            </h3>
            <p
              className="m-0 mb-5"
              style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)' }}
            >
              {t('rasd.landing.form.subtitle')}
            </p>

            {sent ? (
              <SentState kind={sent} t={t} onAgain={() => setSent(null)} />
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
                <Field
                  label={t('rasd.landing.form.name')}
                  placeholder={t('rasd.landing.form.namePlaceholder')}
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  autoComplete="name"
                />
                <Field
                  label={t('rasd.landing.form.phone')}
                  placeholder={t('rasd.landing.form.phonePlaceholder')}
                  value={form.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <Field
                  label={t('rasd.landing.form.email')}
                  placeholder={t('rasd.landing.form.emailPlaceholder')}
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                  type="email"
                  autoComplete="email"
                />
                <SelectField
                  label={t('rasd.landing.form.sector')}
                  placeholder={t('rasd.landing.form.sectorPlaceholder')}
                  value={form.sector}
                  onChange={set('sector')}
                  error={errors.sector}
                  options={SECTORS.map((s) => ({
                    value: s,
                    label: t(`rasd.landing.sectors.${s}`),
                  }))}
                />
                <Field
                  label={t('rasd.landing.form.company')}
                  placeholder={t('rasd.landing.form.companyPlaceholder')}
                  value={form.company}
                  onChange={set('company')}
                  // The only optional field on the form — marked, so
                  // nobody abandons it wondering.
                  required={false}
                  autoComplete="organization"
                />

                {failed && (
                  <p
                    className="m-0"
                    style={{ fontSize: 12.5, color: 'var(--accent-danger)', lineHeight: 1.7 }}
                  >
                    {failed}
                  </p>
                )}

                {/* The gold is set inline, which beats .btn-primary's
                    own :hover rule — so the hover shade is driven from
                    here too, the way the other accent-recolored
                    buttons in the app do it. */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy}
                  style={{
                    background: ACCENT,
                    borderColor: ACCENT,
                    marginTop: 4,
                    boxShadow: `0 6px 14px ${ACCENT}33`,
                  }}
                  onMouseEnter={(e) => {
                    if (!busy) e.currentTarget.style.background = ACCENT_DARK;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = ACCENT;
                  }}
                >
                  {busy ? t('rasd.landing.form.sending') : t('rasd.landing.form.submit')}
                </button>

                <div
                  className="flex items-start gap-2 mt-1"
                  style={{ fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
                >
                  <ShieldCheck
                    size={13}
                    strokeWidth={1.9}
                    style={{ color: '#136d4a', flexShrink: 0, marginTop: 2 }}
                  />
                  <span>{t('rasd.landing.form.privacy')}</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Thank-you state. A repeat submission is told so plainly rather
   than thanked as if it were new — the sheet deduplicates, and
   pretending otherwise just invites a third attempt. */
function SentState({ kind, t, onAgain }) {
  return (
    <div className="flex flex-col items-center text-center py-6 gap-3">
      <span
        className="flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          borderRadius: 15,
          background: 'rgba(19,109,74,0.10)',
          color: '#136d4a',
        }}
      >
        <CheckCircle2 size={24} strokeWidth={1.8} />
      </span>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}>
        {t(`rasd.landing.form.sent.${kind}.title`)}
      </div>
      <p
        className="m-0"
        style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)' }}
      >
        {t(`rasd.landing.form.sent.${kind}.body`)}
      </p>
      <button
        type="button"
        onClick={onAgain}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--accent-primary)',
          cursor: 'pointer',
        }}
      >
        {t('rasd.landing.form.sent.again')}
      </button>
    </div>
  );
}
