import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Eye,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Wallet,
  ExternalLink,
  Search,
  Loader2,
} from 'lucide-react';
import { admin } from '../../services';
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
 *  AdminPaymentsPage — /admin/payments
 *
 *  Read-only payments & invoices console over the payment_charges
 *  ledger (see services/admin.js → payments and the Admin Payments
 *  Postman collection). One row = one payment_charge.
 *
 *    1. KPI row        — total revenue + the four status counts
 *                        (successful / pending / failed / refunded),
 *                        with the refunded amount as a sub-figure.
 *                        Drawn from `summary` + `tab_counts`, which
 *                        the BE computes over ALL payments — so they
 *                        stay constant as the table is filtered.
 *    2. Status tabs    — map to the list endpoint's `status` filter;
 *                        counts come from `tab_counts`.
 *    3. Filters        — search (server-side `q`: invoice # or user
 *                        name), kind (initial|renewal), method.
 *    4. Data table     — invoice / user / kind / method / amount /
 *                        status / date, with a View action.
 *    5. Details modal  — the full PaymentResource for one row.
 *
 *  Refund / confirm aren't wired on the BE yet (the can_refund /
 *  can_confirm flags are seeds for that), so this screen is
 *  read-only. Export is client-side and shares the branded report
 *  layout (see utils/reportExport): Excel = styled .xls, PDF = a
 *  print window — both scoped to the loaded rows.
 * ============================================================ */

const PER_PAGE = 25;

// status_key → Badge tone
const STATUS_TONE = {
  successful: 'success',
  pending: 'warning',
  failed: 'danger',
  refunded: 'muted',
};

const KPI_TONE = {
  revenue: { accent: 'var(--accent-primary)', soft: 'rgba(44,47,124,0.10)' },
  successful: { accent: '#136d4a', soft: 'rgba(19,109,74,0.10)' },
  pending: { accent: '#b8862a', soft: 'rgba(184,134,42,0.12)' },
  failed: { accent: 'var(--accent-danger)', soft: 'rgba(185,28,28,0.10)' },
  refunded: { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)' },
};

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  /* ---------- list + summary (one endpoint) ---------- */
  const [statusTab, setStatusTab] = useState(''); // '' = all
  const [kindFilter, setKindFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tabCounts, setTabCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ---------- details modal ---------- */
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [toast, setToast] = useState('');

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

  // client_category is the raw account_type enum — localize it.
  const categoryLabel = useCallback(
    (cat) => (cat ? t(`accountType.${cat}`) : '—'),
    [t]
  );

  /* ---------- loader ---------- */
  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.payments.list({
        status: statusTab || undefined,
        kind: kindFilter || undefined,
        payment_method: methodFilter || undefined,
        q: debouncedQ || undefined,
        per_page: PER_PAGE,
        page,
      });
      setRows(res.data);
      setMeta(res.meta);
      // summary + tab_counts are stable across filters; only overwrite
      // when the BE actually sends them so a thin response can't blank
      // the cards.
      if (res.summary) setSummary(res.summary);
      if (res.tab_counts) setTabCounts(res.tab_counts);
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [statusTab, kindFilter, methodFilter, debouncedQ, page, t]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Debounce the search box into the server-side `q` param.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever any server-side filter changes.
  useEffect(() => {
    setPage(1);
  }, [statusTab, kindFilter, methodFilter, debouncedQ]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  /* ---------- derived: status tabs ---------- */
  const tabs = useMemo(() => {
    const c = tabCounts || {};
    return [
      { key: '', count: c.all },
      { key: 'successful', count: c.successful },
      { key: 'pending', count: c.pending },
      { key: 'failed', count: c.failed },
      { key: 'refunded', count: c.refunded },
    ];
  }, [tabCounts]);

  /* ---------- actions ---------- */
  const openDetails = async (row) => {
    setSelected(row);
    setDetailsOpen(true);
    setDetails(null);
    setDetailsLoading(true);
    try {
      const res = await admin.payments.get(row.id);
      setDetails(res || row);
    } catch {
      setDetails(row); // fall back to the list row so the modal isn't empty
    } finally {
      setDetailsLoading(false);
    }
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    setSelected(null);
    setDetails(null);
  };

  /* ---------- export ---------- */
  const exportColumns = useMemo(
    () => [
      { header: t('admin.payments.table.invoice'), get: (r) => r.invoice_number || `INV-${r.id}` },
      { header: t('admin.payments.table.user'), get: (r) => r.user || '' },
      { header: t('admin.payments.table.category'), get: (r) => categoryLabel(r.client_category) },
      { header: t('admin.payments.table.kind'), get: (r) => r.kind_label || r.kind || '' },
      { header: t('admin.payments.table.method'), get: (r) => r.payment_method_label || r.payment_method || '' },
      { header: t('admin.payments.table.amount'), get: (r) => fmtMoney(r.amount, r.currency) },
      { header: t('admin.payments.table.status'), get: (r) => r.status_label || r.status_key || '' },
      { header: t('admin.payments.table.provider'), get: (r) => r.provider || '' },
      { header: t('admin.payments.table.date'), get: (r) => fmtDateTime(r.created_at) },
    ],
    [t, categoryLabel, fmtMoney, fmtDateTime]
  );

  // Subtitle line under the logo: "Payments report — <tab> — N transactions".
  const reportMeta = () => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const tabLabel = statusTab
      ? t(`admin.payments.tabs.${statusTab}`)
      : t('admin.payments.tabs.all');
    const subtitle = [
      t('admin.payments.report.label'),
      tabLabel,
      t('admin.payments.report.count', { n: rows.length }),
    ].join(' — ');
    return {
      title: t('admin.payments.report.label'),
      subtitle,
      columns: exportColumns,
      rows,
      dir,
      lang,
    };
  };

  const exportCsv = () => {
    downloadReportExcel({ ...reportMeta(), filename: `payments-${statusTab || 'all'}` });
    showToast(t('admin.payments.exported'));
  };

  const exportPdf = () => {
    if (printReportPdf(reportMeta())) showToast(t('admin.payments.exported'));
  };

  /* ---------- table columns ---------- */
  const columns = useMemo(
    () => [
      {
        key: 'invoice',
        label: t('admin.payments.table.invoice'),
        render: (row) => (
          <div className="flex flex-col">
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text-ink)' }}>
              {row.invoice_number || `INV-${row.id}`}
            </span>
            {row.provider && (
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{row.provider}</span>
            )}
          </div>
        ),
      },
      {
        key: 'user',
        label: t('admin.payments.table.user'),
        render: (row) => (
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center font-display font-bold flex-shrink-0"
              style={{ width: 34, height: 34, borderRadius: '50%', background: '#2c2f7c', color: 'white', fontSize: 13 }}
            >
              {(row.user || '·').trim().charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
                {row.user || '—'}
              </div>
              {row.client_category && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {categoryLabel(row.client_category)}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'kind',
        label: t('admin.payments.table.kind'),
        render: (row) => (
          <Badge tone={row.kind === 'renewal' ? 'primary' : 'default'}>
            {row.kind_label || t(`admin.payments.kinds.${row.kind}`)}
          </Badge>
        ),
      },
      {
        key: 'method',
        label: t('admin.payments.table.method'),
        render: (row) => (
          <span style={{ fontSize: 13 }}>
            {row.payment_method_label || t(`admin.payments.methods.${row.payment_method}`)}
          </span>
        ),
      },
      {
        key: 'amount',
        label: t('admin.payments.table.amount'),
        render: (row) => (
          <span style={{ fontWeight: 600, color: 'var(--text-ink)', fontSize: 13 }}>
            {fmtMoney(row.amount, row.currency)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('admin.payments.table.status'),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status_key] || 'default'}>
            {row.status_label || t(`admin.payments.statuses.${row.status_key}`)}
          </Badge>
        ),
      },
      {
        key: 'date',
        label: t('admin.payments.table.date'),
        render: (row) => <span style={{ fontSize: 13 }}>{fmtDate(row.created_at)}</span>,
      },
      {
        key: 'actions',
        label: t('admin.payments.table.actions'),
        headerStyle: { textAlign: 'end' },
        cellStyle: { textAlign: 'end' },
        render: (row) => (
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
            <IconAction icon={Eye} label={t('admin.payments.actions.view')} onClick={() => openDetails(row)} />
          </div>
        ),
      },
    ],
    [t, categoryLabel, fmtMoney, fmtDate]
  );

  const s = summary || {};
  const c = tabCounts || {};

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.payments.eyebrow')}
        title={t('admin.payments.title')}
        subtitle={t('admin.payments.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={loadList}
            disabled={loading}
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        {loading && !summary ? (
          [0, 1, 2, 3, 4].map((i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <PayKpi
              icon={Wallet}
              tone={KPI_TONE.revenue}
              label={t('admin.payments.kpi.revenue')}
              value={fmtMoney(s.total_revenue ?? 0)}
            />
            <PayKpi
              icon={CheckCircle2}
              tone={KPI_TONE.successful}
              label={t('admin.payments.kpi.successful')}
              value={fmtNum(c.successful ?? 0)}
            />
            <PayKpi
              icon={Clock}
              tone={KPI_TONE.pending}
              label={t('admin.payments.kpi.pending')}
              value={fmtNum(c.pending ?? 0)}
            />
            <PayKpi
              icon={XCircle}
              tone={KPI_TONE.failed}
              label={t('admin.payments.kpi.failed')}
              value={fmtNum(c.failed ?? 0)}
            />
            <PayKpi
              icon={RotateCcw}
              tone={KPI_TONE.refunded}
              label={t('admin.payments.kpi.refunded')}
              value={fmtNum(c.refunded ?? 0)}
              sublabel={t('admin.payments.kpi.refundedSub', {
                amount: fmtMoney(s.refunded_amount ?? 0),
              })}
            />
          </>
        )}
      </div>

      {/* ---------- Status tabs ---------- */}
      <style>{`
        .pay-tabs-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .pay-tabs-scroll::-webkit-scrollbar { height: 0; width: 0; display: none; }
      `}</style>
      <div
        className="pay-tabs-scroll flex items-center gap-1 mb-4 overflow-x-auto"
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
              {tb.key ? t(`admin.payments.tabs.${tb.key}`) : t('admin.payments.tabs.all')}
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

      {/* ---------- Search + filters + export ---------- */}
      <Card padded={false} style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative flex-1" style={{ minWidth: 220, maxWidth: 420 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  top: '50%',
                  insetInlineStart: 12,
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.payments.search')}
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10,
                  color: 'var(--text-ink)',
                  outline: 'none',
                  padding: '10px 38px',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                }}
              />
              {loading && search && (
                <Loader2
                  size={15}
                  className="animate-spin"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: 12,
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              )}
            </div>
            <FilterSelect
              label={t('admin.payments.filters.kind')}
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { value: '', label: t('admin.payments.filters.anyKind') },
                { value: 'initial', label: t('admin.payments.kinds.initial') },
                { value: 'renewal', label: t('admin.payments.kinds.renewal') },
              ]}
              minWidth={160}
            />
            <FilterSelect
              label={t('admin.payments.filters.method')}
              value={methodFilter}
              onChange={setMethodFilter}
              options={[
                { value: '', label: t('admin.payments.filters.anyMethod') },
                { value: 'card', label: t('admin.payments.methods.card') },
                { value: 'bank_transfer', label: t('admin.payments.methods.bank_transfer') },
                { value: 'applepay', label: t('admin.payments.methods.applepay') },
                { value: 'stcpay', label: t('admin.payments.methods.stcpay') },
              ]}
              minWidth={170}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 14px' }}
              onClick={exportCsv}
              disabled={!rows.length}
            >
              <FileSpreadsheet size={14} />
              {t('admin.payments.actions.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 14px' }}
              onClick={exportPdf}
              disabled={!rows.length}
            >
              <FileText size={14} />
              {t('admin.payments.actions.exportPdf')}
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
          {statusTab ? t(`admin.payments.tabs.${statusTab}`) : t('admin.payments.listTitle')}
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
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle={t('admin.payments.table.empty')}
          onRowClick={(row) => openDetails(row)}
        />
        <Pagination meta={meta} onPage={(p) => setPage(p)} t={t} />
      </Card>

      {/* ---------- Details modal ---------- */}
      <Modal
        open={detailsOpen}
        onClose={closeDetails}
        width={560}
        title={t('admin.payments.details.title', {
          invoice: details?.invoice_number || selected?.invoice_number || `INV-${selected?.id ?? ''}`,
        })}
        footer={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={closeDetails}
          >
            {t('admin.common.close')}
          </button>
        }
      >
        {detailsLoading || !details ? (
          <div className="shimmer" style={{ height: 200, borderRadius: 12 }} />
        ) : (
          <PaymentDetails
            p={details}
            t={t}
            fmtMoney={fmtMoney}
            fmtDateTime={fmtDateTime}
            categoryLabel={categoryLabel}
            onOpenUser={(uid) => {
              closeDetails();
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


function PayKpi({ icon: Icon, label, value, sublabel, tone }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 40, height: 40, borderRadius: 11, background: tone.soft, color: tone.accent }}
      >
        <Icon size={20} strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div
          className="truncate"
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {label}
        </div>
        <div className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.15 }}>
          {value}
        </div>
        {sublabel && <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sublabel}</div>}
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
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div className="shimmer" style={{ width: 40, height: 40, borderRadius: 11 }} />
      <div>
        <div className="shimmer" style={{ height: 11, width: 80, borderRadius: 6 }} />
        <div className="shimmer mt-2" style={{ height: 22, width: 60, borderRadius: 6 }} />
      </div>
    </div>
  );
}

const ICON_ACTION_TONES = {
  neutral: { color: 'var(--text-ink-soft)', hbg: 'rgba(44,47,124,0.10)', hcolor: 'var(--accent-primary)' },
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

function PaymentDetails({ p, t, fmtMoney, fmtDateTime, categoryLabel, onOpenUser }) {
  return (
    <div className="flex flex-col gap-5">
      {/* status strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={STATUS_TONE[p.status_key] || 'default'}>
          {p.status_label || t(`admin.payments.statuses.${p.status_key}`)}
        </Badge>
        <Badge tone={p.kind === 'renewal' ? 'primary' : 'default'}>
          {p.kind_label || t(`admin.payments.kinds.${p.kind}`)}
        </Badge>
        {p.provider && <Badge tone="muted">{p.provider}</Badge>}
      </div>

      {/* amount headline */}
      <div
        className="flex items-center gap-3 p-4 rounded-[12px]"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(44,47,124,0.10)', color: 'var(--accent-primary)' }}
        >
          <Receipt size={20} />
        </div>
        <div className="min-w-0">
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('admin.payments.table.amount')}
          </div>
          <div className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.1 }}>
            {fmtMoney(p.amount, p.currency)}
          </div>
        </div>
      </div>

      {/* core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <DetailField label={t('admin.payments.table.invoice')}>
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.invoice_number || `INV-${p.id}`}</span>
        </DetailField>
        <DetailField label={t('admin.payments.table.method')}>
          {p.payment_method_label || t(`admin.payments.methods.${p.payment_method}`)}
        </DetailField>
        <DetailField label={t('admin.payments.table.category')}>{categoryLabel(p.client_category)}</DetailField>
        <DetailField label={t('admin.payments.table.date')}>{fmtDateTime(p.created_at)}</DetailField>
      </div>

      {/* subscriber */}
      {p.user && (
        <div
          className="flex items-center justify-between gap-3 p-3 rounded-[12px]"
          style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
        >
          <div className="min-w-0">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('admin.payments.details.user')}
            </div>
            <div className="font-semibold truncate" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
              {p.user}
              {p.client_category ? ` · ${categoryLabel(p.client_category)}` : ''}
            </div>
          </div>
          {p.user_id != null && (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 12px', flexShrink: 0 }}
              onClick={() => onOpenUser(p.user_id)}
            >
              <ExternalLink size={14} />
              {t('admin.payments.details.viewUser')}
            </button>
          )}
        </div>
      )}

      {/* eligibility note — refund/confirm aren't wired on the BE yet,
          so surface the flags as read-only context rather than buttons. */}
      {(p.can_refund || p.can_confirm) && (
        <div
          className="p-3 rounded-[10px]"
          style={{ background: 'rgba(184,134,42,0.08)', border: '1px solid rgba(184,134,42,0.20)', fontSize: 12.5, color: '#8a6518', lineHeight: 1.6 }}
        >
          {p.can_refund && t('admin.payments.details.canRefund')}
          {p.can_refund && p.can_confirm ? ' ' : ''}
          {p.can_confirm && t('admin.payments.details.canConfirm')}
        </div>
      )}
    </div>
  );
}
