import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Plus,
  FileSpreadsheet,
  FileText,
  Eye,
  CalendarPlus,
  Ban,
  Trash2,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { admin } from '../../services';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { printReportPdf, downloadReportExcel } from '../../utils/reportExport';
import {
  PageHeader,
  Card,
  FilterSelect,
  DataTable,
  Pagination,
  Badge,
  Modal,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminSubscriptionsPage — /admin/subscriptions
 *
 *  Single-screen subscription console, wired to the admin
 *  subscription endpoints (see services/admin.js → subscriptions):
 *
 *    1. KPI row              — active / past-due / expired / total
 *                              (+ total billed revenue) from /stats
 *    2. Distribution card    — by category or by plan, by count or
 *                              by revenue: highlight tiles, share
 *                              bars, and a metrics table
 *    3. Status tabs          — map to the list endpoint's `status`
 *                              filter, counts come from /stats summary
 *    4. Search + plan filter — search is client-side over the loaded
 *                              page; plan filter is server-side
 *    5. Data table           — one row per subscription, with
 *                              View / Extend / Cancel / Delete actions
 *
 *  Actions reuse the shared Modal primitive. Delete is gated to
 *  super-admins (the BE enforces it too — the guard just hides a
 *  button that would 403). Export is client-side and shares the
 *  branded report layout (see utils/reportExport): Excel = styled
 *  .xls, PDF = a print window — both scoped to the loaded rows.
 * ============================================================ */

const PER_PAGE = 25;

// status enum → Badge tone
const STATUS_TONE = {
  active: 'success',
  trialing: 'primary',
  past_due: 'warning',
  canceled: 'muted',
  expired: 'danger',
};

const KPI_TONE = {
  active: { accent: '#136d4a', soft: 'rgba(19,109,74,0.10)' },
  past_due: { accent: '#b8862a', soft: 'rgba(184,134,42,0.12)' },
  expired: { accent: 'var(--accent-danger)', soft: 'rgba(185,28,28,0.10)' },
  total: { accent: 'var(--accent-primary)', soft: 'rgba(44,47,124,0.10)' },
};

// Order the distribution palette so bars stay visually distinct.
const DIST_COLORS = ['#2c2f7c', '#136d4a', '#b8862a', '#4f53b8', '#b91c1c', '#0e7490', '#7c3aed'];

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { isSuperAdmin } = useUser();

  /* ---------- stats ---------- */
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  /* ---------- plans ---------- */
  const [plans, setPlans] = useState([]); // all plans, for the list's plan filter
  const [grantPlans, setGrantPlans] = useState([]); // scoped to the selected user's account type
  const [grantPlansLoading, setGrantPlansLoading] = useState(false);

  /* ---------- list ---------- */
  const [statusTab, setStatusTab] = useState(''); // '' = all
  const [planFilter, setPlanFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ---------- distribution toggles ---------- */
  const [distMode, setDistMode] = useState('account_type'); // 'account_type' | 'plan'
  const [distMetric, setDistMetric] = useState('count'); // 'count' | 'revenue'

  /* ---------- modals / actions ---------- */
  const [modal, setModal] = useState(null); // 'grant' | 'extend' | 'cancel' | 'remove' | 'details'
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  const [grantForm, setGrantForm] = useState({ user_id: '', plan_id: '', months: '', reason: '' });
  const [grantUser, setGrantUser] = useState(null); // selected subscriber object
  const [extendMonths, setExtendMonths] = useState('1');
  const [cancelReason, setCancelReason] = useState('');
  const [removeReason, setRemoveReason] = useState('');

  /* ---------- formatting helpers ---------- */
  const currencySuffix = lang === 'ar' ? 'ر.س' : 'SAR';
  const fmtNum = useCallback(
    (n) => {
      if (n == null || Number.isNaN(n)) return '—';
      try {
        return new Intl.NumberFormat(lang || undefined).format(n);
      } catch {
        return String(n);
      }
    },
    [lang]
  );
  const fmtMoney = useCallback(
    (n, currency) => {
      const num = typeof n === 'string' ? parseFloat(n) : n;
      if (num == null || Number.isNaN(num)) return '—';
      let body;
      try {
        body = new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: 2 }).format(num);
      } catch {
        body = String(num);
      }
      return `${body} ${currency || currencySuffix}`;
    },
    [lang, currencySuffix]
  );
  const fmtDate = useCallback(
    (iso) => {
      if (!iso) return '—';
      try {
        return new Intl.DateTimeFormat(lang || undefined, { dateStyle: 'medium' }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [lang]
  );
  const fmtDateTime = useCallback(
    (iso) => {
      if (!iso) return '—';
      try {
        return new Intl.DateTimeFormat(lang || undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [lang]
  );

  const planName = useCallback(
    (plan) => {
      if (!plan) return '—';
      return (lang === 'ar' ? plan.name_ar : plan.name_en) || plan.name_en || plan.name_ar || plan.code || '—';
    },
    [lang]
  );

  const periodLabel = useCallback(
    (months) => {
      const m = Number(months);
      if (m === 1) return t('admin.subscriptions.period.monthly');
      if (m === 3) return t('admin.subscriptions.period.quarterly');
      if (m === 6) return t('admin.subscriptions.period.semiAnnual');
      if (m === 12) return t('admin.subscriptions.period.annual');
      if (m > 0) return t('admin.subscriptions.period.nMonths', { n: m });
      return '—';
    },
    [t]
  );

  const accountTypeLabel = useCallback((type) => (type ? t(`accountType.${type}`) : '—'), [t]);
  const providerLabel = useCallback(
    (p) => (p ? t(`admin.subscriptions.providers.${p}`) : '—'),
    [t]
  );

  /* ---------- loaders ---------- */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await admin.subscriptions.stats();
      setStats(res || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.subscriptions.list({
        status: statusTab || undefined,
        plan_id: planFilter || undefined,
        per_page: PER_PAGE,
        page,
      });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
  }, [statusTab, planFilter, page, t]);

  const loadPlans = useCallback(async () => {
    try {
      const res = await admin.subscriptions.plans();
      setPlans(Array.isArray(res) ? res : []);
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadPlans();
  }, [loadStats, loadPlans]);

  // Load plans scoped to the selected subscriber's account type so the
  // grant picker only offers plans the BE will accept (avoids a 422 on
  // an account-type mismatch). Re-runs whenever the chosen user changes.
  useEffect(() => {
    if (modal !== 'grant' || !grantUser?.account_type) {
      setGrantPlans([]);
      return undefined;
    }
    let active = true;
    setGrantPlansLoading(true);
    admin.subscriptions
      .plans({ account_type: grantUser.account_type })
      .then((res) => {
        if (active) setGrantPlans(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (active) setGrantPlans([]);
      })
      .finally(() => {
        if (active) setGrantPlansLoading(false);
      });
    return () => {
      active = false;
    };
  }, [modal, grantUser]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Reset to page 1 whenever a server-side filter changes.
  useEffect(() => {
    setPage(1);
  }, [statusTab, planFilter]);

  const refreshAll = () => {
    loadStats();
    loadList();
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  /* ---------- derived: status tabs ---------- */
  const tabs = useMemo(() => {
    const s = stats?.summary || {};
    const base = [
      { key: '', count: s.total },
      { key: 'active', count: s.active },
      { key: 'trialing', count: s.trialing, onlyIfPositive: true },
      { key: 'past_due', count: s.past_due },
      { key: 'canceled', count: s.canceled, onlyIfPositive: true },
      { key: 'expired', count: s.expired },
    ];
    return base.filter((tb) => !tb.onlyIfPositive || (tb.count || 0) > 0);
  }, [stats]);

  /* ---------- derived: distribution rows ---------- */
  const distRows = useMemo(() => {
    const src = distMode === 'plan' ? stats?.by_plan : stats?.by_account_type;
    if (!Array.isArray(src)) return [];
    const rows = src.map((r, i) => ({
      key: distMode === 'plan' ? r.plan_id ?? i : r.account_type ?? i,
      label: distMode === 'plan' ? planName(r) : accountTypeLabel(r.account_type),
      count: r.count || 0,
      active: r.active || 0,
      revenue: r.revenue || 0,
      avgValue: r.avg_value || 0,
      metric: distMetric === 'revenue' ? r.revenue || 0 : r.count || 0,
      color: DIST_COLORS[i % DIST_COLORS.length],
    }));
    // Sort by the active metric descending so bars/highlights read top-down.
    return rows.sort((a, b) => b.metric - a.metric);
  }, [distMode, distMetric, stats, planName, accountTypeLabel]);

  const distTotal = useMemo(() => distRows.reduce((acc, r) => acc + r.metric, 0), [distRows]);
  const mostRow = distRows[0] || null;
  const leastRow = distRows.length > 1 ? distRows[distRows.length - 1] : null;

  const sharePct = (metric) => (distTotal > 0 ? ((metric / distTotal) * 100) : 0);

  /* ---------- derived: client-side search over the loaded page ---------- */
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((row) => {
      const u = row.user || {};
      const haystack = [
        u.name,
        u.phone,
        u.email,
        String(row.id),
        planName(row.plan),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, data.rows, planName]);

  /* ---------- actions ---------- */
  const openDetails = async (row) => {
    setSelected(row);
    setModal('details');
    setDetails(null);
    setDetailsLoading(true);
    try {
      const res = await admin.subscriptions.get(row.id);
      setDetails(res || null);
    } catch {
      setDetails(row); // fall back to the list row so the modal isn't empty
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setSelected(null);
    setActionError('');
    setDetails(null);
  };

  const openGrant = () => {
    setGrantForm({ user_id: '', plan_id: '', months: '', reason: '' });
    setGrantUser(null);
    setActionError('');
    setModal('grant');
  };
  const openExtend = (row) => {
    setSelected(row);
    setExtendMonths('1');
    setActionError('');
    setModal('extend');
  };
  const openCancel = (row) => {
    setSelected(row);
    setCancelReason('');
    setActionError('');
    setModal('cancel');
  };
  const openRemove = (row) => {
    setSelected(row);
    setRemoveReason('');
    setActionError('');
    setModal('remove');
  };

  const afterMutation = (msg) => {
    showToast(msg);
    closeModal();
    refreshAll();
  };

  const handleGrant = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.subscriptions.grant({
        user_id: Number(grantForm.user_id),
        plan_id: Number(grantForm.plan_id),
        months: grantForm.months ? Number(grantForm.months) : undefined,
        reason: grantForm.reason || undefined,
      });
      afterMutation(t('admin.subscriptions.grant.done'));
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      const months = Number(extendMonths);
      await admin.subscriptions.extend(selected.id, months);
      afterMutation(t('admin.subscriptions.extend.done', { n: months }));
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.subscriptions.cancel(selected.id, cancelReason || undefined);
      afterMutation(t('admin.subscriptions.cancel.done'));
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.subscriptions.remove(selected.id, removeReason || undefined);
      afterMutation(t('admin.subscriptions.remove.done'));
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- export ---------- */
  const exportColumns = useMemo(
    () => [
      { header: '#', get: (r) => r.id },
      { header: t('admin.subscriptions.table.user'), get: (r) => r.user?.name || '' },
      { header: t('admin.subscriptions.table.type'), get: (r) => accountTypeLabel(r.user?.account_type) },
      { header: t('admin.subscriptions.table.plan'), get: (r) => planName(r.plan) },
      { header: t('admin.subscriptions.table.period'), get: (r) => periodLabel(r.plan?.billing_interval_months) },
      { header: t('admin.subscriptions.table.startsAt'), get: (r) => fmtDate(r.current_period_starts_at) },
      { header: t('admin.subscriptions.table.endsAt'), get: (r) => fmtDate(r.current_period_ends_at) },
      { header: t('admin.subscriptions.table.paymentMethod'), get: (r) => providerLabel(r.provider) },
      { header: t('admin.subscriptions.table.amount'), get: (r) => fmtMoney(r.plan?.price, r.plan?.currency) },
      { header: t('admin.subscriptions.table.status'), get: (r) => t(`admin.subStatuses.${r.status}`) },
    ],
    [t, accountTypeLabel, planName, periodLabel, fmtDate, providerLabel, fmtMoney]
  );

  // Subtitle line under the logo: "Subscriptions report — <tab> — N subscriptions".
  const reportMeta = () => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const tabLabel = statusTab
      ? t(`admin.subscriptions.tabs.${statusTab}`)
      : t('admin.subscriptions.tabs.all');
    const subtitle = [
      t('admin.subscriptions.report.label'),
      tabLabel,
      t('admin.subscriptions.report.count', { n: visibleRows.length }),
    ].join(' — ');
    return {
      title: t('admin.subscriptions.report.label'),
      subtitle,
      columns: exportColumns,
      rows: visibleRows,
      dir,
      lang,
    };
  };

  const exportCsv = () => {
    downloadReportExcel({ ...reportMeta(), filename: `subscriptions-${statusTab || 'all'}` });
    showToast(t('admin.subscriptions.exported'));
  };

  const exportPdf = () => {
    if (printReportPdf(reportMeta())) showToast(t('admin.subscriptions.exported'));
  };

  /* ---------- table columns ---------- */
  const columns = useMemo(
    () => [
      {
        key: 'user',
        label: t('admin.subscriptions.table.user'),
        render: (row) => {
          const u = row.user || {};
          return (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center font-display font-bold flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#2c2f7c',
                  color: 'white',
                  fontSize: 13,
                }}
              >
                {(u.name || '·').trim().charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
                  {u.name || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('admin.subscriptions.ids.sub', { id: row.id })}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'type',
        label: t('admin.subscriptions.table.type'),
        render: (row) =>
          row.user?.account_type ? (
            <Badge tone="primary">{accountTypeLabel(row.user.account_type)}</Badge>
          ) : (
            '—'
          ),
      },
      {
        key: 'plan',
        label: t('admin.subscriptions.table.plan'),
        render: (row) => (
          <span style={{ fontSize: 13, color: 'var(--text-ink)' }}>{planName(row.plan)}</span>
        ),
      },
      {
        key: 'period',
        label: t('admin.subscriptions.table.period'),
        render: (row) => periodLabel(row.plan?.billing_interval_months),
      },
      {
        key: 'starts',
        label: t('admin.subscriptions.table.startsAt'),
        render: (row) => fmtDate(row.current_period_starts_at),
      },
      {
        key: 'ends',
        label: t('admin.subscriptions.table.endsAt'),
        render: (row) => fmtDate(row.current_period_ends_at),
      },
      {
        key: 'provider',
        label: t('admin.subscriptions.table.paymentMethod'),
        render: (row) => (
          <div className="flex flex-col">
            <span style={{ fontSize: 13 }}>{providerLabel(row.provider)}</span>
            {row.provider === 'manual' && !row.has_saved_token && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {t('admin.subscriptions.table.manualNoRenew')}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'amount',
        label: t('admin.subscriptions.table.amount'),
        render: (row) => (
          <span style={{ fontWeight: 600, color: 'var(--text-ink)', fontSize: 13 }}>
            {fmtMoney(row.plan?.price, row.plan?.currency)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('admin.subscriptions.table.status'),
        render: (row) => (
          <div className="flex flex-col gap-1 items-start">
            <Badge tone={STATUS_TONE[row.status] || 'default'}>
              {t(`admin.subStatuses.${row.status}`)}
            </Badge>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: row.is_active ? '#136d4a' : 'var(--text-muted)',
              }}
            >
              {row.is_active
                ? t('admin.subscriptions.table.accessOn')
                : t('admin.subscriptions.table.accessOff')}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        label: t('admin.subscriptions.table.actions'),
        headerStyle: { textAlign: 'end' },
        cellStyle: { textAlign: 'end' },
        render: (row) => {
          const canExtend = row.status !== 'canceled';
          const canCancel = row.status !== 'canceled' && row.status !== 'expired';
          return (
            <div
              className="inline-flex items-center"
              style={{
                gap: 2,
                padding: 3,
                borderRadius: 11,
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-soft)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <IconAction icon={Eye} label={t('admin.subscriptions.actions.view')} onClick={() => openDetails(row)} />
              {canExtend && (
                <IconAction
                  icon={CalendarPlus}
                  label={t('admin.subscriptions.actions.extend')}
                  onClick={() => openExtend(row)}
                />
              )}
              {canCancel && (
                <IconAction
                  icon={Ban}
                  tone="warning"
                  label={t('admin.subscriptions.actions.cancel')}
                  onClick={() => openCancel(row)}
                />
              )}
              {isSuperAdmin && (
                <IconAction
                  icon={Trash2}
                  tone="danger"
                  label={t('admin.subscriptions.actions.delete')}
                  onClick={() => openRemove(row)}
                />
              )}
            </div>
          );
        },
      },
    ],
    [t, accountTypeLabel, planName, periodLabel, fmtDate, providerLabel, fmtMoney, isSuperAdmin]
  );

  const summary = stats?.summary || {};

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.subscriptions.eyebrow')}
        title={t('admin.subscriptions.title')}
        subtitle={t('admin.subscriptions.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={refreshAll}
            disabled={statsLoading || loading}
          >
            <RefreshCw size={14} />
            {t('admin.common.refresh')}
          </button>
        }
      />

      {toast && (
        <div
          className="mb-4 p-3 rounded-[10px]"
          style={{
            background: 'rgba(19,109,74,0.10)',
            border: '1px solid rgba(19,109,74,0.22)',
            color: '#136d4a',
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}

      {/* ---------- KPI row ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {statsLoading ? (
          [0, 1, 2, 3].map((i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <SubKpi
              icon={CheckCircle2}
              tone={KPI_TONE.active}
              label={t('admin.subscriptions.kpi.active')}
              value={fmtNum(summary.active ?? 0)}
            />
            <SubKpi
              icon={Clock}
              tone={KPI_TONE.past_due}
              label={t('admin.subscriptions.kpi.pastDue')}
              value={fmtNum(summary.past_due ?? 0)}
            />
            <SubKpi
              icon={XCircle}
              tone={KPI_TONE.expired}
              label={t('admin.subscriptions.kpi.expired')}
              value={fmtNum(summary.expired ?? 0)}
            />
            <SubKpi
              icon={Layers}
              tone={KPI_TONE.total}
              label={t('admin.subscriptions.kpi.total')}
              value={fmtNum(summary.total ?? 0)}
              sublabel={t('admin.subscriptions.kpi.revenueSub', {
                amount: fmtMoney(summary.total_revenue ?? 0),
              })}
            />
          </>
        )}
      </div>

      {/* ---------- Distribution card ---------- */}
      <Card style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="font-display m-0" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}>
              {t('admin.subscriptions.distribution.title')}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Segmented
              value={distMetric}
              onChange={setDistMetric}
              options={[
                { value: 'count', label: t('admin.subscriptions.distribution.byCount') },
                { value: 'revenue', label: t('admin.subscriptions.distribution.byRevenue') },
              ]}
            />
            <Segmented
              value={distMode}
              onChange={setDistMode}
              options={[
                { value: 'plan', label: t('admin.subscriptions.distribution.byPlan') },
                { value: 'account_type', label: t('admin.subscriptions.distribution.byCategory') },
              ]}
            />
          </div>
        </div>

        {statsLoading ? (
          <div className="shimmer" style={{ height: 180, borderRadius: 12 }} />
        ) : distRows.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
            {t('admin.subscriptions.distribution.empty')}
          </div>
        ) : (
          <>
            {/* highlight tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {mostRow && (
                <HighlightTile
                  icon={TrendingUp}
                  caption={t('admin.subscriptions.distribution.most')}
                  title={mostRow.label}
                  subtitle={`${t('admin.subscriptions.distribution.subsCount', { n: fmtNum(mostRow.count) })} · ${t(
                    'admin.subscriptions.distribution.shareOfTotal',
                    { pct: sharePct(mostRow.metric).toFixed(0) }
                  )}`}
                  tone="success"
                />
              )}
              {leastRow && (
                <HighlightTile
                  icon={TrendingDown}
                  caption={t('admin.subscriptions.distribution.least')}
                  title={leastRow.label}
                  subtitle={`${t('admin.subscriptions.distribution.subsCount', { n: fmtNum(leastRow.count) })} · ${t(
                    'admin.subscriptions.distribution.shareOfTotal',
                    { pct: sharePct(leastRow.metric).toFixed(0) }
                  )}`}
                  tone="muted"
                />
              )}
            </div>

            {/* share bars */}
            <div className="flex flex-col gap-2.5 mb-5">
              {distRows.map((r) => {
                const pct = sharePct(r.metric);
                return (
                  <div key={r.key} className="flex items-center gap-3">
                    <div
                      className="truncate"
                      style={{ width: 120, fontSize: 12.5, fontWeight: 600, color: 'var(--text-ink-soft)', flexShrink: 0 }}
                    >
                      {r.label}
                    </div>
                    <div
                      className="flex-1"
                      style={{ height: 10, borderRadius: 999, background: 'var(--bg-canvas)', overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: r.color,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div
                      style={{ width: 96, fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0, textAlign: 'end' }}
                    >
                      {distMetric === 'revenue' ? fmtMoney(r.metric) : t('admin.subscriptions.distribution.subsCount', { n: fmtNum(r.count) })}
                      {' · '}
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* metrics table */}
            <div className="overflow-x-auto" data-on-surface="true">
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
                <thead>
                  <tr>
                    {[
                      distMode === 'plan'
                        ? t('admin.subscriptions.distribution.columns.plan')
                        : t('admin.subscriptions.distribution.columns.category'),
                      t('admin.subscriptions.distribution.columns.subscriptions'),
                      t('admin.subscriptions.distribution.columns.active'),
                      t('admin.subscriptions.distribution.columns.revenue'),
                      t('admin.subscriptions.distribution.columns.avgValue'),
                      t('admin.subscriptions.distribution.columns.share'),
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="text-start"
                        style={{
                          padding: '10px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-canvas)',
                          borderBottom: '1px solid var(--border-default)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {distRows.map((r) => (
                    <tr key={r.key}>
                      <td style={cellStyle}>
                        <span className="flex items-center gap-2">
                          <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{r.label}</span>
                        </span>
                      </td>
                      <td style={cellStyle}>{fmtNum(r.count)}</td>
                      <td style={cellStyle}>
                        <Badge tone="success">{t('admin.subscriptions.distribution.activeChip', { n: fmtNum(r.active) })}</Badge>
                      </td>
                      <td style={cellStyle}>{fmtMoney(r.revenue)}</td>
                      <td style={cellStyle}>{fmtMoney(r.avgValue)}</td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: 'var(--text-ink)' }}>
                        {sharePct(r.metric).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* ---------- Status tabs ----------
          `sub-tabs-scroll` hides the horizontal scrollbar (which would
          otherwise show its arrows just above the search bar) while
          keeping the row swipeable on narrow screens. */}
      <style>{`
        .sub-tabs-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .sub-tabs-scroll::-webkit-scrollbar { height: 0; width: 0; display: none; }
      `}</style>
      <div
        className="sub-tabs-scroll flex items-center gap-1 mb-4 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        {tabs.map((tb) => {
          const isActive = statusTab === tb.key;
          return (
            <button
              key={tb.key || 'all'}
              type="button"
              onClick={() => setStatusTab(tb.key)}
              style={{
                position: 'relative',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-ink-soft)',
                whiteSpace: 'nowrap',
                borderBottom: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {tb.key
                ? t(`admin.subscriptions.tabs.${tb.key}`)
                : t('admin.subscriptions.tabs.all')}
              {tb.count != null && (
                <span
                  style={{
                    marginInlineStart: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  ({fmtNum(tb.count)})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------- Search + plan filter + actions ---------- */}
      <Card padded={false} style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative flex-1" style={{ minWidth: 220, maxWidth: 420 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.subscriptions.search')}
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10,
                  color: 'var(--text-ink)',
                  outline: 'none',
                  padding: '10px 14px',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <FilterSelect
              label={t('admin.subscriptions.table.plan')}
              value={planFilter}
              onChange={setPlanFilter}
              options={[
                { value: '', label: t('admin.subscriptions.allPlans') },
                ...plans.map((p) => ({ value: String(p.id), label: planName(p) })),
              ]}
              minWidth={180}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={openGrant}>
              <Plus size={15} />
              {t('admin.subscriptions.actions.add')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 14px' }}
              onClick={exportCsv}
              disabled={!visibleRows.length}
            >
              <FileSpreadsheet size={14} />
              {t('admin.subscriptions.actions.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 14px' }}
              onClick={exportPdf}
              disabled={!visibleRows.length}
            >
              <FileText size={14} />
              {t('admin.subscriptions.actions.exportPdf')}
            </button>
          </div>
        </div>
      </Card>

      {/* ---------- Data table ---------- */}
      <Card padded={false}>
        <div
          className="px-4 py-3 font-display"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)', borderBottom: '1px solid var(--border-soft)' }}
        >
          {statusTab ? t(`admin.subscriptions.tabs.${statusTab}`) : t('admin.subscriptions.listTitle')}
        </div>
        {error && (
          <div
            className="p-4"
            style={{
              background: 'rgba(185,28,28,0.06)',
              borderBottom: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle={t('admin.subscriptions.table.empty')}
          onRowClick={(row) => openDetails(row)}
        />
        <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
      </Card>

      {/* ============================================================
       *  Modals
       * ============================================================ */}

      {/* ---------- Grant ---------- */}
      <Modal
        open={modal === 'grant'}
        onClose={closeModal}
        title={t('admin.subscriptions.grant.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleGrant}
              disabled={busy || !grantForm.user_id || !grantForm.plan_id}
            >
              {busy ? '…' : t('admin.subscriptions.grant.submit')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-4" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.subscriptions.grant.description')}
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="field-label">{t('admin.subscriptions.grant.user')}</label>
            <UserSearchField
              t={t}
              selectedUser={grantUser}
              accountTypeLabel={accountTypeLabel}
              onSelect={(u) => {
                setGrantUser(u);
                // New subscriber → their plan set differs; clear any prior pick.
                setGrantForm((prev) => ({ ...prev, user_id: u.id, plan_id: '' }));
              }}
              onClear={() => {
                setGrantUser(null);
                setGrantForm((prev) => ({ ...prev, user_id: '', plan_id: '' }));
              }}
            />
          </div>
          <div>
            <label className="field-label">{t('admin.subscriptions.grant.plan')}</label>
            {!grantUser ? (
              <select className="field" disabled value="">
                <option value="">{t('admin.subscriptions.grant.planNeedsUser')}</option>
              </select>
            ) : grantPlansLoading ? (
              <select className="field" disabled value="">
                <option value="">{t('admin.subscriptions.grant.plansLoading')}</option>
              </select>
            ) : grantPlans.length > 0 ? (
              <select
                className="field"
                value={grantForm.plan_id}
                onChange={(e) => setGrantForm({ ...grantForm, plan_id: e.target.value })}
              >
                <option value="">{t('admin.subscriptions.grant.planPlaceholder')}</option>
                {grantPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {planName(p)} — {fmtMoney(p.price, p.currency)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="field-hint" style={{ marginTop: 6 }}>
                {t('admin.subscriptions.grant.noPlans')}
              </div>
            )}
          </div>
          <div>
            <label className="field-label">{t('admin.subscriptions.grant.months')}</label>
            <input
              type="number"
              min="1"
              max="24"
              className="field field-no-icon"
              value={grantForm.months}
              onChange={(e) => setGrantForm({ ...grantForm, months: e.target.value })}
            />
            <div className="field-hint">{t('admin.subscriptions.grant.monthsHint')}</div>
          </div>
          <div>
            <label className="field-label">{t('admin.subscriptions.grant.reason')}</label>
            <input
              className="field field-no-icon"
              placeholder={t('admin.subscriptions.grant.reasonPlaceholder')}
              value={grantForm.reason}
              onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
            />
          </div>
          {actionError && <ErrorBox>{actionError}</ErrorBox>}
        </div>
      </Modal>

      {/* ---------- Extend ---------- */}
      <Modal
        open={modal === 'extend'}
        onClose={closeModal}
        title={t('admin.subscriptions.extend.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleExtend}
              disabled={busy || !(Number(extendMonths) >= 1 && Number(extendMonths) <= 24)}
            >
              {busy ? '…' : t('admin.subscriptions.extend.submit')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-4" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.subscriptions.extend.description')}
        </p>
        <div>
          <label className="field-label">{t('admin.subscriptions.extend.months')}</label>
          <input
            type="number"
            min="1"
            max="24"
            className="field field-no-icon"
            value={extendMonths}
            onChange={(e) => setExtendMonths(e.target.value)}
          />
          <div className="field-hint">{t('admin.subscriptions.extend.monthsHint')}</div>
        </div>
        {actionError && <ErrorBox>{actionError}</ErrorBox>}
      </Modal>

      {/* ---------- Cancel ---------- */}
      <Modal
        open={modal === 'cancel'}
        onClose={closeModal}
        title={t('admin.subscriptions.cancel.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '10px 18px',
                background: '#b91c1c',
                borderColor: '#b91c1c',
                boxShadow: '0 6px 14px rgba(185,28,28,0.20)',
              }}
              onClick={handleCancel}
              disabled={busy}
            >
              {busy ? '…' : t('admin.subscriptions.cancel.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-4" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.subscriptions.cancel.description')}
        </p>
        <div>
          <label className="field-label">{t('admin.subscriptions.cancel.reason')}</label>
          <textarea
            className="field"
            rows={3}
            placeholder={t('admin.subscriptions.cancel.reasonPlaceholder')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        {actionError && <ErrorBox>{actionError}</ErrorBox>}
      </Modal>

      {/* ---------- Remove (super-admin) ---------- */}
      <Modal
        open={modal === 'remove'}
        onClose={closeModal}
        title={t('admin.subscriptions.remove.title')}
        footer={
          <>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal} disabled={busy}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '10px 18px',
                background: '#b91c1c',
                borderColor: '#b91c1c',
                boxShadow: '0 6px 14px rgba(185,28,28,0.20)',
              }}
              onClick={handleRemove}
              disabled={busy}
            >
              {busy ? '…' : t('admin.subscriptions.remove.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 mb-4" style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>
          {t('admin.subscriptions.remove.description')}
        </p>
        <div>
          <label className="field-label">{t('admin.subscriptions.remove.reason')}</label>
          <textarea
            className="field"
            rows={3}
            placeholder={t('admin.subscriptions.remove.reasonPlaceholder')}
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        {actionError && <ErrorBox>{actionError}</ErrorBox>}
      </Modal>

      {/* ---------- Details ---------- */}
      <Modal
        open={modal === 'details'}
        onClose={closeModal}
        width={640}
        title={t('admin.subscriptions.details.title', { id: selected?.id ?? '' })}
        footer={
          <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '10px 18px' }} onClick={closeModal}>
            {t('admin.common.close')}
          </button>
        }
      >
        {detailsLoading || !details ? (
          <div className="shimmer" style={{ height: 160, borderRadius: 12 }} />
        ) : (
          <DetailsBody
            sub={details}
            t={t}
            fmtDate={fmtDate}
            fmtDateTime={fmtDateTime}
            fmtMoney={fmtMoney}
            fmtNum={fmtNum}
            planName={planName}
            periodLabel={periodLabel}
            providerLabel={providerLabel}
            accountTypeLabel={accountTypeLabel}
            onOpenUser={(uid) => {
              closeModal();
              navigate(`/admin/users/${uid}`);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ============================================================
 *  Local presentational helpers
 * ============================================================ */

const cellStyle = {
  padding: '11px 14px',
  color: 'var(--text-ink-soft)',
  borderBottom: '1px solid var(--border-soft)',
  whiteSpace: 'nowrap',
};


function SubKpi({ icon: Icon, label, value, sublabel, tone }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 44, height: 44, borderRadius: 12, background: tone.soft, color: tone.accent }}
      >
        <Icon size={21} strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div
          className="truncate"
          style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {label}
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.1 }}>
          {value}
        </div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div className="shimmer" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
      <div className="flex-1">
        <div className="shimmer" style={{ height: 12, width: 90, borderRadius: 6 }} />
        <div className="shimmer mt-2" style={{ height: 26, width: 60, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div
      className="inline-flex items-center"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', borderRadius: 999, padding: 3 }}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              background: isActive ? 'var(--accent-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--text-ink-soft)',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function HighlightTile({ icon: Icon, caption, title, subtitle, tone }) {
  const accent = tone === 'success' ? '#136d4a' : 'var(--text-muted)';
  const soft = tone === 'success' ? 'rgba(19,109,74,0.07)' : 'var(--bg-canvas)';
  const border = tone === 'success' ? 'rgba(19,109,74,0.20)' : 'var(--border-default)';
  return (
    <div style={{ background: soft, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: accent }}>
        <Icon size={14} />
        {caption}
      </div>
      <div className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-ink)' }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}

const ICON_ACTION_TONES = {
  neutral: { color: 'var(--text-ink-soft)', hbg: 'rgba(44,47,124,0.10)', hcolor: 'var(--accent-primary)' },
  warning: { color: '#b8862a', hbg: 'rgba(184,134,42,0.16)', hcolor: '#9a701f' },
  danger: { color: 'var(--accent-danger)', hbg: 'rgba(185,28,28,0.12)', hcolor: 'var(--accent-danger)' },
};

function IconAction({ icon: Icon, label, onClick, tone = 'neutral' }) {
  const tn = ICON_ACTION_TONES[tone] || ICON_ACTION_TONES.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex items-center justify-center"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: tn.color,
        fontFamily: 'inherit',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tn.hbg;
        e.currentTarget.style.color = tn.hcolor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = tn.color;
      }}
    >
      <Icon size={15} strokeWidth={1.85} />
    </button>
  );
}

/* ---------- UserSearchField — debounced search over /admin/users ----------
 *  Used in the grant modal: the admin types a name or email, picks a
 *  match, and we send the resolved numeric id to the grant endpoint. */
function UserSearchField({ t, selectedUser, accountTypeLabel, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (selectedUser) return undefined;
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    let active = true;
    setSearching(true);
    setTouched(true);
    const id = setTimeout(async () => {
      try {
        const res = await admin.users.list({ search: query, per_page: 8 });
        if (active) setResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [q, selectedUser]);

  if (selectedUser) {
    return (
      <div
        className="flex items-center justify-between gap-3 p-3 rounded-[10px]"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center flex-shrink-0 font-display"
            style={{ width: 34, height: 34, borderRadius: '50%', background: '#2c2f7c', color: 'white', fontSize: 13, fontWeight: 700 }}
          >
            {(selectedUser.name || '·').trim().charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {selectedUser.name || '—'}
              {selectedUser.account_type ? (
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> · {accountTypeLabel(selectedUser.account_type)}</span>
              ) : null}
            </div>
            <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {selectedUser.email || selectedUser.phone || `#${selectedUser.id}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="btn-secondary"
          style={{ width: 'auto', padding: '7px 12px', flexShrink: 0 }}
        >
          <X size={13} />
          {t('admin.subscriptions.grant.changeUser')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search
          size={15}
          style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('admin.subscriptions.grant.userSearch')}
          className="field"
          style={{ padding: '11px 38px' }}
        />
        {searching && (
          <Loader2
            size={15}
            className="animate-spin"
            style={{ position: 'absolute', top: '50%', insetInlineEnd: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
        )}
      </div>
      <div className="field-hint">{t('admin.subscriptions.grant.userSearchHint')}</div>
      {results.length > 0 && (
        <div className="mt-1 flex flex-col" style={{ border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
          {results.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelect(u)}
              className="flex items-center gap-2.5 text-start"
              style={{
                padding: '9px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border-soft)' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-canvas)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <UserIcon size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span className="min-w-0">
                <span className="block font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-ink)' }}>
                  {u.name || '—'}
                </span>
                <span className="block truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {u.email || u.phone || `#${u.id}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {touched && !searching && q.trim().length >= 2 && results.length === 0 && (
        <div className="mt-1" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {t('admin.subscriptions.grant.noUsers')}
        </div>
      )}
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <div
      className="p-3 rounded-[10px] mt-3"
      style={{
        background: 'rgba(185,28,28,0.06)',
        border: '1px solid rgba(185,28,28,0.18)',
        color: 'var(--accent-danger)',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function DetailField({ label, children }) {
  return (
    <div>
      <div
        style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)', wordBreak: 'break-word' }}>
        {children || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    </div>
  );
}

function DetailsBody({
  sub,
  t,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtNum,
  planName,
  periodLabel,
  providerLabel,
  accountTypeLabel,
  onOpenUser,
}) {
  const charges = Array.isArray(sub.charges) ? sub.charges : [];
  const f = (k) => `admin.subscriptions.details.fields.${k}`;
  return (
    <div className="flex flex-col gap-5">
      {/* status + access strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={STATUS_TONE[sub.status] || 'default'}>{t(`admin.subStatuses.${sub.status}`)}</Badge>
        <Badge tone={sub.is_active ? 'success' : 'muted'}>
          {sub.is_active ? t('admin.subscriptions.table.accessOn') : t('admin.subscriptions.table.accessOff')}
        </Badge>
        <Badge tone="default">{providerLabel(sub.provider)}</Badge>
      </div>

      {/* core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <DetailField label={t('admin.subscriptions.details.plan')}>
          {planName(sub.plan)} · {periodLabel(sub.plan?.billing_interval_months)}
        </DetailField>
        <DetailField label={t('admin.subscriptions.table.amount')}>
          {fmtMoney(sub.plan?.price, sub.plan?.currency)}
        </DetailField>
        <DetailField label={t(f('period'))}>
          {fmtDate(sub.current_period_starts_at)} → {fmtDate(sub.current_period_ends_at)}
        </DetailField>
        <DetailField label={t(f('renewal'))}>
          {sub.days_until_renewal != null ? t(f('renewalDays'), { n: fmtNum(sub.days_until_renewal) }) : '—'}
        </DetailField>
        <DetailField label={t(f('savedToken'))}>
          {sub.has_saved_token ? t('admin.subscriptions.details.savedYes') : t('admin.subscriptions.details.savedNo')}
        </DetailField>
        <DetailField label={t(f('createdAt'))}>{fmtDateTime(sub.created_at)}</DetailField>
        {sub.canceled_at && <DetailField label={t(f('canceledAt'))}>{fmtDateTime(sub.canceled_at)}</DetailField>}
        {sub.ended_at && <DetailField label={t(f('endedAt'))}>{fmtDateTime(sub.ended_at)}</DetailField>}
        <DetailField label={t(f('providerSubId'))}>
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{sub.provider_subscription_id || '—'}</span>
        </DetailField>
      </div>

      {/* subscriber */}
      {sub.user && (
        <div
          className="flex items-center justify-between gap-3 p-3 rounded-[12px]"
          style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
        >
          <div className="min-w-0">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('admin.subscriptions.details.user')}
            </div>
            <div className="font-semibold truncate" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
              {sub.user.name || '—'}
              {sub.user.account_type ? ` · ${accountTypeLabel(sub.user.account_type)}` : ''}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {sub.user.phone || '—'}
              {sub.user.email ? ` · ${sub.user.email}` : ''}
            </div>
          </div>
          {sub.user.id != null && (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 12px', flexShrink: 0 }}
              onClick={() => onOpenUser(sub.user.id)}
            >
              <ExternalLink size={14} />
              {t('admin.subscriptions.details.viewUser')}
            </button>
          )}
        </div>
      )}

      {/* charges ledger */}
      <div>
        <div className="font-display mb-2" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-ink)' }}>
          {t('admin.subscriptions.details.charges')}
        </div>
        {charges.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {t('admin.subscriptions.details.chargesEmpty')}
          </div>
        ) : (
          <div className="overflow-x-auto" data-on-surface="true">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5 }}>
              <thead>
                <tr>
                  {[
                    t('admin.subscriptions.details.chargeColumns.date'),
                    t('admin.subscriptions.details.chargeColumns.kind'),
                    t('admin.subscriptions.details.chargeColumns.status'),
                    t('admin.subscriptions.details.chargeColumns.amount'),
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="text-start"
                      style={{
                        padding: '8px 12px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-canvas)',
                        borderBottom: '1px solid var(--border-default)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id}>
                    <td style={chargeCell}>{fmtDateTime(c.created_at)}</td>
                    <td style={chargeCell}>{t(`admin.subscriptions.chargeKinds.${c.kind}`)}</td>
                    <td style={chargeCell}>
                      <Badge tone={c.status === 'paid' ? 'success' : c.status === 'failed' ? 'danger' : 'default'}>
                        {t(`admin.subscriptions.chargeStatuses.${c.status}`)}
                      </Badge>
                    </td>
                    {/* charges.amount is in halalas (SAR × 100) */}
                    <td style={{ ...chargeCell, fontWeight: 600, color: 'var(--text-ink)' }}>
                      {fmtMoney((c.amount || 0) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const chargeCell = {
  padding: '9px 12px',
  color: 'var(--text-ink-soft)',
  borderBottom: '1px solid var(--border-soft)',
  whiteSpace: 'nowrap',
};
