import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Tag,
  MapPin,
  Wallet,
  Calendar,
  Clock,
  Award,
  ListChecks,
  FileText,
  User,
  Send,
  AlertCircle,
  Pencil,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  LayoutDashboard,
  Lock,
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageThemeSwitcher from '../components/LanguageThemeSwitcher';
import { projects as projectsApi, applications as applicationsApi } from '../services';
import {
  arenaConfig,
  canApplyArena,
  canSeeProjectBudget,
  canSeeProjectOwnerName,
  canSeeApplicantName,
} from '../config/projectConstants';
import { UserProvider, useUser } from '../contexts/UserContext';
import StatusBadge from '../components/project/StatusBadge';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  ProjectDetailsPage — /projects/:id
 * ============================================================ */

export default function ProjectDetailsPageRoute() {
  return (
    <UserProvider>
      <ProjectDetailsPage />
    </UserProvider>
  );
}

function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useTranslation();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reloadProject = React.useCallback(async () => {
    try {
      const p = await projectsApi.get(id);
      setProject(p);
    } catch (err) {
      setError(err.message || t('projects.details.loadErrorTitle'));
    }
  }, [id, t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    projectsApi
      .get(id)
      .then((p) => {
        if (!cancelled) setProject(p);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.message || t('projects.details.loadErrorTitle'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (loading)
    return (
      <Shell>
        <LoadingState />
      </Shell>
    );
  if (error || !project)
    return (
      <Shell>
        <ErrorView message={error} onBack={() => navigate(-1)} />
      </Shell>
    );

  const isOwner = user && project.user_id === user.id;
  // Per-arena applicants matrix (FRONTEND_INTEGRATION.md §3). solidarity
  // is entrepreneur-only, isnad also allows developer, etc.
  const canApply =
    !!user &&
    !isOwner &&
    project.status === 'open_for_bids' &&
    !project.has_applied &&
    canApplyArena(project.arena, user.account_type);

  return (
    <Shell>
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1280px] mx-auto">
        <Breadcrumb
          items={[
            { label: t('projects.details.breadcrumbBrowse'), to: '/projects' },
            { label: project.name },
          ]}
        />

        <Header
          project={project}
          isOwner={isOwner}
          canApply={canApply}
          onEdit={() => navigate(`/projects/${project.id}/edit`)}
          onApply={() => navigate(`/projects/${project.id}/apply`)}
        />

        <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6 lg:gap-8 mt-8">
          <div className="space-y-6 min-w-0">
            {project.description && (
              <Section title={t('projects.details.descriptionSection')}>
                <p
                  className="m-0"
                  style={{
                    fontSize: 14.5,
                    color: 'var(--text-ink-soft)',
                    lineHeight: 1.85,
                  }}
                >
                  {project.description}
                </p>
              </Section>
            )}

            {project.scope && (
              <Section title={t('projects.details.scopeSection')}>
                <p
                  className="m-0"
                  style={{
                    fontSize: 14.5,
                    color: 'var(--text-ink-soft)',
                    lineHeight: 1.85,
                  }}
                >
                  {project.scope}
                </p>
              </Section>
            )}

            {project.requirements && project.requirements.length > 0 && (
              <Section
                title={t('projects.details.requirementsSection')}
                icon={ListChecks}
              >
                <ul className="m-0 p-0 space-y-2.5">
                  {project.requirements.map((r, i) => (
                    <li
                      key={i}
                      className="list-none flex items-start gap-3"
                      style={{
                        fontSize: 14,
                        color: 'var(--text-ink)',
                        lineHeight: 1.6,
                      }}
                    >
                      <span
                        className="flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(19,109,74,0.1)',
                          color: '#136d4a',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {project.files && project.files.length > 0 && (
              <Section
                title={t('projects.details.filesSection')}
                icon={FileText}
              >
                <ul className="m-0 p-0 space-y-2">
                  {project.files.map((f) => (
                    <FileRow key={f.id} file={f} />
                  ))}
                </ul>
              </Section>
            )}

            {isOwner && (
              <Section
                title={
                  typeof project.pending_applications_count === 'number' &&
                  project.pending_applications_count > 0
                    ? `${t('projects.details.applications.title')} (${project.pending_applications_count})`
                    : t('projects.details.applications.title')
                }
                icon={Users}
              >
                <OwnerApplications
                  projectId={project.id}
                  onAfterAccept={reloadProject}
                />
              </Section>
            )}
          </div>

          <aside className="space-y-5">
            <FactsCard project={project} />
            <OwnerCard owner={project.owner} project={project} viewerId={user?.id} />
            {project.is_accepted === true && project.partner_id && (
              <PartnerCard partner={project.partner} partnerId={project.partner_id} />
            )}
          </aside>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
 *  Shell
 * ============================================================ */
function Shell({ children }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label={t('nav.backHome')}
          >
            <Logo height={68} />
          </button>
          <div className="flex items-center gap-2">
            <LanguageThemeSwitcher compact />
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-canvas)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-surface)';
              }}
            >
              <LayoutDashboard size={15} strokeWidth={1.8} />
              {t('projects.details.dashboard')}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* ============================================================
 *  Header
 * ============================================================ */
function Header({ project, isOwner, canApply, onEdit, onApply }) {
  const { t } = useTranslation();
  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusBadge status={project.status} />
            {project.arena && <ArenaPill arena={project.arena} />}
            {project.is_accepted === true && (
              <span
                className="inline-flex items-center gap-1 rounded-full font-semibold"
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  background: 'rgba(19,109,74,0.08)',
                  color: '#0d5538',
                  border: '1px solid rgba(19,109,74,0.18)',
                }}
              >
                <CheckCircle2 size={12} />
                {t('projects.details.acceptedBadge')}
              </span>
            )}
          </div>

          <h1
            className="font-display m-0 mb-2"
            style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              color: 'var(--text-ink)',
            }}
          >
            {project.name}
          </h1>

          <div
            className="flex items-center gap-3 flex-wrap"
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Tag size={13} strokeWidth={1.7} />
              {project.type}
            </span>
            <Dot />
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.7} />
              {project.city}
            </span>
            {project.created_at && (
              <>
                <Dot />
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} strokeWidth={1.7} />
                  {t('projects.details.publishedAt', {
                    value: formatRelativeDate(project.created_at, t),
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {isOwner && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-canvas)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-surface)';
              }}
            >
              <Pencil size={14} strokeWidth={1.8} />
              {t('projects.details.editCta')}
            </button>
          )}

          {canApply && (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: '#136d4a',
                border: '1px solid #136d4a',
                cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(19,109,74,0.22)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0d5538';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#136d4a';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Send size={14} strokeWidth={1.8} />
              {t('projects.details.applyCta')}
            </button>
          )}

          {project.has_applied && (
            <span
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-semibold"
              style={{
                fontSize: 13.5,
                background: 'rgba(19,109,74,0.08)',
                color: '#0d5538',
                border: '1px solid rgba(19,109,74,0.22)',
              }}
            >
              <CheckCircle2 size={14} />
              {t('projects.details.appliedBadge')}
            </span>
          )}
        </div>
      </div>

      {(project.status === 'in_progress' || project.status === 'completed') && (
        <div
          className="mt-6 p-5 rounded-[14px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="font-semibold uppercase"
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
              }}
            >
              {t('projects.details.progressLabel')}
            </span>
            <span className="font-bold" style={{ fontSize: 14, color: '#136d4a' }}>
              {Math.round(project.progress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'var(--border-soft)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${project.progress}%`,
                background:
                  project.progress >= 100
                    ? '#136d4a'
                    : 'linear-gradient(90deg, #2c2f7c, #136d4a)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 *  Section
 * ============================================================ */
function Section({ title, icon: Icon, children }) {
  return (
    <section
      className="rounded-[14px] animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.7}
            style={{ color: 'var(--text-muted)' }}
          />
        )}
        <h2
          className="font-display m-0"
          style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/* ============================================================
 *  Owner-only: list of applications submitted to this project
 *  with inline accept/reject controls. Accepting cascades on BE:
 *  project becomes 'awarded' + partner set, siblings auto-rejected.
 * ============================================================ */
function OwnerApplications({ projectId, onAfterAccept }) {
  const { t, lang } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await applicationsApi.listForProject(projectId);
      setItems(rows);
    } catch (err) {
      setError(err.message || '');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (id) => {
    setActing(id);
    try {
      await applicationsApi.accept(id);
      await load();
      onAfterAccept?.();
    } catch (err) {
      setError(err.message || '');
    } finally {
      setActing(null);
    }
  };

  const reject = async (id) => {
    setActing(id);
    try {
      await applicationsApi.reject(id);
      await load();
    } catch (err) {
      setError(err.message || '');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              height: 96,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
              borderRadius: 11,
            }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="p-6 rounded-[12px] text-center"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px dashed var(--border-default)',
          color: 'var(--text-muted)',
          fontSize: 13.5,
        }}
      >
        {t('projects.details.applications.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="p-3 rounded-[10px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: 'var(--accent-danger)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      {items.map((a) => {
        const isPending = a.status === 'pending';
        return (
          <article
            key={a.id}
            className="p-4 rounded-[12px]"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0">
                <div
                  className="font-semibold mb-0.5"
                  style={{ fontSize: 14, color: 'var(--text-ink)' }}
                >
                  {canSeeApplicantName(a)
                    ? a.applicant?.name ||
                      t('projects.details.applications.applicant')
                    : t('projects.details.applications.applicant')}
                </div>
                <div
                  className="flex items-center gap-2 flex-wrap"
                  style={{ fontSize: 12, color: 'var(--text-muted)' }}
                >
                  {a.applicant?.account_type && (
                    <span>{t(`accountType.${a.applicant.account_type}`)}</span>
                  )}
                  {a.applicant?.city && (
                    <>
                      <span>·</span>
                      <span>{a.applicant.city}</span>
                    </>
                  )}
                </div>
              </div>
              <ApplicationPill status={a.status} t={t} />
            </div>

            {a.cover_letter && (
              <p
                className="m-0 mb-3"
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: 'var(--text-ink-soft)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {a.cover_letter}
              </p>
            )}

            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex gap-5 flex-wrap" style={{ fontSize: 12.5 }}>
                <div>
                  <div
                    className="font-medium uppercase mb-0.5"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {t('projects.details.applications.bid')}
                  </div>
                  <div className="font-semibold" style={{ color: 'var(--text-ink)' }}>
                    {formatNumber(a.bid_amount, lang)} {t('common.currency')}
                  </div>
                </div>
                {a.delivery_date && (
                  <div>
                    <div
                      className="font-medium uppercase mb-0.5"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t('projects.details.applications.deliveryDate')}
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-ink)' }}>
                      {formatDate(a.delivery_date, lang)}
                    </div>
                  </div>
                )}
              </div>

              {isPending && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={acting === a.id}
                    onClick={() => reject(a.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-semibold transition-all"
                    style={{
                      fontSize: 12.5,
                      background: 'var(--bg-surface)',
                      border: '1px solid rgba(185,28,28,0.3)',
                      color: '#b91c1c',
                      cursor: acting === a.id ? 'wait' : 'pointer',
                      opacity: acting === a.id ? 0.6 : 1,
                    }}
                  >
                    <XCircle size={13} strokeWidth={1.8} />
                    {t('projects.details.applications.reject')}
                  </button>
                  <button
                    type="button"
                    disabled={acting === a.id}
                    onClick={() => accept(a.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white font-semibold transition-all"
                    style={{
                      fontSize: 12.5,
                      background: '#136d4a',
                      border: '1px solid #136d4a',
                      cursor: acting === a.id ? 'wait' : 'pointer',
                      opacity: acting === a.id ? 0.7 : 1,
                    }}
                  >
                    <CheckCircle2 size={13} strokeWidth={1.8} />
                    {t('projects.details.applications.accept')}
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ApplicationPill({ status, t }) {
  const cfg = {
    pending: { bg: 'rgba(184,134,42,0.12)', color: '#8a6620', border: 'rgba(184,134,42,0.28)' },
    accepted: { bg: 'rgba(19,109,74,0.1)', color: '#0d5538', border: 'rgba(19,109,74,0.28)' },
    rejected: { bg: 'rgba(185,28,28,0.08)', color: '#b91c1c', border: 'rgba(185,28,28,0.24)' },
  }[status] || { bg: 'var(--bg-canvas)', color: 'var(--text-muted)', border: 'var(--border-default)' };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{
        fontSize: 11,
        padding: '3px 9px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span
        className="rounded-full"
        style={{ width: 5, height: 5, background: cfg.color }}
      />
      {t(`status.application.${status}`)}
    </span>
  );
}

/* ============================================================
 *  Sidebar cards
 * ============================================================ */

function FactsCard({ project }) {
  const { t, lang } = useTranslation();
  const { user } = useUser();
  const showBudget = canSeeProjectBudget(project, user?.id);
  const facts = [
    { icon: Tag, label: t('projects.details.meta.type'), value: project.type },
    { icon: MapPin, label: t('projects.details.meta.city'), value: project.city },
    // Budget is shown only to the owner / accepted partner; hidden
    // entirely from everyone else (no "sealed" placeholder).
    project.budget != null && showBudget && {
      icon: Wallet,
      label: t('projects.details.meta.budget'),
      value: `${formatNumber(project.budget, lang)} ${t('common.currency')}`,
    },
    project.expected_duration && {
      icon: Clock,
      label: t('projects.details.meta.duration'),
      value: project.expected_duration,
    },
    project.start_date && {
      icon: Calendar,
      label: t('projects.details.meta.startDate'),
      value: formatDate(project.start_date, lang),
    },
    project.end_date && {
      icon: Calendar,
      label: t('projects.details.meta.endDate'),
      value: formatDate(project.end_date, lang),
    },
    project.experience && {
      icon: Award,
      label: t('projects.details.meta.experience'),
      value: project.experience,
    },
  ].filter(Boolean);

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <h3
          className="font-display m-0"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {t('projects.details.factsTitle')}
        </h3>
      </div>
      <ul className="m-0 p-0 px-5 py-4 space-y-4">
        {facts.map((f) => (
          <li key={f.label} className="list-none flex items-start gap-3">
            <f.icon
              size={15}
              strokeWidth={1.7}
              className="flex-shrink-0 mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            />
            <div className="min-w-0">
              <div
                className="font-medium uppercase mb-0.5"
                style={{
                  fontSize: 10.5,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                {f.label}
              </div>
              <div
                className="font-semibold"
                style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
              >
                {f.value}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OwnerCard({ owner, project, viewerId }) {
  const { t } = useTranslation();
  if (!owner) return null;
  const role = owner.account_type
    ? t(`accountType.${owner.account_type}`)
    : t('projects.list.ownerGeneric');
  const showName = canSeeProjectOwnerName(project, viewerId);
  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="font-semibold uppercase mb-3"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
        }}
      >
        {t('projects.details.ownerSection')}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center font-display font-bold flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(44,47,124,0.08)',
            color: 'var(--text-brand)',
            fontSize: 18,
          }}
        >
          {showName ? (
            owner.name?.[0] || '·'
          ) : (
            <User size={18} strokeWidth={1.9} />
          )}
        </div>
        <div className="min-w-0">
          <div
            className="font-bold truncate"
            style={{ fontSize: 14, color: 'var(--text-ink)' }}
          >
            {showName ? owner.name : role}
          </div>
          <div
            className="flex items-center gap-1 truncate"
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
          >
            {showName ? (
              <>
                <User size={11} strokeWidth={1.8} />
                {role}
                {owner.city && (
                  <>
                    <span>·</span>
                    <span>{owner.city}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <Lock size={11} strokeWidth={2} />
                {t('projects.list.identitySealed')}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ partner, partnerId }) {
  const { t } = useTranslation();
  const role = partner?.account_type
    ? t(`accountType.${partner.account_type}`)
    : t('projects.list.ownerGeneric');
  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: 'rgba(19,109,74,0.04)',
        border: '1px solid rgba(19,109,74,0.18)',
      }}
    >
      <div
        className="font-semibold uppercase mb-3 inline-flex items-center gap-1.5"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.1em',
          color: '#0d5538',
        }}
      >
        <CheckCircle2 size={12} />
        {t('projects.details.partnerSection')}
      </div>

      {partner?.name ? (
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center font-display font-bold flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(19,109,74,0.10)',
              color: '#0d5538',
              fontSize: 18,
            }}
          >
            {partner.name?.[0] || '·'}
          </div>
          <div className="min-w-0">
            <div
              className="font-bold truncate"
              style={{ fontSize: 14, color: 'var(--text-ink)' }}
            >
              {partner.name}
            </div>
            <div
              className="flex items-center gap-1 truncate"
              style={{ fontSize: 12, color: 'var(--text-muted)' }}
            >
              <User size={11} strokeWidth={1.8} />
              {role}
              {partner.city && (
                <>
                  <span>·</span>
                  <span>{partner.city}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p
          className="m-0"
          style={{
            fontSize: 13,
            color: 'var(--text-ink-soft)',
            lineHeight: 1.6,
          }}
        >
          {t('projects.details.partnerPlaceholder', { id: partnerId })}
        </p>
      )}
    </div>
  );
}

function FileRow({ file }) {
  const { t } = useTranslation();
  const name =
    file.original_name ||
    file.file_path?.split('/').pop() ||
    file.url?.split('/').pop() ||
    t('projects.details.fileFallback', { id: file.id });
  const ext = name.split('.').pop()?.toLowerCase();
  const href = file.url || file.file_path;

  let Icon = FileText;
  let color = '#7a7a8c';
  let bg = '#f4f1e9';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    Icon = ImageIcon;
    color = '#2c2f7c';
    bg = 'rgba(44,47,124,0.08)';
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    Icon = FileSpreadsheet;
    color = '#136d4a';
    bg = 'rgba(19,109,74,0.08)';
  } else if (ext === 'zip' || ext === 'rar') {
    Icon = FileArchive;
    color = '#3a3d99';
    bg = 'rgba(58,61,153,0.08)';
  } else if (ext === 'pdf') {
    color = '#b91c1c';
    bg = 'rgba(185,28,28,0.06)';
  }

  return (
    <li
      className="list-none flex items-center gap-3 px-4 py-3 rounded-[11px]"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          color,
        }}
      >
        <Icon size={16} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="font-semibold truncate"
          style={{ fontSize: 13, color: 'var(--text-ink)' }}
        >
          {name}
        </div>
        {file.size_bytes != null && (
          <div
            style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}
          >
            {formatSize(file.size_bytes)}
          </div>
        )}
      </div>
      {href && (
        <a
          href={href}
          // `download` triggers a save-as instead of inline navigation,
          // and uses the original filename rather than the random hash
          // in the URL. Cross-origin file servers may ignore the hint
          // (browser falls back to opening in a new tab), but for the
          // same-origin Laravel storage symlink it works as expected.
          download={name}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center justify-center transition-colors"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-ink-soft)',
            flexShrink: 0,
          }}
          aria-label={t('projects.details.downloadAria', { name })}
        >
          <Download size={14} strokeWidth={1.8} />
        </a>
      )}
    </li>
  );
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ============================================================
 *  Breadcrumb
 * ============================================================ */
function Breadcrumb({ items }) {
  return (
    <nav
      className="flex items-center gap-2 mb-6 flex-wrap"
      style={{ fontSize: 13 }}
    >
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {it.to && !isLast ? (
              <Link
                to={it.to}
                className="link"
                style={{ fontWeight: 500, color: 'var(--text-muted)' }}
              >
                {it.label}
              </Link>
            ) : (
              <span
                className="font-medium truncate"
                style={{
                  color: isLast ? 'var(--text-ink)' : 'var(--text-muted)',
                  maxWidth: 280,
                }}
              >
                {it.label}
              </span>
            )}
            {!isLast && (
              <ArrowRight
                size={12}
                strokeWidth={1.7}
                className="flex-shrink-0"
                style={{
                  transform: 'rotate(180deg)',
                  color: 'var(--text-muted)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ============================================================
 *  Loading + error states
 * ============================================================ */

function LoadingState() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 animate-pulse">
      <div
        style={{
          height: 14,
          width: 240,
          background: 'var(--border-soft)',
          borderRadius: 6,
          marginBottom: 24,
        }}
      />
      <div
        style={{
          height: 28,
          width: '70%',
          maxWidth: 600,
          background: 'var(--border-soft)',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />
      <div
        style={{
          height: 14,
          width: 320,
          background: 'var(--border-soft)',
          borderRadius: 6,
          marginBottom: 36,
        }}
      />
      <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6">
        <div
          style={{
            height: 380,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
          }}
        />
        <div
          style={{
            height: 380,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
          }}
        />
      </div>
    </div>
  );
}

function ErrorView({ message, onBack }) {
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
        {t('projects.details.loadErrorTitle')}
      </h2>
      <p
        className="m-0 mb-7"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {message || t('projects.details.loadErrorFallback')}
      </p>
      <button
        onClick={onBack}
        className="btn-primary"
        style={{ width: 'auto' }}
      >
        {t('projects.details.back')}
      </button>
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: '#cbcec9',
      }}
    />
  );
}

function ArenaPill({ arena }) {
  const cfg = arenaConfig(arena);
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold"
      style={{
        fontSize: 11.5,
        padding: '4px 10px',
        background: cfg.accentSoft,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          background: cfg.color,
        }}
      />
      {t(`arena.${arena}.label`)}
    </span>
  );
}

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

function formatRelativeDate(d, t) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return t('common.relative.today');
  if (diffDays === 1) return t('common.relative.yesterday');
  if (diffDays < 7) return t('common.relative.daysAgo', { value: diffDays });
  if (diffDays < 30)
    return t('common.relative.weeksAgo', { value: Math.floor(diffDays / 7) });
  if (diffDays < 365)
    return t('common.relative.monthsAgo', { value: Math.floor(diffDays / 30) });
  return t('common.relative.yearsAgo', { value: Math.floor(diffDays / 365) });
}
