import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  LayoutGrid,
  Tag,
  Check,
  Copy,
  BadgeCheck,
  Users,
  TrendingUp,
  Send,
  Handshake,
  Building2,
  Store,
} from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import Field from '../components/form/Field';
import SelectField from '../components/form/SelectField';
import TextareaField from '../components/form/TextareaField';
import PhoneField, { isValidSaudiPhone } from '../components/form/PhoneField';
import { useTranslation } from '../i18n/LanguageContext';
import { partners as partnersApi } from '../services';
import { PARTNER_SECTORS, sectorFor } from '../config/partnerSectors';

/* ============================================================
 *  PartnersPage — /partners ("شركاء تعاهد")
 *  ----------------------------------------------------------------
 *  Public marketing + directory page for the "Become a Partner"
 *  program. Three parts:
 *    1. Hero — title, search, and a live stat strip.
 *    2. Directory — sector filter pills + the grid of APPROVED
 *       partners fetched from the API. Starts empty and fills in as
 *       admins approve applications (see services/partners.js
 *       listApproved — degrades to empty until the BE ships the
 *       public listing endpoint).
 *    3. Apply form — wired to POST /api/partners/apply.
 *
 *  Uses the shared landing Navbar + Footer like /contact and
 *  /services so it sits inside the public chrome.
 * ============================================================ */

export default function PartnersPage() {
  const { t } = useTranslation();

  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSector, setActiveSector] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Directory rows drive the grid; the stats endpoint drives the
    // hero numbers (accurate totals even when the grid is paginated).
    // Both are best-effort — a failure just leaves the page in its
    // loading/empty state rather than breaking.
    Promise.all([
      partnersApi.listApproved().catch(() => []),
      partnersApi.stats().catch(() => null),
    ])
      .then(([rows, s]) => {
        if (cancelled) return;
        setList(rows);
        setStats(s);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve a row's sector display label from the taxonomy, falling
  // back to the raw stored string for off-list sectors.
  const sectorLabel = (value) => {
    const s = sectorFor(value);
    return s ? t(`partners.sectors.${s.key}`) : value || '';
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((p) => {
      if (activeSector !== 'all') {
        const s = sectorFor(p.sector);
        if (!s || s.key !== activeSector) return false;
      }
      if (!q) return true;
      return (
        (p.company_name || '').toLowerCase().includes(q) ||
        (p.offer || '').toLowerCase().includes(q) ||
        sectorLabel(p.sector).toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, activeSector, query, t]);

  // Sectors actually represented in the approved set — drives the
  // "N قطاعات" stat and which filter pills are worth showing.
  const sectorsRepresented = useMemo(
    () => new Set(list.map((p) => sectorFor(p.sector)?.key).filter(Boolean)).size,
    [list]
  );

  const scrollToApply = () => {
    document
      .getElementById('partner-apply')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Navbar />
      {/* Clear the fixed navbar — 68px tall on mobile, 116px on desktop. */}
      <main className="pt-[68px] lg:pt-[116px]" style={{ background: 'var(--bg-canvas)' }}>
        <Hero
          t={t}
          query={query}
          setQuery={setQuery}
          onBecomePartner={scrollToApply}
          partnersCount={stats?.partner_count ?? list.length}
          sectorsCount={stats?.sector_count ?? sectorsRepresented}
        />

        <section className="relative pb-20 lg:pb-28">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
            <SectorFilter t={t} active={activeSector} onChange={setActiveSector} />

            {loading ? (
              <SkeletonGrid />
            ) : visible.length === 0 ? (
              <EmptyState
                t={t}
                isFiltered={list.length > 0}
                onReset={() => {
                  setQuery('');
                  setActiveSector('all');
                }}
                onApply={scrollToApply}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-10">
                {visible.map((p, i) => (
                  <PartnerCard
                    key={p.id ?? i}
                    partner={p}
                    sectorLabel={sectorLabel(p.sector)}
                    t={t}
                    delay={i * 0.05}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <ApplySection t={t} />
      </main>
      <Footer />
    </>
  );
}

/* ============================================================
 *  Hero — eyebrow, title, search, stat strip.
 * ============================================================ */
function Hero({ t, query, setQuery, onBecomePartner, partnersCount, sectorsCount }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-canvas) 100%)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div className="relative max-w-[900px] mx-auto px-6 lg:px-12 py-16 lg:py-20 text-center">
        <div
          className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full animate-fade-up"
          style={{
            background: 'rgba(184,134,42,0.12)',
            border: '1px solid rgba(184,134,42,0.24)',
            color: '#8a6a1f',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <Sparkles size={13} strokeWidth={2} />
          {t('partners.hero.eyebrow')}
        </div>

        <h1
          className="font-display m-0 mb-4 animate-fade-up"
          style={{
            fontSize: 'clamp(30px, 4.4vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            color: 'var(--text-brand-deep)',
          }}
        >
          {t('partners.hero.title')}
        </h1>

        <p
          className="m-0 mb-9 mx-auto animate-fade-up"
          style={{
            fontSize: 15.5,
            lineHeight: 1.85,
            maxWidth: 620,
            color: 'var(--text-muted)',
          }}
        >
          {t('partners.hero.subtitle')}
        </p>

        {/* Search */}
        <div className="relative max-w-[620px] mx-auto animate-fade-up">
          <div
            className="absolute top-1/2 -translate-y-1/2 end-5 pointer-events-none flex"
            style={{ color: 'var(--text-muted)' }}
          >
            <Search size={19} strokeWidth={1.8} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('partners.hero.searchPlaceholder')}
            aria-label={t('partners.hero.searchPlaceholder')}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 999,
              outline: 0,
              padding: '16px 56px 16px 22px',
              fontSize: 15,
              color: 'var(--text-ink)',
              fontFamily: 'inherit',
              boxShadow: 'var(--shadow-card)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2c2f7c';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(44,47,124,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
            }}
          />
        </div>

        {/* Stats — only meaningful once partners exist. */}
        {partnersCount > 0 && (
          <div className="flex items-stretch justify-center gap-6 lg:gap-12 mt-10 animate-fade-up flex-wrap">
            <Stat value={`+${partnersCount}`} label={t('partners.hero.stats.partnersLabel')} />
            <StatDivider />
            <Stat value={String(sectorsCount)} label={t('partners.hero.stats.sectorsLabel')} />
          </div>
        )}

        <button
          type="button"
          onClick={onBecomePartner}
          className="inline-flex items-center gap-2 mt-10 font-semibold animate-fade-up"
          style={{
            padding: '13px 26px',
            background: '#2c2f7c',
            color: 'white',
            border: '1px solid #2c2f7c',
            borderRadius: 11,
            fontSize: 14.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 6px 14px rgba(44,47,124,0.18)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2258')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2c2f7c')}
        >
          <Handshake size={16} strokeWidth={1.9} />
          {t('partners.hero.becomePartner')}
        </button>
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-display"
        style={{
          fontSize: 'clamp(22px, 2.6vw, 30px)',
          fontWeight: 800,
          color: 'var(--text-brand-deep)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>
        {label}
      </span>
    </div>
  );
}

function StatDivider() {
  return (
    <span
      aria-hidden
      style={{ width: 1, background: 'var(--border-default)', alignSelf: 'stretch' }}
    />
  );
}

/* ============================================================
 *  SectorFilter — "الكل" + one pill per sector.
 * ============================================================ */
function SectorFilter({ t, active, onChange }) {
  const pills = [{ key: 'all', icon: LayoutGrid, accent: '#2c2f7c' }, ...PARTNER_SECTORS];
  return (
    <div className="flex flex-wrap justify-center gap-2.5 mt-2">
      {pills.map((p) => {
        const Icon = p.icon;
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            className="inline-flex items-center gap-2 font-semibold transition-all"
            style={{
              padding: '9px 16px',
              borderRadius: 999,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: isActive ? '#2c2f7c' : 'var(--bg-surface)',
              color: isActive ? 'white' : 'var(--text-ink-soft)',
              border: `1px solid ${isActive ? '#2c2f7c' : 'var(--border-default)'}`,
              boxShadow: isActive ? '0 6px 14px rgba(44,47,124,0.18)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
          >
            <Icon size={14} strokeWidth={1.9} />
            {p.key === 'all' ? t('partners.filter.all') : t(`partners.sectors.${p.key}`)}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
 *  PartnerCard — one directory entry (approved partner).
 * ============================================================ */
function PartnerCard({ partner, sectorLabel, t, delay }) {
  const navigate = useNavigate();
  const sector = sectorFor(partner.sector);
  const Icon = sector?.icon || Building2;
  const accent = sector?.accent || '#2c2f7c';
  const [copied, setCopied] = useState(false);

  // Guests get has_code:true but no code — the BE only returns the
  // code to authenticated requests. Send them to login (and back).
  const isGuest = !partner.code;

  const revealCode = async () => {
    if (isGuest) {
      navigate('/login', { state: { from: '/partners' } });
      return;
    }
    try {
      await navigator.clipboard?.writeText(partner.code);
    } catch {
      /* clipboard unavailable (insecure context) — still reveal */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <article
      className="flex flex-col rounded-[18px] animate-fade-up transition-all hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
        animationDelay: `${delay}s`,
        overflow: 'hidden',
      }}
    >
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 50, height: 50, borderRadius: 13, background: `${accent}14`, color: accent }}
          >
            <Icon size={24} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="font-display m-0 mb-1.5 truncate"
              style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-ink)' }}
            >
              {partner.company_name}
            </h3>
            <div
              className="inline-flex items-center gap-1.5"
              style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}
            >
              <BadgeCheck size={13} strokeWidth={2} style={{ color: '#136d4a' }} />
              {t('partners.card.verified')}
              {sectorLabel && (
                <>
                  <span style={{ opacity: 0.5 }}>·</span>
                  {sectorLabel}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Offer */}
        <div
          className="flex items-start gap-2.5 rounded-[12px] mt-auto"
          style={{
            background: 'rgba(184,134,42,0.08)',
            border: '1px solid rgba(184,134,42,0.2)',
            padding: '12px 14px',
          }}
        >
          <Tag size={15} strokeWidth={2} style={{ color: '#8a6a1f', marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-ink-soft)', fontWeight: 500 }}>
            {partner.offer || t('partners.card.noOffer')}
          </span>
        </div>
      </div>

      {/* Footer: reveal-code button. Shown whenever the partner has a
          code — for guests the BE omits the actual code, so the button
          prompts login instead of revealing it. */}
      {partner.has_code && (
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border-soft)', background: 'var(--bg-canvas)' }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {t('partners.card.exclusiveOffer')}
          </div>
          <button
            type="button"
            onClick={revealCode}
            className="inline-flex items-center gap-2 font-semibold flex-shrink-0 transition-all"
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: copied ? 'rgba(19,109,74,0.1)' : '#2c2f7c',
              color: copied ? '#136d4a' : 'white',
              border: `1px solid ${copied ? 'rgba(19,109,74,0.3)' : '#2c2f7c'}`,
              whiteSpace: 'nowrap',
              direction: copied ? 'ltr' : undefined,
            }}
            title={isGuest ? undefined : partner.code}
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.4} />
                {partner.code}
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2} />
                {isGuest ? t('partners.card.loginToGet') : t('partners.card.getCode')}
              </>
            )}
          </button>
        </div>
      )}
    </article>
  );
}

/* ============================================================
 *  Skeleton + empty
 * ============================================================ */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-10">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[18px] animate-pulse"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', height: 240 }}
        />
      ))}
    </div>
  );
}

function EmptyState({ t, isFiltered, onReset, onApply }) {
  return (
    <div
      className="flex flex-col items-center text-center py-16 px-6 rounded-[18px] mt-10 animate-fade-up"
      style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-default)' }}
    >
      <div
        className="flex items-center justify-center mb-5"
        style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--bg-canvas)', color: 'var(--text-muted)' }}
      >
        {isFiltered ? <Search size={26} strokeWidth={1.6} /> : <Store size={26} strokeWidth={1.6} />}
      </div>
      <h3 className="font-display m-0 mb-2" style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-ink)' }}>
        {isFiltered ? t('partners.empty.title') : t('partners.empty.noneTitle')}
      </h3>
      <p className="m-0 mb-6 max-w-md" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}>
        {isFiltered ? t('partners.empty.subtitle') : t('partners.empty.noneSubtitle')}
      </p>
      <button
        type="button"
        onClick={isFiltered ? onReset : onApply}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] font-semibold"
        style={{
          background: isFiltered ? 'var(--bg-surface)' : '#2c2f7c',
          color: isFiltered ? 'var(--text-ink-soft)' : 'white',
          fontSize: 13.5,
          border: isFiltered ? '1px solid var(--border-default)' : '1px solid #2c2f7c',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {isFiltered ? t('partners.empty.reset') : t('partners.empty.noneCta')}
      </button>
    </div>
  );
}

/* ============================================================
 *  ApplySection — "كن شريكاً في تعاهد" form.
 *  Wired to POST /api/partners/apply.
 * ============================================================ */
const PERKS = [
  { key: 'reach', icon: Users },
  { key: 'badge', icon: BadgeCheck },
  { key: 'listing', icon: TrendingUp },
];

function ApplySection({ t }) {
  const { dir } = useTranslation();

  const [form, setForm] = useState({
    company_name: '',
    sector: '',
    email: '',
    phone: '',
    offer: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const sectorOptions = PARTNER_SECTORS.map((s) => ({
    value: s.canonical,
    label: t(`partners.sectors.${s.key}`),
  }));

  const validate = () => {
    const e = {};
    if (!form.company_name.trim()) e.company_name = t('partners.form.errors.companyRequired');
    if (!form.sector) e.sector = t('partners.form.errors.sectorRequired');
    if (!form.email.trim()) e.email = t('partners.form.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = t('partners.form.errors.emailInvalid');
    if (!form.phone.trim()) e.phone = t('partners.form.errors.phoneRequired');
    else if (!isValidSaudiPhone(form.phone)) e.phone = t('partners.form.errors.phoneInvalid');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const digits = form.phone.replace(/\D/g, '').replace(/^0+/, '');
      await partnersApi.apply({
        company_name: form.company_name.trim(),
        sector: form.sector,
        email: form.email.trim(),
        phone: `+966${digits}`,
        offer: form.offer.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      if (err?.status === 422 && err?.data?.errors) {
        const mapped = {};
        for (const [field, msgs] of Object.entries(err.data.errors)) {
          mapped[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setErrors((prev) => ({ ...prev, ...mapped }));
      } else if (err?.status === 429) {
        setSubmitError(t('partners.form.errors.throttle'));
      } else {
        setSubmitError(err?.message || t('partners.form.errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="partner-apply"
      className="relative py-20 lg:py-24 scroll-mt-20"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-soft)' }}
    >
      <div className="max-w-[760px] mx-auto px-6 lg:px-12">
        <div className="text-center mb-9">
          <h2
            className="font-display m-0 mb-4"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 38px)',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              color: 'var(--text-brand-deep)',
            }}
          >
            {t('partners.form.title')}
          </h2>
          <p
            className="m-0 mx-auto"
            style={{ fontSize: 14.5, lineHeight: 1.85, maxWidth: 580, color: 'var(--text-muted)' }}
          >
            {t('partners.form.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 mb-9">
          {PERKS.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="inline-flex items-center gap-2"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-ink-soft)' }}
            >
              <Icon size={15} strokeWidth={1.9} style={{ color: '#b8862a' }} />
              {t(`partners.form.perks.${key}`)}
            </div>
          ))}
        </div>

        {done ? (
          <SuccessCard t={t} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-[20px] p-6 lg:p-8"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
            noValidate
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
              <Field
                label={t('partners.form.fields.company')}
                icon={Building2}
                value={form.company_name}
                onChange={set('company_name')}
                error={errors.company_name}
                placeholder={t('partners.form.fields.companyPlaceholder')}
                maxLength={255}
              />
              <SelectField
                label={t('partners.form.fields.sector')}
                value={form.sector}
                onChange={set('sector')}
                error={errors.sector}
                options={sectorOptions}
                placeholder={t('partners.form.fields.sectorPlaceholder')}
              />
              <Field
                label={t('partners.form.fields.email')}
                type="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                placeholder={t('partners.form.fields.emailPlaceholder')}
                maxLength={255}
              />
              <PhoneField
                label={t('partners.form.fields.phone')}
                value={form.phone}
                onChange={set('phone')}
                error={errors.phone}
              />
              <div className="sm:col-span-2">
                <TextareaField
                  label={t('partners.form.fields.offer')}
                  value={form.offer}
                  onChange={set('offer')}
                  error={errors.offer}
                  placeholder={t('partners.form.fields.offerPlaceholder')}
                  rows={3}
                  maxLength={2000}
                />
              </div>
            </div>

            {submitError && (
              <p className="field-err mt-4" style={{ textAlign: 'center' }}>
                {submitError}
              </p>
            )}

            <button type="submit" className="btn-primary mt-6" disabled={submitting}>
              {submitting ? (
                t('partners.form.submitting')
              ) : (
                <>
                  <Send
                    size={16}
                    strokeWidth={1.9}
                    style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }}
                  />
                  {t('partners.form.submit')}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function SuccessCard({ t }) {
  return (
    <div
      className="flex flex-col items-center text-center rounded-[20px] p-10 animate-fade-up"
      style={{ background: 'rgba(19,109,74,0.06)', border: '1px solid rgba(19,109,74,0.22)' }}
    >
      <div
        className="flex items-center justify-center mb-5"
        style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(19,109,74,0.12)', color: '#136d4a' }}
      >
        <Check size={30} strokeWidth={2.4} />
      </div>
      <h3 className="font-display m-0 mb-2.5" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-ink)' }}>
        {t('partners.form.success.title')}
      </h3>
      <p className="m-0 max-w-md" style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--text-muted)' }}>
        {t('partners.form.success.body')}
      </p>
    </div>
  );
}
