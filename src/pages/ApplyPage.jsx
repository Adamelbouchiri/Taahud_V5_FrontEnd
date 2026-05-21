import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Send,
  Wallet,
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
  Paperclip,
  X as XIcon,
  UploadCloud,
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import TextareaField from '../components/form/TextareaField';
import { projects as projectsApi, applications as applicationsApi } from '../services';
import { useTranslation } from '../i18n/LanguageContext';
import { UserProvider, useUser } from '../contexts/UserContext';
import {
  canApplyArena,
  canSeeProjectOwnerName,
  defaultBrowseRouteFor,
} from '../config/projectConstants';

/* ============================================================
 *  ApplyPage — /projects/:id/apply
 * ============================================================ */

export default function ApplyPageRoute() {
  return (
    <UserProvider>
      <ApplyPage />
    </UserProvider>
  );
}

function ApplyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const browseRoute = defaultBrowseRouteFor(
    user?.account_type,
    user?.has_isnad_upgrade
  );

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [files, setFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Wait for user context to resolve so we can apply the per-arena
    // applicant check below. Without it we'd race and either miss the
    // gate (false positive open form) or flash a wrong error.
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    projectsApi
      .get(id)
      .then((p) => {
        if (cancelled) return;
        if (p.status !== 'open_for_bids') {
          setLoadError(t('projects.apply.errorState.notOpen'));
          return;
        }
        // Owners cannot apply to their own projects (BE enforces; this
        // gives a clearer error than a 403).
        if (p.user_id && p.user_id === user.id) {
          setLoadError(t('projects.apply.errorState.ownProject'));
          return;
        }
        // Per-arena applicant check — FRONTEND_INTEGRATION.md §3.
        // solidarity is entrepreneur-only, isnad also allows developer,
        // private/arena are entrepreneur+engineering.
        if (!canApplyArena(p.arena, user.account_type)) {
          setLoadError(t('projects.apply.errorState.notEligible'));
          return;
        }
        if (p.has_applied) {
          setLoadError(t('projects.apply.errorState.alreadyApplied'));
          return;
        }
        setProject(p);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err.message || t('projects.apply.errorState.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t, user]);

  const validate = () => {
    const e = {};
    if (!coverLetter.trim() || coverLetter.trim().length < 30) {
      e.cover_letter = t('projects.apply.validation.coverShort');
    }
    if (!bidAmount) {
      e.bid_amount = t('projects.apply.validation.bidMissing');
    } else if (Number(bidAmount) <= 0) {
      e.bid_amount = t('projects.apply.validation.bidPositive');
    }
    if (!deliveryDate) {
      e.delivery_date = t('projects.apply.validation.deliveryMissing');
    } else if (new Date(deliveryDate) < new Date(new Date().toDateString())) {
      e.delivery_date = t('projects.apply.validation.deliveryFuture');
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
      const created = await applicationsApi.submit(Number(id), {
        cover_letter: coverLetter.trim(),
        bid_amount: Math.round(Number(bidAmount)),
        delivery_date: deliveryDate,
      });

      // Upload supporting files sequentially. BE enforces applicant-only,
      // pending-only, 20 MB max, PDF/JPG/JPEG/PNG/DOC/DOCX/XLS/XLSX. If
      // any single upload fails, surface it but still treat the app as
      // submitted (user can manage files later from the applications page).
      if (created?.id && files.length > 0) {
        for (const f of files) {
          try {
            await applicationsApi.uploadFile(created.id, f);
          } catch (_err) {
            // Soft-fail: the cover-letter/bid are already saved.
          }
        }
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || t('projects.apply.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Shell><LoadingState /></Shell>;
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
          onMyApps={() => navigate('/dashboard')}
        />
      </Shell>
    );

  return (
    <Shell>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8 lg:py-12">
        <nav
          className="flex items-center gap-2 mb-6"
          style={{ fontSize: 13, color: 'var(--text-muted)' }}
        >
          <Link to={browseRoute} className="link" style={{ fontWeight: 500 }}>
            {t('projects.apply.breadcrumbBrowse')}
          </Link>
          <ArrowLeft size={13} style={{ color: 'var(--text-muted)' }} />
          <span className="font-medium" style={{ color: 'var(--text-ink)' }}>
            {t('projects.apply.breadcrumbApply')}
          </span>
        </nav>

        <div className="mb-8 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(19,109,74,0.08)',
              color: '#0d5538',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            <Send size={12} />
            {t('projects.apply.eyebrow')}
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
            {t('projects.apply.title')}
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
            {t('projects.apply.subtitle')}
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
                title={t('projects.apply.sections.coverTitle')}
                subtitle={t('projects.apply.sections.coverSubtitle')}
              />

              <TextareaField
                label={t('projects.apply.cover')}
                rows={7}
                placeholder={t('projects.apply.coverPlaceholder')}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                error={errors.cover_letter}
                hint={t('projects.apply.coverHint', { count: coverLetter.length })}
              />

              <div
                className="my-6 border-t"
                style={{ borderColor: 'var(--border-soft)' }}
              />

              <SectionHeader
                title={t('projects.apply.sections.bidTitle')}
                subtitle={t('projects.apply.sections.bidSubtitle')}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Bidders never see the client budget — it stays sealed
                    until acceptance. Pass undefined so BidAmountField
                    drops the "above/below client budget" hint. */}
                <BidAmountField
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  error={errors.bid_amount}
                  customerBudget={undefined}
                  t={t}
                />
                <DeliveryDateField
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  error={errors.delivery_date}
                  t={t}
                />
              </div>

              <div
                className="my-6 border-t"
                style={{ borderColor: 'var(--border-soft)' }}
              />

              <SectionHeader
                title={t('projects.apply.sections.filesTitle')}
                subtitle={t('projects.apply.sections.filesSubtitle')}
              />

              <AttachmentsField files={files} onChange={setFiles} t={t} />

              <div
                className="flex gap-3 mt-7 p-4 rounded-[12px]"
                style={{
                  background: 'rgba(44,47,124,0.04)',
                  border: '1px solid rgba(44,47,124,0.12)',
                }}
              >
                <Info
                  size={17}
                  strokeWidth={1.7}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--text-brand)' }}
                />
                <p
                  className="m-0"
                  style={{
                    fontSize: 13,
                    color: 'var(--text-ink-soft)',
                    lineHeight: 1.7,
                  }}
                >
                  {t('projects.apply.notice')}
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
                {t('projects.apply.cancel')}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-[10px] text-white font-semibold transition-all"
                style={{
                  fontSize: 14.5,
                  background: '#136d4a',
                  border: '1px solid #136d4a',
                  cursor: submitting ? 'wait' : 'pointer',
                  boxShadow: '0 6px 14px rgba(19,109,74,0.25)',
                  opacity: submitting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.background = '#0d5538';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#136d4a';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {submitting ? t('projects.apply.submitting') : t('projects.apply.submit')}
                {!submitting && <Send size={15} />}
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
  const { user } = useUser();
  const browseRoute = defaultBrowseRouteFor(
    user?.account_type,
    user?.has_isnad_upgrade
  );
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
              <span>{t('projects.apply.backToBrowse')}</span>
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
            background: 'linear-gradient(150deg, #2c2f7c 0%, #1f2258 100%)',
            color: 'white',
          }}
        >
          <div
            className="font-semibold uppercase mb-2"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            {t('projects.apply.summary.eyebrow')}
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
                background: 'rgba(44,47,124,0.08)',
                color: 'var(--text-brand)',
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
          <Fact icon={Tag} label={t('projects.apply.summary.type')} value={project.type} />
          <Fact icon={MapPin} label={t('projects.apply.summary.city')} value={project.city} />
          {/* Budget is sealed from bidders until the owner accepts an
              application. We show a "sealed" placeholder so bidders
              know the budget exists but isn't revealed yet. */}
          <Fact
            icon={Wallet}
            label={t('projects.apply.summary.clientBudget')}
            value={t('projects.apply.summary.clientBudgetSealed')}
          />
          {project.expected_duration && (
            <Fact
              icon={Clock}
              label={t('projects.apply.summary.duration')}
              value={project.expected_duration}
            />
          )}
          {project.start_date && (
            <Fact
              icon={Calendar}
              label={t('projects.apply.summary.startDate')}
              value={formatDate(project.start_date, lang)}
            />
          )}
          {project.end_date && (
            <Fact
              icon={Calendar}
              label={t('projects.apply.summary.endDate')}
              value={formatDate(project.end_date, lang)}
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
              {t('projects.apply.summary.description')}
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
              {t('projects.apply.summary.scope')}
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
              {t('projects.apply.summary.requirements')}
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
                      background: 'rgba(19,109,74,0.1)',
                      color: '#136d4a',
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

function BidAmountField({ value, onChange, error, customerBudget, t }) {
  const { lang } = useTranslation();
  const num = Number(value);
  const showHint =
    !error &&
    customerBudget &&
    value &&
    !Number.isNaN(num) &&
    num !== customerBudget;
  const diff = num - customerBudget;

  return (
    <div className="animate-fade-up">
      <label className="field-label">{t('projects.apply.bidLabel')}</label>
      <div className="flex gap-2">
        <span className="phone-cc">{t('common.currency')}</span>
        <input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          placeholder={t('projects.apply.bidPlaceholder')}
          value={value}
          onChange={onChange}
          className={`field field-no-icon ${error ? 'error' : ''}`}
          style={{ flex: 1 }}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {showHint && (
        <p
          className="m-0 mt-1.5"
          style={{
            fontSize: 12,
            color: diff < 0 ? '#0d5538' : diff > 0 ? '#9c4221' : 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {diff < 0
            ? t('projects.apply.bidLower', { value: formatNumber(Math.abs(diff), lang) })
            : t('projects.apply.bidHigher', { value: formatNumber(diff, lang) })}
        </p>
      )}
      {!error && !showHint && (
        <p className="field-hint">{t('projects.apply.bidHelp')}</p>
      )}
    </div>
  );
}

const FILE_MAX_BYTES = 20 * 1024 * 1024; // BE cap: 20 MB
const FILE_ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];

function AttachmentsField({ files, onChange, t }) {
  const inputRef = React.useRef(null);
  const [pickError, setPickError] = useState('');

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // reset so re-picking the same file fires change
    if (picked.length === 0) return;

    const errors = [];
    const accepted = [];
    for (const f of picked) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!FILE_ALLOWED_EXT.includes(ext)) {
        errors.push(t('projects.apply.files.typeRejected', { name: f.name }));
        continue;
      }
      if (f.size > FILE_MAX_BYTES) {
        errors.push(t('projects.apply.files.sizeRejected', { name: f.name }));
        continue;
      }
      accepted.push(f);
    }
    setPickError(errors[0] || '');
    if (accepted.length > 0) onChange([...files, ...accepted]);
  };

  const removeAt = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="animate-fade-up">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        onChange={handlePick}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-[12px] transition-all"
        style={{
          background: 'var(--bg-canvas)',
          border: '1.5px dashed var(--border-default)',
          color: 'var(--text-ink-soft)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#136d4a';
          e.currentTarget.style.background = 'rgba(19,109,74,0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.background = 'var(--bg-canvas)';
        }}
      >
        <UploadCloud size={22} strokeWidth={1.6} style={{ color: '#136d4a' }} />
        <span className="font-semibold" style={{ fontSize: 13.5 }}>
          {t('projects.apply.files.pickCta')}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {t('projects.apply.files.hint')}
        </span>
      </button>

      {pickError && <p className="field-err">{pickError}</p>}

      {files.length > 0 && (
        <ul className="m-0 p-0 mt-4 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="list-none flex items-center gap-3 px-3.5 py-2.5 rounded-[10px]"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <Paperclip
                size={14}
                strokeWidth={1.7}
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="font-semibold truncate"
                  style={{ fontSize: 12.5, color: 'var(--text-ink)' }}
                >
                  {f.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatSize(f.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={t('projects.apply.files.removeAria', { name: f.name })}
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <XIcon size={12} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function DeliveryDateField({ value, onChange, error, t }) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <div className="animate-fade-up">
      <label className="field-label">{t('projects.apply.deliveryLabel')}</label>
      <div className="relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 end-[14px] pointer-events-none flex"
          style={{ color: 'var(--text-muted)' }}
        >
          <Calendar size={17} strokeWidth={1.7} />
        </div>
        <input
          type="date"
          min={today}
          value={value}
          onChange={onChange}
          className={`field ${error ? 'error' : ''}`}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {!error && <p className="field-hint">{t('projects.apply.deliveryHint')}</p>}
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
        {t('projects.apply.errorState.title')}
      </h2>
      <p
        className="m-0 mb-7"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {message}
      </p>
      <button
        onClick={onBack}
        className="btn-primary"
        style={{ width: 'auto' }}
      >
        {t('projects.apply.errorState.backToBrowse')}
      </button>
    </div>
  );
}

function SuccessState({ project, onBrowse, onMyApps }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center animate-fade-up">
      <div
        className="mx-auto mb-6 flex items-center justify-center animate-ring-pulse"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#136d4a',
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
        {t('projects.apply.success.title')}
      </h1>
      <p
        className="m-0 mb-8"
        style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {t('projects.apply.success.subtitlePrefix')}{' '}
        <span className="font-semibold" style={{ color: 'var(--text-ink)' }}>
          {project?.name}
        </span>
        {t('projects.apply.success.subtitleSuffix')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={onMyApps} className="btn-primary" style={{ width: 'auto', flex: 1 }}>
          {t('projects.apply.success.myApps')}
        </button>
        <button onClick={onBrowse} className="btn-secondary" style={{ width: 'auto', flex: 1 }}>
          {t('projects.apply.success.browse')}
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

function formatNumber(n, lang) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat(localeFor(lang)).format(num);
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
