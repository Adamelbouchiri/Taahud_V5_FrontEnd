import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_TONE,
  PARTY_ROLE,
} from '../../config/brokerConstants';
import {
  PageHeader,
  Card,
  Badge,
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
} from '../../components/admin/AdminUI';
import { formatDate } from '../../utils/date';

/* ============================================================
 *  AdminOpportunitiesPage — /admin/opportunities
 *  ----------------------------------------------------------------
 *  The opportunity review queue. Rows link into the detail page,
 *  where approve / reject / cancel live — approving starts the
 *  90-day hold, so it shouldn't be a one-tap action from a list.
 * ============================================================ */
export default function AdminOpportunitiesPage() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState(OPPORTUNITY_STATUS.PENDING);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    admin.opportunities
      .list({ status: status || undefined, search: search || undefined, page, per_page: 20 })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => setError(err.message || t('admin.common.loadError')))
      .finally(() => setLoading(false));
  }, [status, search, page, t]);

  useEffect(load, [load]);

  const columns = [
    {
      key: 'reference',
      label: t('admin.opportunities.columns.reference'),
      render: (o) => (
        <span
          style={{
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 12.5,
            color: 'var(--text-ink)',
          }}
        >
          {o.reference}
        </span>
      ),
    },
    {
      key: 'title',
      label: t('admin.opportunities.columns.title'),
      render: (o) => {
        const owner = (o.parties || []).find((p) => p.role === PARTY_ROLE.OWNER);
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{o.title}</div>
            {owner && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{owner.name}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'broker',
      label: t('admin.opportunities.columns.broker'),
      render: (o) => (
        <div style={{ fontSize: 12.5 }}>
          <div>{o.broker?.name}</div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 11.5,
            }}
          >
            {o.broker?.identifier}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('admin.opportunities.columns.status'),
      render: (o) => (
        <Badge tone={OPPORTUNITY_STATUS_TONE[o.status] || 'default'}>
          {t(`broker.opportunityStatus.${o.status}`)}
        </Badge>
      ),
    },
    {
      key: 'held_until',
      label: t('admin.opportunities.columns.heldUntil'),
      render: (o) =>
        o.held_until ? (
          <span style={{ fontSize: 12.5 }}>{formatDate(o.held_until, lang)}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
  ];

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.opportunities.eyebrow')}
        title={t('admin.opportunities.title')}
        subtitle={t('admin.opportunities.subtitle')}
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

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={(search ? 1 : 0) + (status ? 1 : 0)}
        onReset={() => {
          setSearch('');
          setStatus('');
          setPage(1);
        }}
        resetLabel={t('admin.common.reset')}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder={t('admin.opportunities.searchPlaceholder')}
      >
        <FilterSelect
          label={t('admin.opportunities.columns.status')}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: '', label: t('admin.opportunities.allStatuses') },
            ...OPPORTUNITY_STATUSES.map((s) => ({
              value: s,
              label: t(`broker.opportunityStatus.${s}`),
            })),
          ]}
        />
      </FilterBar>

      <div className="mt-4">
        <Card padded={false}>
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
            rowKey={(o) => o.id}
            loading={loading}
            emptyTitle={t('admin.opportunities.empty')}
            onRowClick={(o) => navigate(`/admin/opportunities/${o.id}`)}
          />
          <Pagination meta={meta} onPage={setPage} t={t} />
        </Card>
      </div>
    </div>
  );
}
