import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  ClipboardList,
  CreditCard,
  // Package, // TODO: re-enable when plans management is ready
  Key,
  Activity,
  ShieldOff,
  RefreshCw,
  Sparkles,
  PieChart,
  Map,
} from 'lucide-react';
import { admin } from '../../services';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { ARENAS } from '../../config/projectConstants';
import { PageHeader, Card } from '../../components/admin/AdminUI';
import { KpiCard, LineChart, BarList } from '../../components/admin/StatsViz';

/* ============================================================
 *  AdminOverviewPage — landing screen at /admin.
 *
 *  Powered by GET /api/admin/stats (single endpoint, ~12 SQL
 *  queries on the BE). Layout follows the recommended dashboard
 *  in ADMIN_STATS_INTEGRATION.md:
 *
 *    1. KPI row — total users / projects / applications / suspended
 *    2. Large user growth chart
 *    3. Breakdown row — donuts as bar lists (no chart lib)
 *    4. Secondary metrics — admins, super-admins, acceptance rate
 *    5. Shortcut cards — links to the other admin pages
 *
 *  No client-side caching: every page visit gets fresh numbers,
 *  matching the BE's no-cache stance.
 * ============================================================ */

// Tonal palette — kept in one place so the cards / chart / bars
// all share the same visual key per resource type.
const TONE = {
  users:    { accent: 'var(--accent-primary)',   bg: 'rgba(44,47,124,0.10)',  fg: 'var(--accent-primary)' },
  projects: { accent: '#136d4a',                 bg: 'rgba(19,109,74,0.10)',  fg: '#136d4a' },
  apps:     { accent: '#b8862a',                 bg: 'rgba(184,134,42,0.12)', fg: '#b8862a' },
  danger:   { accent: 'var(--accent-danger)',    bg: 'rgba(185,28,28,0.10)',  fg: 'var(--accent-danger)' },
};

const STATUS_COLORS = {
  pending_review: '#b8862a',
  open_for_bids:  '#136d4a',
  awarded:        '#2c2f7c',
  in_progress:    '#4f53b8',
  completed:      'var(--text-muted)',
  cancelled:      'var(--accent-danger)',
  pending:        '#b8862a',
  accepted:       '#136d4a',
  rejected:       'var(--accent-danger)',
};

const ACCOUNT_TYPES = ['individual', 'entrepreneur', 'engineering', 'developer', 'supplier'];

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { user, isSuperAdmin } = useUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.stats();
      setStats(res);
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Card definitions for the shortcut grid — kept at the page level
  // (vs. inline) so the visibility filter (super-admin) stays close
  // to the role logic.
  const shortcutCards = [
    {
      to: '/admin/users',
      icon: Users,
      titleKey: 'admin.overview.cards.users',
      descKey: 'admin.overview.cards.usersDesc',
      accent: TONE.users.accent,
      soft: TONE.users.bg,
    },
    {
      to: '/admin/projects',
      icon: FolderKanban,
      titleKey: 'admin.overview.cards.projects',
      descKey: 'admin.overview.cards.projectsDesc',
      accent: TONE.projects.accent,
      soft: TONE.projects.bg,
    },
    {
      to: '/admin/applications',
      icon: ClipboardList,
      titleKey: 'admin.overview.cards.applications',
      descKey: 'admin.overview.cards.applicationsDesc',
      accent: TONE.apps.accent,
      soft: TONE.apps.bg,
    },
    {
      to: '/admin/subscriptions',
      icon: CreditCard,
      titleKey: 'admin.overview.cards.subscriptions',
      descKey: 'admin.overview.cards.subscriptionsDesc',
      accent: '#136d4a',
      soft: 'rgba(19,109,74,0.10)',
    },
    // TODO: re-enable when plans management is ready
    // {
    //   to: '/admin/plans',
    //   icon: Package,
    //   titleKey: 'admin.overview.cards.plans',
    //   descKey: 'admin.overview.cards.plansDesc',
    //   accent: '#b8862a',
    //   soft: 'rgba(184,134,42,0.12)',
    // },
    isSuperAdmin && {
      to: '/admin/roles',
      icon: Key,
      titleKey: 'admin.overview.cards.roles',
      descKey: 'admin.overview.cards.rolesDesc',
      accent: '#b8862a',
      soft: 'rgba(184,134,42,0.12)',
    },
    {
      to: '/admin/activity',
      icon: Activity,
      titleKey: 'admin.overview.cards.activity',
      descKey: 'admin.overview.cards.activityDesc',
      accent: 'var(--text-muted)',
      soft: 'var(--bg-cream)',
    },
  ].filter(Boolean);

  const fmtTime = (iso) => {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat(lang || undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  // Derived breakdown rows. `by_account_type` / `by_status` / `by_arena`
  // are always full enumerations per the docs, so we map them through
  // the canonical key lists to keep ordering stable.
  const usersByType = stats
    ? ACCOUNT_TYPES.map((k) => ({
        label: t(`accountType.${k}`) || k,
        value: stats.users?.by_account_type?.[k] ?? 0,
      }))
    : [];

  const projectsByStatus = stats
    ? Object.entries(stats.projects?.by_status || {}).map(([k, v]) => ({
        label: t(`admin.statuses.${k}`) || k,
        value: v,
        color: STATUS_COLORS[k],
      }))
    : [];

  const projectsByArena = stats
    ? ARENAS.filter((a) => stats.projects?.by_arena?.[a.value] != null).map((a) => ({
        label: t(`arena.${a.value}.label`) || a.value,
        value: stats.projects?.by_arena?.[a.value] ?? 0,
        color: a.color,
      }))
    : [];

  const appsByStatus = stats
    ? Object.entries(stats.applications?.by_status || {}).map(([k, v]) => ({
        label: t(`admin.statuses.${k}`) || k,
        value: v,
        color: STATUS_COLORS[k],
      }))
    : [];

  const acceptanceRate =
    stats?.applications?.total
      ? ((stats.applications.by_status?.accepted ?? 0) /
          stats.applications.total) *
        100
      : 0;

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.overview.eyebrow')}
        title={
          user?.name
            ? t('admin.overview.title', { name: user.name })
            : t('admin.overview.titleAnon')
        }
        subtitle={t('admin.overview.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={14} />
            {t('admin.common.refresh')}
          </button>
        }
      />

      {/* Snapshot timestamp */}
      {stats?.generated_at && (
        <div
          className="mb-4"
          style={{ fontSize: 12, color: 'var(--text-muted)' }}
        >
          {t('admin.overview.stats.generatedAt', { time: fmtTime(stats.generated_at) })}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card style={{ marginBottom: 20 }}>
          <div
            className="flex items-center justify-between gap-4"
            style={{ color: 'var(--accent-danger)', fontSize: 13.5 }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 14px' }}
              onClick={load}
            >
              {t('admin.overview.stats.retry')}
            </button>
          </div>
        </Card>
      )}

      {/* ------- KPI row ------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {loading ? (
          [0, 1, 2, 3].map((i) => <KpiSkeleton key={i} />)
        ) : stats ? (
          <>
            <KpiCard
              icon={Users}
              title={t('admin.overview.stats.kpi.users')}
              value={stats.users?.total ?? 0}
              growth={stats.users?.growth}
              accent={TONE.users.accent}
              lang={lang}
              momLabel={t('admin.overview.stats.delta.mom')}
              yoyLabel={t('admin.overview.stats.delta.yoy')}
              onClick={() => navigate('/admin/users')}
            />
            <KpiCard
              icon={FolderKanban}
              title={t('admin.overview.stats.kpi.projects')}
              value={stats.projects?.total ?? 0}
              growth={stats.projects?.growth}
              accent={TONE.projects.accent}
              lang={lang}
              momLabel={t('admin.overview.stats.delta.mom')}
              yoyLabel={t('admin.overview.stats.delta.yoy')}
              onClick={() => navigate('/admin/projects')}
            />
            <KpiCard
              icon={ClipboardList}
              title={t('admin.overview.stats.kpi.applications')}
              value={stats.applications?.total ?? 0}
              growth={stats.applications?.growth}
              accent={TONE.apps.accent}
              lang={lang}
              momLabel={t('admin.overview.stats.delta.mom')}
              yoyLabel={t('admin.overview.stats.delta.yoy')}
              onClick={() => navigate('/admin/applications')}
            />
            <KpiCard
              icon={ShieldOff}
              title={t('admin.overview.stats.kpi.suspended')}
              value={stats.users?.suspended ?? 0}
              accent={TONE.danger.accent}
              lang={lang}
              sublabel={
                stats.users?.total
                  ? `${((stats.users.suspended / stats.users.total) * 100).toFixed(1)}%`
                  : undefined
              }
              onClick={() =>
                navigate('/admin/users?suspended=1')
              }
            />
          </>
        ) : null}
      </div>

      {/* ------- User growth line chart ------- */}
      {stats?.users?.growth?.monthly_series && (
        <Card style={{ marginBottom: 20 }}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: TONE.users.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.chart.users')}
              </h3>
            </div>
          </div>
          <LineChart
            series={stats.users.growth.monthly_series}
            color={TONE.users.accent}
            lang={lang}
            valueLabel={t('admin.overview.stats.chart.legendUsers')}
          />
        </Card>
      )}

      {/* ------- Two secondary charts ------- */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} style={{ color: TONE.projects.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.chart.projects')}
              </h3>
            </div>
            <LineChart
              series={stats.projects?.growth?.monthly_series || []}
              color={TONE.projects.accent}
              lang={lang}
              valueLabel={t('admin.overview.stats.chart.legendProjects')}
              height={180}
            />
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} style={{ color: TONE.apps.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.chart.applications')}
              </h3>
            </div>
            <LineChart
              series={stats.applications?.growth?.monthly_series || []}
              color={TONE.apps.accent}
              lang={lang}
              valueLabel={t('admin.overview.stats.chart.legendApplications')}
              height={180}
            />
          </Card>
        </div>
      )}

      {/* ------- Breakdown row ------- */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={15} style={{ color: TONE.users.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.breakdown.usersByType')}
              </h3>
            </div>
            <BarList
              rows={usersByType}
              lang={lang}
              accent={TONE.users.accent}
              hideZero
            />
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={15} style={{ color: TONE.projects.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.breakdown.projectsByStatus')}
              </h3>
            </div>
            <BarList rows={projectsByStatus} lang={lang} hideZero />
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Map size={15} style={{ color: TONE.projects.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.breakdown.projectsByArena')}
              </h3>
            </div>
            <BarList rows={projectsByArena} lang={lang} hideZero />
          </Card>
        </div>
      )}

      {/* ------- Applications by status + secondary metrics ------- */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-7">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={15} style={{ color: TONE.apps.accent }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.breakdown.applicationsByStatus')}
              </h3>
            </div>
            <BarList rows={appsByStatus} lang={lang} hideZero />
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={15} style={{ color: 'var(--text-muted)' }} />
              <h3
                className="font-display m-0"
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t('admin.overview.stats.secondary.title')}
              </h3>
            </div>
            <ul
              className="m-0 p-0 flex flex-col gap-2.5"
              style={{ listStyle: 'none', fontSize: 13 }}
            >
              <MetricRow
                label={t('admin.overview.stats.secondary.admins')}
                value={stats.users?.admins ?? 0}
                lang={lang}
              />
              <MetricRow
                label={t('admin.overview.stats.secondary.superAdmins')}
                value={stats.users?.super_admins ?? 0}
                lang={lang}
              />
              <MetricRow
                label={t('admin.overview.stats.secondary.withApps')}
                value={stats.projects?.with_applications ?? 0}
                hint={t('admin.overview.stats.secondary.ofTotal', {
                  total: stats.projects?.total ?? 0,
                })}
                lang={lang}
              />
              <MetricRow
                label={t('admin.overview.stats.secondary.withoutApps')}
                value={stats.projects?.without_applications ?? 0}
                lang={lang}
              />
              <MetricRow
                label={t('admin.overview.stats.secondary.acceptanceRate')}
                value={`${acceptanceRate.toFixed(1)}%`}
                hint={t('admin.overview.stats.secondary.ofTotal', {
                  total: stats.applications?.total ?? 0,
                })}
              />
            </ul>
          </Card>
        </div>
      )}

      {/* ------- Shortcut cards ------- */}
      <div
        className="font-semibold uppercase mb-3 px-1"
        style={{
          fontSize: 11,
          letterSpacing: '0.14em',
          color: 'var(--text-muted)',
        }}
      >
        {t('admin.overview.stats.sectionShortcuts')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shortcutCards.map((card) => (
          <Card
            key={card.to}
            style={{
              cursor: 'pointer',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onClick={() => navigate(card.to)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: card.soft,
                  color: card.accent,
                }}
              >
                <card.icon size={20} strokeWidth={1.8} />
              </div>
              <h3
                className="font-display m-0"
                style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-ink)' }}
              >
                {t(card.titleKey)}
              </h3>
            </div>
            <p
              className="m-0"
              style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}
            >
              {t(card.descKey)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}


/* ---------- helpers ---------- */

function KpiSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div className="shimmer" style={{ height: 14, width: 100, borderRadius: 6 }} />
      <div className="shimmer" style={{ height: 30, width: 120, borderRadius: 6 }} />
      <div className="shimmer" style={{ height: 36, width: '100%', borderRadius: 6 }} />
    </div>
  );
}

function MetricRow({ label, value, hint, lang }) {
  const display =
    typeof value === 'number'
      ? new Intl.NumberFormat(lang || undefined).format(value)
      : value;
  return (
    <li className="flex items-center justify-between gap-3">
      <span style={{ color: 'var(--text-ink-soft)' }}>{label}</span>
      <span className="flex items-baseline gap-1.5" style={{ flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: 'var(--text-ink)' }}>{display}</span>
        {hint && (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{hint}</span>
        )}
      </span>
    </li>
  );
}
