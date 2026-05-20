import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Compass,
  UserCircle,
  ArrowLeft,
  FolderKanban,
  Sparkles,
  Calendar,
  MapPin,
  Wallet,
  Tag,
  Plus,
  HardHat,
  Handshake,
  Users,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { projects as projectsApi } from '../../services';
import { isServiceProvider } from '../../config/constants';
import StatusBadge from '../../components/project/StatusBadge';
import { arenaConfig, canPostAnyArena } from '../../config/projectConstants';
import SupplierComingSoon from '../../components/SupplierComingSoon';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  DashboardHome — /dashboard
 *  ----------------------------------------------------------------
 *  Per the V5 spec, the dashboard is intentionally simple. See
 *  the README for the role × content matrix.
 * ============================================================ */

export default function DashboardHome() {
  const { user, loading } = useUser();

  if (loading) return <DashboardSkeleton />;

  if (user?.account_type === 'supplier') {
    return <SupplierComingSoon embedded />;
  }

  const accountType = user?.account_type;
  const isOwner = !accountType || accountType === 'individual' || accountType === 'developer';
  const isProvider = isServiceProvider(accountType);
  const canPostProject = canPostAnyArena(accountType);
  const canBrowseProjects = accountType !== 'individual';

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
      <Greeting user={user} />
      <QuickActions
        canPostProject={canPostProject}
        canBrowseProjects={canBrowseProjects}
      />
      {isOwner && <RecentProjects canBrowseProjects={canBrowseProjects} />}
      {isProvider && (
        <div className="space-y-9">
          <RecentAssociatedProjects user={user} />
          {accountType === 'entrepreneur' && <MySolidarityProjects />}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 *  Greeting
 * ============================================================ */
function Greeting({ user }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const period =
    hour < 12 ? t('dashboard.greeting.morning') : t('dashboard.greeting.evening');
  const firstName = user?.name?.split(' ')[0];
  const role = user?.account_type
    ? t(`accountType.${user.account_type}`)
    : '';

  return (
    <div className="mb-9 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(19,109,74,0.08)',
          color: '#0d5538',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Sparkles size={12} />
        {t('dashboard.greeting.eyebrow')}
      </div>
      <h1
        className="font-display m-0 mb-2"
        style={{
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          color: 'var(--text-ink)',
        }}
      >
        {period}
        {firstName ? `, ${firstName}` : ''}.
      </h1>
      <p
        className="m-0"
        style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {role
          ? t('dashboard.greeting.welcome', {
              role: t('dashboard.greeting.asRole', { role }),
            })
          : t('dashboard.greeting.welcomeNoRole')}
      </p>
    </div>
  );
}

/* ============================================================
 *  Quick action cards
 * ============================================================ */
function QuickActions({ canPostProject, canBrowseProjects }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = [];

  if (canPostProject) {
    actions.push({
      icon: UploadCloud,
      title: t('dashboard.actions.createProject'),
      desc: t('dashboard.actions.createProjectDesc'),
      color: '#136d4a',
      onClick: () => navigate('/projects/new'),
    });
  }

  if (canBrowseProjects) {
    actions.push({
      icon: Compass,
      title: t('dashboard.actions.browseProjects'),
      desc: t('dashboard.actions.browseProjectsDesc'),
      color: '#2c2f7c',
      onClick: () => navigate('/projects'),
    });
  }

  actions.push({
    icon: UserCircle,
    title: t('dashboard.actions.profile'),
    desc: t('dashboard.actions.profileDesc'),
    color: '#3a3d99',
    onClick: () => navigate('/dashboard/profile'),
  });

  return (
    <div
      className={`grid gap-4 mb-9 ${
        actions.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
      }`}
    >
      {actions.map((a, i) => (
        <ActionCard key={i} action={a} delay={i * 0.06} />
      ))}
    </div>
  );
}

function ActionCard({ action, delay }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      className="text-start group transition-all animate-fade-up"
      style={{
        padding: '20px 22px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        cursor: 'pointer',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = action.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,17,41,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: action.color,
            color: 'white',
            boxShadow: `0 8px 18px ${action.color}30`,
          }}
        >
          <action.icon size={20} strokeWidth={1.8} />
        </div>
        <ArrowLeft
          size={18}
          className="transition-transform"
          style={{ flexShrink: 0, color: 'var(--text-muted)' }}
        />
      </div>
      <div
        className="font-display font-bold mb-1"
        style={{ fontSize: 16, color: 'var(--text-ink)' }}
      >
        {action.title}
      </div>
      <div
        style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}
      >
        {action.desc}
      </div>
    </button>
  );
}

/* ============================================================
 *  Recent projects (for owners)
 * ============================================================ */
function RecentProjects({ canBrowseProjects }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .list()
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = useMemo(() => items.slice(0, 4), [items]);
  const hasMore = items.length > recent.length;

  return (
    <Section
      title={t('dashboard.sections.recentProjects')}
      icon={FolderKanban}
      action={
        hasMore && canBrowseProjects && (
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1 font-semibold transition-colors"
            style={{
              fontSize: 12.5,
              color: 'var(--text-brand)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('common.viewAll')}
            <ArrowLeft size={13} strokeWidth={2} />
          </button>
        )
      }
    >
      {loading ? (
        <CardGridSkeleton />
      ) : recent.length === 0 ? (
        <Empty
          title={t('dashboard.empty.noProjects.title')}
          subtitle={t('dashboard.empty.noProjects.subtitle')}
          ctaLabel={t('dashboard.empty.noProjects.cta')}
          onCta={() => navigate('/projects/new')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recent.map((p, i) => (
            <DashboardProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function DashboardProjectCard({ project, onClick, delay = 0 }) {
  const { t, lang } = useTranslation();
  const arena = arenaConfig(project.arena);
  const showProgress =
    project.status === 'in_progress' || project.status === 'completed';

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-all animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        padding: '20px 22px',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = arena.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 14px 30px rgba(15,17,41,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          insetInlineStart: 22,
          insetInlineEnd: 22,
          height: 3,
          borderRadius: '0 0 4px 4px',
          background: arena.color,
          opacity: 0.85,
        }}
      />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <StatusBadge status={project.status} size="sm" />
        <span
          className="inline-flex items-center rounded-full font-bold"
          style={{
            background: arena.accentSoft,
            color: arena.color,
            fontSize: 10.5,
            padding: '3px 9px',
          }}
        >
          {t(`arena.${project.arena}.label`)}
        </span>
        <span
          className="ms-auto"
          style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}
        >
          {formatRelativeDate(project.created_at, t)}
        </span>
      </div>

      <h3
        className="font-display m-0 mb-2"
        style={{
          fontSize: 16.5,
          fontWeight: 700,
          lineHeight: 1.3,
          color: 'var(--text-ink)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: 42,
        }}
      >
        {project.name}
      </h3>

      <div
        className="flex items-center gap-2.5 flex-wrap mb-3"
        style={{ fontSize: 12, color: 'var(--text-muted)' }}
      >
        <span className="inline-flex items-center gap-1">
          <Tag size={11.5} strokeWidth={1.7} />
          {project.type}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbcec9' }} />
        <span className="inline-flex items-center gap-1">
          <MapPin size={11.5} strokeWidth={1.7} />
          {project.city}
        </span>
      </div>

      {project.description && (
        <p
          className="m-0 mb-4"
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--text-ink-soft)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.description}
        </p>
      )}

      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="font-semibold uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              {t('projects.details.meta.progress')}
            </span>
            <span className="font-bold" style={{ fontSize: 12, color: '#136d4a' }}>
              {Math.round(project.progress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 5,
              borderRadius: 3,
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

      <div
        className="flex items-center justify-between pt-3 mt-auto"
        style={{ borderTop: '1px solid var(--border-soft)' }}
      >
        <div className="min-w-0">
          {project.budget ? (
            <>
              <div
                className="font-semibold uppercase mb-0.5"
                style={{
                  fontSize: 9.5,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                {t('projects.details.meta.budget')}
              </div>
              <div
                className="font-bold inline-flex items-center gap-1"
                style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
              >
                <Wallet size={12.5} strokeWidth={1.7} className="text-secondary" />
                {formatNumber(project.budget, lang)}{' '}
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {t('common.currency')}
                </span>
              </div>
            </>
          ) : project.start_date ? (
            <div
              className="font-medium inline-flex items-center gap-1"
              style={{ fontSize: 12, color: 'var(--text-ink-soft)' }}
            >
              <Calendar size={11.5} strokeWidth={1.7} />
              {formatDate(project.start_date, lang)}
            </div>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {t('common.notSpecified')}
            </span>
          )}
        </div>

        {/* Pending-bid count from pending_applications_count (BE list
            response). Always an integer per FRONTEND_INTEGRATION.md §10,
            but we keep a typeof guard so a missing field during a
            transitional deploy doesn't render "undefined". */}
        {typeof project.pending_applications_count === 'number' && (
          <div
            className="text-end"
            style={{ marginInlineEnd: 10 }}
          >
            <div
              className="font-semibold uppercase mb-0.5"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              {t('projects.list.applicants')}
            </div>
            <div
              className="font-bold inline-flex items-center gap-1"
              style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
            >
              <Users size={12.5} strokeWidth={1.7} />
              {project.pending_applications_count}
            </div>
          </div>
        )}

        <span
          className="inline-flex items-center justify-center transition-all"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: arena.accentSoft,
            color: arena.color,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={15} strokeWidth={2} />
        </span>
      </div>
    </article>
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

/* ============================================================
 *  Recent associated projects (for service providers)
 * ============================================================ */
function RecentAssociatedProjects({ user }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    projectsApi
      .associated(user.id)
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const recent = useMemo(() => items.slice(0, 4), [items]);

  return (
    <Section title={t('dashboard.sections.associatedProjects')} icon={HardHat}>
      {loading ? (
        <CardGridSkeleton />
      ) : recent.length === 0 ? (
        <Empty
          title={t('dashboard.empty.noAssociated.title')}
          subtitle={t('dashboard.empty.noAssociated.subtitle')}
          ctaLabel={t('dashboard.empty.noAssociated.cta')}
          onCta={() => navigate('/projects')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recent.map((p, i) => (
            <DashboardProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

/* ============================================================
 *  My solidarity-arena projects (entrepreneur only)
 * ============================================================ */
function MySolidarityProjects() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .list({ arena: 'solidarity' })
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || items.length === 0) return null;

  const recent = items.slice(0, 4);

  return (
    <Section title={t('dashboard.sections.solidarityProjects')} icon={Handshake}>
      <div className="grid gap-4 sm:grid-cols-2">
        {recent.map((p, i) => (
          <DashboardProjectCard
            key={p.id}
            project={p}
            onClick={() => navigate(`/projects/${p.id}`)}
            delay={i * 0.05}
          />
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
 *  Shared bits
 * ============================================================ */
function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.7}
            style={{ color: 'var(--text-muted)' }}
          />
        )}
        <h2
          className="font-display m-0"
          style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {title}
        </h2>
        {action && <div className="ms-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[16px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            height: 220,
          }}
        />
      ))}
    </div>
  );
}

function Empty({ title, subtitle, ctaLabel, onCta }) {
  return (
    <div
      className="flex flex-col items-center text-center py-12 px-6 rounded-[14px]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <h3
        className="font-display m-0 mb-2"
        style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
      >
        {title}
      </h3>
      <p
        className="m-0 max-w-md"
        style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {subtitle}
      </p>
      {onCta && ctaLabel && (
        <button
          onClick={onCta}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            background: '#2c2f7c',
            fontSize: 13.5,
            border: '1px solid #2c2f7c',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={2} />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] animate-pulse">
      <div
        style={{
          height: 32,
          width: 240,
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
          marginBottom: 32,
        }}
      />
      <div className="grid sm:grid-cols-3 gap-4 mb-9">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 140,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 14,
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 16,
          width: 200,
          background: 'var(--border-soft)',
          borderRadius: 6,
          marginBottom: 16,
        }}
      />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 78,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
            }}
          />
        ))}
      </div>
    </div>
  );
}
