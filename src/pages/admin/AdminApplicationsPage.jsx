import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  FilterText,
  DataTable,
  Pagination,
  Badge,
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminApplicationsPage — /admin/applications
 *
 *  Lookup any bid on the platform. Filters by project ID, status,
 *  and applicant user ID. Clicking a row opens a side modal with
 *  the full cover letter and the override-decision action.
 * ============================================================ */

const STATUSES = ['pending', 'accepted', 'rejected'];

function statusTone(status) {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'pending':
    default:
      return 'warning';
  }
}

export default function AdminApplicationsPage() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail / override state
  const [selected, setSelected] = useState(null);
  const [openOverride, setOpenOverride] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.applications.list({
        project_id: projectId || undefined,
        user_id: userId || undefined,
        status: status || undefined,
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
  }, [projectId, userId, status, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [projectId, userId, status]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleOverride = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.applications.override(selected.id, reason);
      showToast(t('admin.applications.detail.override.done'));
      setOpenOverride(false);
      setReason('');
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'app',
        label: t('admin.applications.columns.application'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              #{row.id}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date(row.created_at).toLocaleDateString()}
            </div>
          </div>
        ),
      },
      {
        key: 'project',
        label: t('admin.applications.columns.project'),
        render: (row) =>
          row.project ? (
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13 }}>{row.project.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                #{row.project.id}
              </div>
            </div>
          ) : (
            `#${row.project_id}`
          ),
      },
      {
        key: 'applicant',
        label: t('admin.applications.columns.applicant'),
        render: (row) =>
          row.applicant ? (
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13 }}>{row.applicant.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                #{row.applicant.id}
              </div>
            </div>
          ) : (
            `#${row.user_id}`
          ),
      },
      {
        key: 'bid',
        label: t('admin.applications.columns.bid'),
        render: (row) =>
          row.bid_amount != null ? (
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {Number(row.bid_amount).toLocaleString()}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'delivery',
        label: t('admin.applications.columns.delivery'),
        render: (row) => (
          <span style={{ fontSize: 13 }}>{row.delivery_date || '—'}</span>
        ),
      },
      {
        key: 'status',
        label: t('admin.applications.columns.status'),
        render: (row) => (
          <Badge tone={statusTone(row.status)}>
            {t(`admin.statuses.${row.status}`) || row.status}
          </Badge>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.applications.eyebrow')}
        title={t('admin.applications.title')}
        subtitle={t('admin.applications.subtitle')}
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

      <FilterBar
        title={t('admin.common.filtersTitle')}
        activeCount={(projectId ? 1 : 0) + (userId ? 1 : 0) + (status ? 1 : 0)}
        onReset={() => {
          setProjectId('');
          setUserId('');
          setStatus('');
        }}
        resetLabel={t('admin.common.reset')}
      >
        <FilterText
          label={t('admin.applications.filters.projectId')}
          value={projectId}
          onChange={setProjectId}
          type="number"
        />
        <FilterText
          label={t('admin.applications.filters.userId')}
          value={userId}
          onChange={setUserId}
          type="number"
        />
        <FilterSelect
          label={t('admin.applications.columns.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.anyStatus') },
            ...STATUSES.map((s) => ({ value: s, label: t(`admin.statuses.${s}`) })),
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
            rows={data.rows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle={t('admin.applications.empty')}
            onRowClick={(row) => setSelected(row)}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected && !openOverride}
        onClose={() => setSelected(null)}
        title={selected ? `#${selected.id}` : ''}
        width={560}
        footer={
          selected && selected.status !== 'rejected' ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 18px' }}
                onClick={() => setSelected(null)}
              >
                {t('admin.common.close')}
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
                onClick={() => setOpenOverride(true)}
              >
                {t('admin.applications.detail.actions.override')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => setSelected(null)}
            >
              {t('admin.common.close')}
            </button>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(selected.status)}>
                {t(`admin.statuses.${selected.status}`) || selected.status}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('admin.applications.columns.project')}
                </div>
                <div>{selected.project?.name || `#${selected.project_id}`}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('admin.applications.columns.applicant')}
                </div>
                <div>{selected.applicant?.name || `#${selected.user_id}`}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('admin.applications.columns.bid')}
                </div>
                <div>
                  {selected.bid_amount != null
                    ? Number(selected.bid_amount).toLocaleString()
                    : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('admin.applications.columns.delivery')}
                </div>
                <div>{selected.delivery_date || '—'}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {t('admin.applications.detail.coverLetter')}
              </div>
              <div
                className="p-3 rounded-[10px]"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-soft)',
                  fontSize: 13,
                  color: 'var(--text-ink)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.55,
                }}
              >
                {selected.cover_letter || '—'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={openOverride}
        onClose={() => setOpenOverride(false)}
        onConfirm={handleOverride}
        title={t('admin.applications.detail.override.title')}
        description={t('admin.applications.detail.override.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.applications.detail.override.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </div>
  );
}
