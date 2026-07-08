import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Handshake,
  Building2,
  MapPin,
  Tag,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertCircle,
  ListChecks,
  User,
  Lock,
  Layers,
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import Field from '../components/form/Field';
import SelectField from '../components/form/SelectField';
import TextareaField from '../components/form/TextareaField';
import { projects as projectsApi, partnerships as partnershipsApi } from '../services';
import { useTranslation } from '../i18n/LanguageContext';
import { UserProvider, useUser } from '../contexts/UserContext';
import useArenaAddons from '../hooks/useArenaAddons';
import useFeatures from '../hooks/useFeatures';
import { isQuotaError, quotaErrorToCheck } from '../services/features';
import FeatureUpgradeNotice from '../components/FeatureUpgradeNotice';
import {
  OFFERING_TYPES,
  canApplyArena,
  canSeeProjectOwnerName,
  usesPartnershipOffers,
} from '../config/projectConstants';

/* ============================================================
 *  PartnershipOfferPage — /projects/:id/partner
 *  ----------------------------------------------------------------
 *  The Solidarity-arena counterpart to ApplyPage. Instead of a bid
 *  (cover_letter + bid_amount + delivery_date) the user submits a
 *  partnership offer: what they bring to the venture (offering_type),
 *  their firm, a capability brief, an optional proposed share, and a
 *  message to the opportunity owner.
 *  See PARTNERSHIP_REQUESTS_INTEGRATION.md.
 * ============================================================ */

export default function PartnershipOfferPageRoute() {
  return (
    <UserProvider>
      <PartnershipOfferPage />
    </UserProvider>
  );
}

function PartnershipOfferPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const { addons, loading: addonsLoading } = useArenaAddons();
  const { can, loading: featuresLoading, error: featuresError } = useFeatures();
  // This flow is solidarity-only, so "back to browse" always returns to
  // the solidarity arena — not the generic first-viewable arena (which
  // for an entrepreneur resolves to the public arena).
  const browseRoute = '/projects/solidarity';

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Set when the `submit_offers` quota blocks this offer — bids and
  // partnership offers share the counter (found up front or via a 403).
  const [upgradeInfo, setUpgradeInfo] = useState(null);

  const [offeringType, setOfferingType] = useState('');
  const [firmName, setFirmName] = useState('');
  const [capabilityBrief, setCapabilityBrief] = useState('');
  const [proposedShare, setProposedShare] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Wait for user context, the add-on map AND the feature snapshot so
    // the solidarity gate and the submit_offers quota gate below are
    // accurate — without them we'd fail-closed for actual subscribers.
    if (!user || addonsLoading || featuresLoading) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setUpgradeInfo(null);
    (async () => {
      try {
        const p = await projectsApi.get(id);
        if (cancelled) return;
        // Partnership offers only exist in the solidarity arena. If
        // the project is in another arena, this is the wrong flow —
        // point the user back to the standard bid page.
        if (!usesPartnershipOffers(p.arena)) {
          setLoadError(t('projects.partner.errorState.wrongArena'));
          return;
        }
        if (p.status !== 'open_for_bids') {
          setLoadError(t('projects.partner.errorState.notOpen'));
          return;
        }
        // Owners can't offer on their own opportunity (BE enforces;
        // this gives a clearer error than a 403).
        if (p.user_id && p.user_id === user.id) {
          setLoadError(t('projects.partner.errorState.ownProject'));
          return;
        }
        // Account-type + add-on gate (developer / entrepreneur /
        // engineering, with an active solidarity_addon).
        if (!canApplyArena(p.arena, user.account_type, addons)) {
          setLoadError(t('projects.partner.errorState.notEligible'));
          return;
        }
        // One offer per user per project. Trust the BE flags as a fast
        // path, but confirm against the offers list since the project
        // resource may not carry a reliable "has_offered" flag.
        if (p.has_applied || p.has_offered) {
          setLoadError(t('projects.partner.errorState.alreadyOffered'));
          return;
        }
        const myOffers = await partnershipsApi.list({ project_id: id });
        if (cancelled) return;
        if (myOffers.some((o) => o.partner?.id === user.id)) {
          setLoadError(t('projects.partner.errorState.alreadyOffered'));
          return;
        }
        // Proactive submit_offers quota gate — bids and partnership
        // offers share this monthly counter. Block the form up front
        // when the plan doesn't include it or the cap is hit. Skip when
        // the snapshot failed to load (endpoint down) — the 403 handler
        // still fails safe on submit.
        if (!featuresError) {
          const offers = can('submit_offers');
          if (!offers.has_feature || !offers.can_use) {
            setUpgradeInfo(offers);
            return;
          }
        }
        setProject(p);
      } catch (err) {
        if (!cancelled)
          setLoadError(err.message || t('projects.partner.errorState.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t, user, addons, addonsLoading, featuresLoading, featuresError, can]);

  const validate = () => {
    const e = {};
    if (!offeringType) {
      e.offering_type = t('projects.partner.validation.offeringMissing');
    }
    const firm = firmName.trim();
    if (!firm || firm.length < 2) {
      e.firm_name = t('projects.partner.validation.firmShort');
    }
    const brief = capabilityBrief.trim();
    if (!brief || brief.length < 10) {
      e.capability_brief = t('projects.partner.validation.briefShort');
    }
    const msg = message.trim();
    if (!msg || msg.length < 10) {
      e.message = t('projects.partner.validation.messageShort');
    }
    if (proposedShare.trim().length > 255) {
      e.proposed_share = t('projects.partner.validation.shareLong');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = {
        offering_type: offeringType,
        firm_name: firmName.trim(),
        capability_brief: capabilityBrief.trim(),
        message: message.trim(),
      };
      // proposed_share is optional — only send it when filled.
      const share = proposedShare.trim();
      if (share) payload.proposed_share = share;

      await partnershipsApi.submit(Number(id), payload);
      setSubmitted(true);
    } catch (err) {
      // Quota-exhausted 403 (upgrade_required) — races/stale caches can
      // slip past the proactive gate. Swap to the upgrade notice.
      if (isQuotaError(err)) {
        setUpgradeInfo(quotaErrorToCheck(err));
        return;
      }
      // Surface field-level validation (422) inline when the BE
      // returns an `errors` map; otherwise show the generic banner.
      if (err?.data?.errors) {
        const be = err.data.errors;
        setErrors({
          offering_type: be.offering_type?.[0],
          firm_name: be.firm_name?.[0],
          capability_brief: be.capability_brief?.[0],
          proposed_share: be.proposed_share?.[0],
          message: be.message?.[0],
        });
      }
      setSubmitError(err.message || t('projects.partner.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Shell><LoadingState /></Shell>;
  if (upgradeInfo)
    return (
      <Shell>
        <FeatureUpgradeNotice
          info={upgradeInfo}
          featureCode="submit_offers"
          onBack={() => navigate(browseRoute)}
          accentColor="#8a6620"
        />
      </Shell>
    );
  if (loadError)
    return (
      <Shell>
        <ErrorState message={loadError} onBack={() => navigate(browseRoute)} />
      </Shell>
    );
  if (submitted)
    return (
      <Shell>
        <SuccessState
          project={project}
          onBrowse={() => navigate(browseRoute)}
          onMyOffers={() => navigate('/dashboard/partnerships')}
        />
      </Shell>
    );

  const offeringOptions = OFFERING_TYPES.map((o) => ({
    value: o.value,
    label: t(`offering.${o.value}`),
  }));

  return (
    <Shell>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8 lg:py-12">
        <nav
          className="flex items-center gap-2 mb-6"
          style={{ fontSize: 13, color: 'var(--text-muted)' }}
        >
          <Link to={browseRoute} className="link" style={{ fontWeight: 500 }}>
            {t('projects.partner.breadcrumbBrowse')}
          </Link>
          <ArrowLeft size={13} style={{ color: 'var(--text-muted)' }} />
          <span className="font-medium" style={{ color: 'var(--text-ink)' }}>
            {t('projects.partner.breadcrumbOffer')}
          </span>
        </nav>

        <div className="mb-8 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(184,134,42,0.12)',
              color: '#8a6620',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            <Handshake size={12} />
            {t('projects.partner.eyebrow')}
          </div>
          <h1
            className="font-display m-0 mb-2"
            style={{
              fontSize: 'clamp(28px, 3.4vw, 38px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: 'var(--text-ink)',
            }}
          >
            {t('projects.partner.title')}
          </h1>
          <p
            className="m-0"
            style={{
              fontSize: 14.5,
              lineHeight: 1.7,
              maxWidth: 600,
              color: 'var(--text-muted)',
            }}
          >
            {t('projects.partner.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.4fr,1fr] gap-6 lg:gap-8">
          <form onSubmit={submit} className="animate-fade-up">
            <div
              className="p-7 lg:p-8 rounded-[18px]"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {submitError && (
                <div
                  className="p-3.5 rounded-[11px] mb-5"
                  style={{
                    background: 'rgba(185,28,28,0.06)',
                    border: '1px solid rgba(185,28,28,0.18)',
                    color: 'var(--accent-danger)',
                    fontSize: 13.5,
                  }}
                >
                  {submitError}
                </div>
              )}

              <SectionHeader
                title={t('projects.partner.sections.offerTitle')}
                subtitle={t('projects.partner.sections.offerSubtitle')}
              />

              <SelectField
                label={t('projects.partner.offeringLabel')}
                icon={Layers}
                options={offeringOptions}
                placeholder={t('projects.partner.offeringPlaceholder')}
                value={offeringType}
                onChange={(e) => setOfferingType(e.target.value)}
                error={errors.offering_type}
              />

              <div className="mt-4">
                <Field
                  label={t('projects.partner.firmLabel')}
                  icon={Building2}
                  placeholder={t('projects.partner.firmPlaceholder')}
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  error={errors.firm_name}
                  maxLength={255}
                />
              </div>

              <div className="mt-4">
                <Field
                  label={t('projects.partner.shareLabel')}
                  placeholder={t('projects.partner.sharePlaceholder')}
                  value={proposedShare}
                  onChange={(e) => setProposedShare(e.target.value)}
                  error={errors.proposed_share}
                  hint={t('projects.partner.shareHint')}
                  maxLength={255}
                />
              </div>

              <div
                className="my-6 border-t"
                style={{ borderColor: 'var(--border-soft)' }}
              />

              <SectionHeader
                title={t('projects.partner.sections.briefTitle')}
                subtitle={t('projects.partner.sections.briefSubtitle')}
              />

              <TextareaField
                label={t('projects.partner.briefLabel')}
                rows={5}
                placeholder={t('projects.partner.briefPlaceholder')}
                value={capabilityBrief}
                onChange={(e) => setCapabilityBrief(e.target.value)}
                error={errors.capability_brief}
                hint={t('projects.partner.charHint', { count: capabilityBrief.length })}
              />

              <div className="mt-4">
                <TextareaField
                  label={t('projects.partner.messageLabel')}
                  rows={6}
                  placeholder={t('projects.partner.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  error={errors.message}
                  hint={t('projects.partner.charHint', { count: message.length })}
                />
              </div>

              <div
                className="flex gap-3 mt-7 p-4 rounded-[12px]"
                style={{
                  background: 'rgba(184,134,42,0.06)',
                  border: '1px solid rgba(184,134,42,0.18)',
                }}
              >
                <Info
                  size={17}
                  strokeWidth={1.7}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: '#8a6620' }}
                />
                <p
                  className="m-0"
                  style={{
                    fontSize: 13,
                    color: 'var(--text-ink-soft)',
                    lineHeight: 1.7,
                  }}
                >
                  {t('projects.partner.notice')}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-5 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(browseRoute)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] font-semibold transition-all"
                style={{
                  fontSize: 14,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-ink-soft)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                <ArrowRight size={16} />
                {t('projects.partner.cancel')}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-[10px] text-white font-semibold transition-all"
                style={{
                  fontSize: 14.5,
                  background: '#8a6620',
                  border: '1px solid #8a6620',
                  cursor: submitting ? 'wait' : 'pointer',
                  boxShadow: '0 6px 14px rgba(138,102,32,0.25)',
                  opacity: submitting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.background = '#73531a';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#8a6620';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {submitting
                  ? t('projects.partner.submitting')
                  : t('projects.partner.submit')}
                {!submitting && <Handshake size={15} />}
              </button>
            </div>
          </form>

          <ProjectSummary project={project} />
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
 *  Layout shell (top bar)
 * ============================================================ */
function Shell({ children }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const browseRoute = '/projects/solidarity';
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label={t('nav.backHome')}
          >
            <Logo height={68} />
          </button>
          <div className="flex items-center gap-2">
            <LanguageThemeSwitcher compact />
            <button
              onClick={() => navigate(browseRoute)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium transition-colors"
              style={{
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--bg-cream)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <ArrowRight size={15} />
              <span>{t('projects.partner.backToBrowse')}</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* ============================================================
 *  Project summary sidebar
 * ============================================================ */
function ProjectSummary({ project }) {
  const { t, lang } = useTranslation();
  const { user } = useUser();
  const showOwnerName = canSeeProjectOwnerName(project, user?.id);
  const ownerLabel = (() => {
    const at = project.owner?.account_type;
    if (at === 'developer') return t('accountType.developer');
    if (at === 'individual') return t('accountType.individual');
    return t('projects.list.ownerGeneric');
  })();

  return (
    <aside className="animate-fade-up lg:sticky lg:top-[88px] lg:self-start">
      <div
        className="rounded-[18px] overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          className="px-6 py-5"
          style={{
            background: 'linear-gradient(150deg, #8a6620 0%, #5f4615 100%)',
            color: 'white',
          }}
        >
          <div
            className="font-semibold uppercase mb-2"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {t('projects.partner.summary.eyebrow')}
          </div>
          <h2
            className="font-display m-0"
            style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.35 }}
          >
            {project.name}
          </h2>
        </div>

        {project.owner && (
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-soft)' }}
          >
            <div
              className="flex items-center justify-center font-display font-bold flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(184,134,42,0.10)',
                color: '#8a6620',
                fontSize: 16,
              }}
            >
              {showOwnerName ? (
                project.owner.name?.[0] || '·'
              ) : (
                <User size={16} strokeWidth={1.9} />
              )}
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold truncate"
                style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
              >
                {showOwnerName ? project.owner.name : ownerLabel}
              </div>
              <div
                className="flex items-center gap-1"
                style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
              >
                {showOwnerName ? (
                  <>
                    <User size={11} strokeWidth={1.8} />
                    {ownerLabel}
                  </>
                ) : (
                  <>
                    <Lock size={10} strokeWidth={2} />
                    {t('projects.list.identitySealed')}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-5 grid grid-cols-2 gap-x-5 gap-y-4">
          <Fact icon={Tag} label={t('projects.partner.summary.type')} value={project.type} />
          <Fact icon={MapPin} label={t('projects.partner.summary.city')} value={project.city} />
          {project.expected_duration && (
            <Fact
              icon={Clock}
              label={t('projects.partner.summary.duration')}
              value={project.expected_duration}
            />
          )}
          {project.start_date && (
            <Fact
              icon={Calendar}
              label={t('projects.partner.summary.startDate')}
              value={formatDate(project.start_date, lang)}
            />
          )}
        </div>

        {project.description && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <div
              className="font-semibold uppercase mb-2"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
              }}
            >
              {t('projects.partner.summary.description')}
            </div>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: 'var(--text-ink-soft)',
                lineHeight: 1.75,
              }}
            >
              {project.description}
            </p>
          </div>
        )}

        {project.scope && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <div
              className="font-semibold uppercase mb-2"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
              }}
            >
              {t('projects.partner.summary.scope')}
            </div>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: 'var(--text-ink-soft)',
                lineHeight: 1.75,
              }}
            >
              {project.scope}
            </p>
          </div>
        )}

        {project.requirements && project.requirements.length > 0 && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <div
              className="flex items-center gap-1.5 font-semibold uppercase mb-3"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
              }}
            >
              <ListChecks size={12} strokeWidth={1.8} />
              {t('projects.partner.summary.requirements')}
            </div>
            <ul className="m-0 p-0 space-y-2">
              {project.requirements.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 list-none"
                  style={{
                    fontSize: 13,
                    color: 'var(--text-ink-soft)',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'rgba(184,134,42,0.12)',
                      color: '#8a6620',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ============================================================
 *  Small atoms
 * ============================================================ */

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3
        className="font-display m-0 mb-1"
        style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="m-0"
          style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        size={14}
        strokeWidth={1.7}
        className="flex-shrink-0 mt-0.5"
        style={{ color: 'var(--text-muted)' }}
      />
      <div className="min-w-0">
        <div
          className="font-medium uppercase mb-0.5"
          style={{
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </div>
        <div
          className="font-semibold truncate"
          style={{ fontSize: 13, color: 'var(--text-ink)' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Loading / error / success states
 * ============================================================ */

function LoadingState() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
      <div className="grid lg:grid-cols-[1.4fr,1fr] gap-6 lg:gap-8 animate-pulse">
        <div
          className="p-8 rounded-[18px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ height: 18, width: '40%', background: 'var(--border-soft)', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 13, width: '70%', background: 'var(--border-soft)', borderRadius: 6, marginBottom: 24 }} />
          <div style={{ height: 140, background: 'var(--border-soft)', borderRadius: 11 }} />
        </div>
        <div
          className="p-6 rounded-[18px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ height: 16, width: '60%', background: 'var(--border-soft)', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 13, width: '85%', background: 'var(--border-soft)', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(185,28,28,0.08)',
          color: '#b91c1c',
        }}
      >
        <AlertCircle size={28} strokeWidth={1.7} />
      </div>
      <h2
        className="font-display m-0 mb-2"
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {t('projects.partner.errorState.title')}
      </h2>
      <p
        className="m-0 mb-7"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {message}
      </p>
      <button onClick={onBack} className="btn-primary" style={{ width: 'auto' }}>
        {t('projects.partner.errorState.backToBrowse')}
      </button>
    </div>
  );
}

function SuccessState({ project, onBrowse, onMyOffers }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center animate-fade-up">
      <div
        className="mx-auto mb-6 flex items-center justify-center animate-ring-pulse"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#8a6620',
        }}
      >
        <CheckCircle2 size={40} color="white" strokeWidth={2.4} />
      </div>
      <h1
        className="font-display m-0 mb-3"
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'var(--text-ink)',
        }}
      >
        {t('projects.partner.success.title')}
      </h1>
      <p
        className="m-0 mb-8"
        style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {t('projects.partner.success.subtitlePrefix')}{' '}
        <span className="font-semibold" style={{ color: 'var(--text-ink)' }}>
          {project?.name}
        </span>
        {t('projects.partner.success.subtitleSuffix')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={onMyOffers} className="btn-primary" style={{ width: 'auto', flex: 1 }}>
          {t('projects.partner.success.myOffers')}
        </button>
        <button onClick={onBrowse} className="btn-secondary" style={{ width: 'auto', flex: 1 }}>
          {t('projects.partner.success.browse')}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  return 'ar-SA';
}

function formatDate(d, lang) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}
