import React, { useState } from 'react';
import { Check, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Field from '../form/Field';
import SelectField from '../form/SelectField';
import { useTranslation } from '../../i18n/LanguageContext';
import { submitRasdLead, normalizeSaudiPhone } from '../../utils/leads';
import rasdLogo from '../../assets/products/rasd.png';

/* ============================================================
 *  RasdSection — رصد on the landing page.
 *  ----------------------------------------------------------------
 *  Top: the pitch on one side, an illustrative project card + alert
 *  on the other (static mock data — it shows what a رصد record looks
 *  like, it is not a real project). Bottom: a full-width «مهتم برصد؟»
 *  callback form.
 *
 *  The form is a LEAD, not a signup: it goes to the sales team's
 *  Google Sheet (utils/leads.js → submitRasdLead). رصد is sold with a
 *  conversation, so the ask is a phone number and a human calls back.
 *  Sector stays on the form even though the design dropped it — it's
 *  the column the sales team filters the sheet on.
 *
 *  Every رصد CTA in the app lands on #rasd (RASD_CTA_ROUTE).
 * ============================================================ */

/* Stable slugs, localized labels. The slug is what lands in the
   sheet, so a label edit here never breaks the sales team's filters. */
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

const POINTS = ['projects', 'reports', 'decisionMakers'];
const GAPS = ['main', 'engineering', 'mep', 'elevators'];
const FIT = 86;

const ACCENT = '#8a6d2f';
const ACCENT_DARK = '#6e5626';

const EMPTY_FORM = { name: '', company: '', phone: '', email: '', sector: '' };

export default function RasdSection() {
  const { t, lang, dir } = useTranslation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  // null | 'new' | 'duplicate' — the two success shapes read
  // differently to someone who already filled this in last week.
  const [sent, setSent] = useState(null);
  const [failed, setFailed] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
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

  // «… رقم مرجعي موحّد {taid} من الترخيص …» — TAID is Latin inside
  // an RTL sentence, so it gets its own LTR span.
  const [leadBefore, leadAfter = ''] = t('landing.rasd.lead').split('{taid}');

  return (
    <section
      id="rasd"
      className="relative py-20 lg:py-24 scroll-mt-20 overflow-hidden"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">
          {/* ---------- The pitch ---------- */}
          <div className="animate-fade-up">
            <img
              src={rasdLogo}
              alt={t('landing.rasd.logoAlt')}
              className="block mb-6"
              style={{ height: 64, width: 'auto' }}
            />
            <h2
              className="font-display m-0 mb-4"
              style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.35,
                color: 'var(--text-brand-deep)',
              }}
            >
              {t('landing.rasd.title')}
            </h2>
            <p
              className="m-0 max-w-[600px]"
              style={{ fontSize: 16, lineHeight: 1.95, color: 'var(--text-muted)' }}
            >
              {leadBefore}
              <span dir="ltr">(TAID)</span>
              {leadAfter}
            </p>

            <ul className="m-0 p-0 grid gap-3 mt-6 mb-7">
              {POINTS.map((key) => (
                <li key={key} className="list-none flex items-center gap-2.5">
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: `${ACCENT}1f`,
                      color: ACCENT,
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-ink)' }}>
                    {t(`landing.rasd.points.${key}`)}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('rasd-lead')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
              className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
              style={{
                fontSize: 14.5,
                padding: '13px 24px',
                background: 'var(--bg-ink-deep)',
                color: 'white',
                border: '1px solid var(--bg-ink-deep)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-ink-deep-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-ink-deep)')}
            >
              {t('landing.rasd.cta')}
              <ArrowLeft
                size={15}
                strokeWidth={2.2}
                style={{ transform: dir === 'rtl' ? 'none' : 'rotate(180deg)' }}
              />
            </button>
          </div>

          {/* ---------- Illustrative card + alert ---------- */}
          <RasdMock t={t} />
        </div>

        {/* ---------- The callback request ---------- */}
        <div
          id="rasd-lead"
          className="rounded-[22px] mt-14 animate-fade-up scroll-mt-24"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
            padding: 'clamp(24px, 4vw, 44px)',
          }}
        >
          <h3
            className="font-display m-0"
            style={{ fontSize: 'clamp(22px, 2.4vw, 28px)', fontWeight: 700, color: 'var(--text-ink)' }}
          >
            {t('landing.rasd.form.title')}
          </h3>
          <p
            className="m-0 mt-2 mb-6"
            style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-muted)' }}
          >
            {t('landing.rasd.form.subtitle')}
          </p>

          {sent ? (
            <SentState kind={sent} t={t} onAgain={() => setSent(null)} />
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="rasd-fields">
                <Field
                  label={t('rasd.landing.form.name')}
                  placeholder={t('rasd.landing.form.namePlaceholder')}
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  autoComplete="name"
                />
                <Field
                  label={t('rasd.landing.form.company')}
                  placeholder={t('rasd.landing.form.companyPlaceholder')}
                  value={form.company}
                  onChange={set('company')}
                  required={false}
                  autoComplete="organization"
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
              </div>

              {failed && (
                <p
                  className="m-0 mt-3"
                  style={{ fontSize: 12.5, color: 'var(--accent-danger)', lineHeight: 1.7 }}
                >
                  {failed}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                <span style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {t('rasd.landing.form.privacy')}
                </span>
                {/* The gold is set inline, which beats .btn-primary's
                    own :hover rule — so the hover shade is driven from
                    here too. */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy}
                  style={{
                    width: 'auto',
                    padding: '13px 32px',
                    background: ACCENT,
                    borderColor: ACCENT,
                    boxShadow: `0 6px 14px ${ACCENT}33`,
                  }}
                  onMouseEnter={(e) => {
                    if (!busy) e.currentTarget.style.background = ACCENT_DARK;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = ACCENT;
                  }}
                >
                  {busy ? t('rasd.landing.form.sending') : t('landing.rasd.form.submit')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .rasd-fields {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px 14px;
          align-items: start;
        }
        @media (max-width: 1100px) { .rasd-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px)  { .rasd-fields { grid-template-columns: 1fr; } }

        .rv-wrap { position: relative; display: flex; justify-content: center; padding: 12px 0 0; }
        .rv-rings {
          position: absolute;
          width: 620px;
          height: 620px;
          inset-inline-end: -240px;
          top: -150px;
          border-radius: 50%;
          background: repeating-radial-gradient(circle, rgba(253,188,90,.5) 0 10px, transparent 10px 30px);
          opacity: .5;
          -webkit-mask-image: radial-gradient(circle, #000 35%, transparent 70%);
          mask-image: radial-gradient(circle, #000 35%, transparent 70%);
          pointer-events: none;
        }
        .rv-stack { position: relative; width: min(100%, 400px); padding-bottom: 76px; }
        .rv-card {
          position: relative;
          z-index: 1;
          background: #fff;
          border: 1px solid #e6e6ef;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 30px 60px -30px rgba(26,28,92,.35);
          color: #14163f;
        }
        .rv-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .rv-status { background: #fdbc5a; color: #1a1c5c; font-weight: 700; font-size: 11.5px; border-radius: 999px; padding: 3px 10px; }
        .rv-id { font-size: 11px; color: #6b6d80; letter-spacing: .02em; }
        .rv-card h4 { font-size: 20px; font-weight: 700; line-height: 1.4; color: #0e1580; margin: 12px 0 2px; }
        .rv-loc { margin: 0; color: #6b6d80; font-size: 12.5px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
        .rv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 16px; margin: 13px 0; }
        .rv-grid div { margin: 0; }
        .rv-grid dt { font-size: 11px; color: #6b6d80; }
        .rv-grid dd { margin: 3px 0 0; font-weight: 700; color: #0e1580; font-size: 13.5px; line-height: 1.6; }
        .rv-wide { grid-column: 1 / -1; }
        .rv-gaps { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-top: 12px; border-top: 1px solid #eee; }
        .rv-gaps-t { width: 100%; font-size: 11px; color: #8a8e9f; margin-bottom: 2px; }
        .rv-chip { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #fdf3e1; color: #8a6416; border: 1px solid #f6dfb4; }
        .rv-fit { display: flex; justify-content: space-between; font-size: 12px; color: #6b6d80; margin-top: 13px; }
        .rv-fit b { color: #0e1580; font-size: 13.5px; }
        .rv-bar { height: 7px; border-radius: 999px; background: #fcefd6; margin: 6px 0 14px; overflow: hidden; }
        .rv-bar i { display: block; height: 100%; background: #f4bd63; border-radius: 999px; }
        .rv-actions { display: flex; gap: 8px; }
        .rv-btn { flex: 1; text-align: center; font-weight: 700; font-size: 12.5px; border: 1px solid #e3e3ec; border-radius: 10px; padding: 9px 0; color: #0e1580; }
        .rv-primary { background: #0e1580; border-color: #0e1580; color: #fff; }
        .rv-toast {
          position: absolute;
          z-index: 2;
          bottom: 0;
          inset-inline-end: -48px;
          width: 250px;
          background: #0e1580;
          color: #fff;
          border-radius: 13px;
          padding: 11px 13px;
          box-shadow: 0 24px 40px -20px rgba(14,21,128,.6);
        }
        .rv-toast-h { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: rgba(255,255,255,.7); margin-bottom: 4px; }
        .rv-toast-h img { height: 16px; background: #fff; border-radius: 4px; padding: 2px 3px; }
        .rv-toast p { margin: 0; font-size: 12px; line-height: 1.7; }
        .rv-cap { text-align: center; margin: 14px 0 0; font-size: 12px; color: var(--text-muted); opacity: .75; }
        @media (max-width: 700px) {
          .rv-toast { inset-inline-end: -6px; width: 88%; }
        }
      `}</style>
    </section>
  );
}

/* The illustration. Fixed light colours on purpose — it's a picture
   of a رصد card, and reads the same in either theme. */
function RasdMock({ t }) {
  const m = (k) => t(`landing.rasd.mock.${k}`);
  return (
    <div className="animate-fade-up" style={{ animationDelay: '0.08s' }}>
      <div className="rv-wrap" aria-label={m('caption')} role="img">
        <div className="rv-rings" aria-hidden />
        <div className="rv-stack" aria-hidden>
          <div className="rv-card">
            <div className="rv-top">
              <span className="rv-status">{m('status')}</span>
              <span className="rv-id" dir="ltr">PRJ-0418</span>
            </div>
            <h4>{m('name')}</h4>
            <p className="rv-loc">{m('loc')}</p>
            <dl className="rv-grid">
              <div>
                <dt>{m('valueLabel')}</dt>
                <dd>{m('value')}</dd>
              </div>
              <div>
                <dt>{m('areaLabel')}</dt>
                <dd>
                  <span dir="ltr">48,250</span> {m('areaUnit')}
                </dd>
              </div>
              <div>
                <dt>{m('unitsLabel')}</dt>
                <dd>{m('units')}</dd>
              </div>
              <div>
                <dt>{m('licenseLabel')}</dt>
                <dd>{m('license')}</dd>
              </div>
              <div className="rv-wide">
                <dt>{m('developerLabel')}</dt>
                <dd>{m('developer')}</dd>
              </div>
            </dl>
            <div className="rv-gaps">
              <span className="rv-gaps-t">{m('gapsTitle')}</span>
              {GAPS.map((g) => (
                <span key={g} className="rv-chip">
                  {t(`landing.rasd.mock.gaps.${g}`)}
                </span>
              ))}
            </div>
            <div className="rv-fit">
              <span>{m('fit')}</span>
              <b dir="ltr">{FIT}%</b>
            </div>
            <div className="rv-bar">
              <i style={{ width: `${FIT}%` }} />
            </div>
            <div className="rv-actions">
              <span className="rv-btn rv-primary">{m('reveal')}</span>
              <span className="rv-btn">{m('save')}</span>
            </div>
          </div>
          <div className="rv-toast">
            <div className="rv-toast-h">
              <img src={rasdLogo} alt="" />
              <span>{m('toastHead')}</span>
            </div>
            <p>{m('toast')}</p>
          </div>
        </div>
      </div>
      <p className="rv-cap">{m('caption')}</p>
    </div>
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
      <p className="m-0" style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)' }}>
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
