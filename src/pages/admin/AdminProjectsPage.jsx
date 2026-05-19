import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { admin } from '../../services';
import { ARENAS } from '../../config/projectConstants';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  FilterCheckbox,
  DataTable,
  Pagination,
  Badge,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminProjectsPage — /admin/projects
 *
 *  Lists every project across every arena. Admin sees all
 *  statuses (no visibility filter applied), with toggles to
 *  include or restrict to soft-deleted records.
 *
 *  The detail page (separate file) drives all moderation
 *  actions; the list is purely navigational.
 * ============================================================ */

const STATUSES = [
  'pending_review',
  'open_for_bids',
  'awarded',
  'in_progress',
  'completed',
  'cancelled',
];

function statusTone(status) {
  switch (status) {
    case 'open_for_bids':
      return 'success';
    case 'awarded':
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'muted';
    case 'cancelled':
      return 'danger';
    case 'pending_review':
    default:
      return 'warning';
  }
}

export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [arena, setArena] = useState('');
  const [status, setStatus] = useState('');
  const [withTrashed, setWithTrashed] = useState(false);
  const [onlyTrashed, setOnlyTrashed] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.projects.list({
        arena: arena || undefined,
        status: status || undefined,
        with_trashed: withTrashed,
        only_trashed: onlyTrashed,
        per_page: 25,
        page,
      });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
  }, [arena, status, withTrashed, onlyTrashed, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [arena, status, withTrashed, onlyTrashed]);

  const columns = useMemo(
    () => [
      {
        key: 'project',
        label: t('admin.projects.columns.project'),
        render: (row) => (
          <div className="min-w-0">
            <div
              className="font-semibold truncate"
              style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
            >
              {row.name || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ID #{row.id}
              {row.deleted_at && (
                <>
                  {' · '}
                  <Badge tone="muted">{t('admin.projects.trashedBadge')}</Badge>
                </>
              )}
              {row.created_by_admin_id && row.created_by_admin_id !== row.user_id && (
                <>
                  {' · '}
                  <Badge tone="warning">{t('admin.projects.proxyBadge')}</Badge>
                </>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'arena',
        label: t('admin.projects.columns.arena'),
        render: (row) => {
          const arena = ARENAS.find((a) => a.value === row.arena);
          return (
            <span style={{ fontSize: 13 }}>
              {arena ? t(`arena.${row.arena}.label`) : row.arena || '—'}
            </span>
          );
        },
      },
      {
        key: 'status',
        label: t('admin.projects.columns.status'),
        render: (row) => (
          <Badge tone={statusTone(row.status)}>
            {t(`admin.statuses.${row.status}`) || row.status}
          </Badge>
        ),
      },
      {
        key: 'owner',
        label: t('admin.projects.columns.owner'),
        render: (row) => (
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 13 }}>
              {row.owner?.name || `#${row.user_id || '—'}`}
            </div>
            {row.owner?.account_type && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {t(`accountType.${row.owner.account_type}`)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'partner',
        label: t('admin.projects.columns.partner'),
        render: (row) =>
          row.partner ? (
            <span style={{ fontSize: 13 }}>{row.partner.name}</span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ),
      },
      {
        key: 'budget',
        label: t('admin.projects.columns.budget'),
        render: (row) =>
          row.budget != null ? (
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {Number(row.budget).toLocaleString()}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ),
      },
    ],
    [t]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.projects.eyebrow')}
        title={t('admin.projects.title')}
        subtitle={t('admin.projects.subtitle')}
        actions={
          <>
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
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 16px' }}
              onClick={() => navigate('/admin/projects/new')}
            >
              <Plus size={14} />
              {t('admin.projects.create.title')}
            </button>
          </>
        }
      />

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={
          (arena ? 1 : 0) + (status ? 1 : 0) + (withTrashed ? 1 : 0) + (onlyTrashed ? 1 : 0)
        }
        onReset={() => {
          setArena('');
          setStatus('');
          setWithTrashed(false);
          setOnlyTrashed(false);
        }}
        resetLabel={t('admin.common.reset')}
      >
        <FilterSelect
          label={t('admin.projects.columns.arena')}
          value={arena}
          onChange={setArena}
          options={[
            { value: '', label: t('admin.common.anyArena') },
            ...ARENAS.map((a) => ({ value: a.value, label: t(`arena.${a.value}.label`) })),
          ]}
        />
        <FilterSelect
          label={t('admin.projects.columns.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.anyStatus') },
            ...STATUSES.map((s) => ({ value: s, label: t(`admin.statuses.${s}`) })),
          ]}
        />
        <FilterCheckbox
          label={t('admin.projects.filters.withTrashed')}
          checked={withTrashed}
          onChange={(v) => {
            setWithTrashed(v);
            if (v) setOnlyTrashed(false);
          }}
        />
        <FilterCheckbox
          label={t('admin.projects.filters.onlyTrashed')}
          checked={onlyTrashed}
          onChange={(v) => {
            setOnlyTrashed(v);
            if (v) setWithTrashed(false);
          }}
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
            rows={data.rows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle={t('admin.projects.empty')}
            onRowClick={(row) => navigate(`/admin/projects/${row.id}`)}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>
    </div>
  );
}
