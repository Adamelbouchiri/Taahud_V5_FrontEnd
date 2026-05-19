import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  PageHeader,
  Card,
  FilterBar,
  FilterSelect,
  FilterText,
  FilterCheckbox,
  DataTable,
  Pagination,
  Badge,
  Modal,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminActivityPage — /admin/activity
 *
 *  Renders the audit log with filters that mirror the BE
 *  query params. Supports deep links — when the user clicks
 *  "View activity" on a user or project detail page, we land
 *  here with ?target_type=User&target_id=42 already applied.
 * ============================================================ */

const ACTIONS = [
  'user.view',
  'user.edit',
  'user.suspend',
  'user.unsuspend',
  'user.force_verify_phone',
  'user.force_password_reset',
  'project.view',
  'project.edit',
  'project.soft_delete',
  'project.restore',
  'project.hard_delete',
  'project.force_status',
  'project.create_proxy',
  'application.view',
  'application.override',
  'application.soft_delete',
  'application.force_partner',
  'role.grant',
  'role.revoke',
];

const TARGET_TYPES = ['User', 'Project', 'Application'];

export default function AdminActivityPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [adminId, setAdminId] = useState(searchParams.get('admin_id') || '');
  const [action, setAction] = useState(searchParams.get('action') || '');
  const [targetType, setTargetType] = useState(searchParams.get('target_type') || '');
  const [targetId, setTargetId] = useState(searchParams.get('target_id') || '');
  const [hasReason, setHasReason] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // Mirror filter state into URL so the page deep-links nicely.
  useEffect(() => {
    const next = {};
    if (adminId) next.admin_id = adminId;
    if (action) next.action = action;
    if (targetType) next.target_type = targetType;
    if (targetId) next.target_id = targetId;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, action, targetType, targetId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.activity.list({
        admin_id: adminId || undefined,
        action: action || undefined,
        target_type: targetType || undefined,
        target_id: targetId || undefined,
        has_reason: hasReason,
        from: from || undefined,
        to: to || undefined,
        per_page: 50,
        page,
      });
      setData({ rows: res.data, meta: res.meta });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setData({ rows: [], meta: null });
    } finally {
      setLoading(false);
    }
  }, [adminId, action, targetType, targetId, hasReason, from, to, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [adminId, action, targetType, targetId, hasReason, from, to]);

  const fmt = (s) =>
    s
      ? new Date(s).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';

  const columns = useMemo(
    () => [
      {
        key: 'time',
        label: t('admin.activity.columns.time'),
        render: (row) => (
          <div className="min-w-0">
            <div style={{ fontSize: 12.5 }}>{fmt(row.created_at)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              #{row.id}
            </div>
          </div>
        ),
      },
      {
        key: 'admin',
        label: t('admin.activity.columns.admin'),
        render: (row) => (
          <div className="min-w-0">
            <div style={{ fontSize: 13 }}>
              {row.admin?.name || `#${row.admin?.id || '—'}`}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              #{row.admin?.id || '—'}
            </div>
          </div>
        ),
      },
      {
        key: 'action',
        label: t('admin.activity.columns.action'),
        render: (row) => (
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-ink-soft)',
            }}
          >
            {row.action}
          </code>
        ),
      },
      {
        key: 'target',
        label: t('admin.activity.columns.target'),
        render: (row) =>
          row.target ? (
            <div className="min-w-0">
              <Badge tone="muted">
                {t(`admin.activity.targetTypes.${row.target.type}`) || row.target.type}
              </Badge>
              <span style={{ marginInlineStart: 6, fontSize: 12.5 }}>
                #{row.target.id}
              </span>
            </div>
          ) : (
            '—'
          ),
      },
      {
        key: 'reason',
        label: t('admin.activity.columns.reason'),
        render: (row) =>
          row.reason ? (
            <span
              className="truncate"
              style={{
                display: 'inline-block',
                maxWidth: 280,
                fontSize: 12.5,
                color: 'var(--text-ink-soft)',
              }}
              title={row.reason}
            >
              {row.reason}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ),
      },
      {
        key: 'ip',
        label: t('admin.activity.columns.ip'),
        render: (row) => (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            {row.ip_address || '—'}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.activity.eyebrow')}
        title={t('admin.activity.title')}
        subtitle={t('admin.activity.subtitle')}
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
        activeCount={
          (adminId ? 1 : 0) +
          (action ? 1 : 0) +
          (targetType ? 1 : 0) +
          (targetId ? 1 : 0) +
          (from ? 1 : 0) +
          (to ? 1 : 0) +
          (hasReason ? 1 : 0)
        }
        onReset={() => {
          setAdminId('');
          setAction('');
          setTargetType('');
          setTargetId('');
          setFrom('');
          setTo('');
          setHasReason(false);
        }}
        resetLabel={t('admin.common.reset')}
      >
        <FilterText
          label={t('admin.activity.filters.adminId')}
          value={adminId}
          onChange={setAdminId}
          type="number"
        />
        <FilterSelect
          label={t('admin.activity.filters.action')}
          value={action}
          onChange={setAction}
          minWidth={220}
          options={[
            { value: '', label: t('admin.common.anyAction') },
            ...ACTIONS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <FilterSelect
          label={t('admin.activity.filters.targetType')}
          value={targetType}
          onChange={setTargetType}
          options={[
            { value: '', label: t('admin.common.all') },
            ...TARGET_TYPES.map((tp) => ({
              value: tp,
              label: t(`admin.activity.targetTypes.${tp}`) || tp,
            })),
          ]}
        />
        <FilterText
          label={t('admin.activity.filters.targetId')}
          value={targetId}
          onChange={setTargetId}
          type="number"
        />
        <FilterText
          label={t('admin.activity.filters.from')}
          value={from}
          onChange={setFrom}
          type="date"
          minWidth={170}
        />
        <FilterText
          label={t('admin.activity.filters.to')}
          value={to}
          onChange={setTo}
          type="date"
          minWidth={170}
        />
        <FilterCheckbox
          label={t('admin.activity.filters.hasReason')}
          checked={hasReason}
          onChange={setHasReason}
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
            emptyTitle={t('admin.activity.empty')}
            onRowClick={(row) => setSelected(row)}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${t('admin.activity.detail.title')} · #${selected.id}` : ''}
        width={560}
        footer={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => setSelected(null)}
          >
            {t('admin.common.close')}
          </button>
        }
      >
        {selected && (
          <div className="flex flex-col gap-3" style={{ fontSize: 13 }}>
            <div>
              <Label>{t('admin.activity.columns.action')}</Label>
              <code
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text-ink-soft)',
                }}
              >
                {selected.action}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('admin.activity.columns.admin')}</Label>
                <div>
                  {selected.admin?.name || '—'} (#{selected.admin?.id || '—'})
                </div>
              </div>
              <div>
                <Label>{t('admin.activity.columns.target')}</Label>
                <div>
                  {selected.target
                    ? `${t(`admin.activity.targetTypes.${selected.target.type}`) || selected.target.type} #${selected.target.id}`
                    : '—'}
                </div>
              </div>
              <div>
                <Label>{t('admin.activity.columns.time')}</Label>
                <div>{fmt(selected.created_at)}</div>
              </div>
              <div>
                <Label>{t('admin.activity.columns.ip')}</Label>
                <div style={{ fontFamily: 'monospace' }}>
                  {selected.ip_address || '—'}
                </div>
              </div>
            </div>
            {selected.reason && (
              <div>
                <Label>{t('admin.activity.columns.reason')}</Label>
                <div
                  className="p-3 rounded-[10px]"
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-soft)',
                    fontSize: 13,
                    color: 'var(--text-ink)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selected.reason}
                </div>
              </div>
            )}
            {selected.payload && (
              <div>
                <Label>{t('admin.activity.detail.payload')}</Label>
                <pre
                  className="p-3 rounded-[10px] overflow-auto"
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-soft)',
                    fontSize: 12,
                    color: 'var(--text-ink-soft)',
                    fontFamily: 'monospace',
                    maxHeight: 220,
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
            )}
            {selected.user_agent && (
              <div>
                <Label>{t('admin.activity.detail.userAgent')}</Label>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    wordBreak: 'break-all',
                  }}
                >
                  {selected.user_agent}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        color: 'var(--text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}
