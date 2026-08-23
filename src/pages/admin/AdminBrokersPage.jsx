import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import Ltr from '../../components/Ltr';
import { BROKER_STATUS, BROKER_STATUS_TONE } from '../../config/brokerConstants';
import {
  PageHeader,
  Card,
  Badge,
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  ConfirmDialog,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminBrokersPage — /admin/brokers
 *  ----------------------------------------------------------------
 *  The broker approval queue. A broker registers straight through
 *  /auth/register and sits on `pending_review` until an admin acts
 *  here — nothing in the broker workspace opens before that.
 *
 *  Which actions each row offers is driven by broker_status:
 *
 *    pending_review → approve / reject
 *    active         → suspend
 *    suspended      → reactivate / reject
 *    rejected       → (terminal, no actions)
 *
 *  Reject and suspend both require a reason; the rejection reason is
 *  what the broker sees on their status screen.
 * ============================================================ */

const STATUS_FILTERS = [
  BROKER_STATUS.PENDING,
  BROKER_STATUS.ACTIVE,
  BROKER_STATUS.SUSPENDED,
  BROKER_STATUS.REJECTED,
];

export default function AdminBrokersPage() {
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  // Default to the queue that actually needs attention.
  const [status, setStatus] = useState(BROKER_STATUS.PENDING);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // { broker, action } — action is approve | reject | suspend | reactivate
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    admin.brokers
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

  const needsReason =
    pending?.action === 'reject' || pending?.action === 'suspend';

  const runAction = async () => {
    if (!pending) return;
    setBusy(true);
    setActionError('');
    try {
      const { broker, action } = pending;
      if (action === 'approve') await admin.brokers.approve(broker.id);
      if (action === 'reject') await admin.brokers.reject(broker.id, reason.trim());
      if (action === 'suspend') await admin.brokers.suspend(broker.id, reason.trim());
      if (action === 'reactivate') await admin.brokers.reactivate(broker.id);
      setPending(null);
      setReason('');
      load();
    } catch (err) {
      // The BE 422s when the transition no longer applies (e.g. the
      // broker was approved in another tab). Surface its message.
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('admin.brokers.columns.broker'),
      render: (b) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{b.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <Ltr style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {b.identifier}
            </Ltr>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: t('admin.brokers.columns.contact'),
      // The rows keep the table's direction so they align on the
      // reading side (right in Arabic); only the value itself is
      // isolated to LTR so the address and the +966 number keep their
      // character order. Putting dir="ltr" on the block instead would
      // make `text-align: start` resolve to left and strand the
      // column against the wrong edge.
      render: (b) => (
        <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
          <div>
            <Ltr>{b.email}</Ltr>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            <Ltr>{b.phone}</Ltr>
          </div>
        </div>
      ),
    },
    {
      key: 'broker_status',
      label: t('admin.brokers.columns.status'),
      render: (b) => (
        <Badge tone={BROKER_STATUS_TONE[b.broker_status] || 'default'}>
          {t(`broker.accountStatus.${b.broker_status}`)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: t('admin.brokers.columns.actions'),
      render: (b) => <RowActions broker={b} t={t} onPick={(action) => {
        setReason('');
        setActionError('');
        setPending({ broker: b, action });
      }} />,
    },
  ];

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.brokers.eyebrow')}
        title={t('admin.brokers.title')}
        subtitle={t('admin.brokers.subtitle')}
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
        searchPlaceholder={t('admin.brokers.searchPlaceholder')}
      >
        <FilterSelect
          label={t('admin.brokers.columns.status')}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: '', label: t('admin.brokers.allStatuses') },
            ...STATUS_FILTERS.map((s) => ({
              value: s,
              label: t(`broker.accountStatus.${s}`),
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
            rowKey={(b) => b.id}
            loading={loading}
            emptyTitle={t('admin.brokers.empty')}
          />
          <Pagination meta={meta} onPage={setPage} t={t} />
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? t(`admin.brokers.confirm.${pending.action}.title`) : ''}
        description={pending ? t(`admin.brokers.confirm.${pending.action}.description`) : ''}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        requireReason={needsReason}
        confirmLabel={pending ? t(`admin.brokers.actions.${pending.action}`) : ''}
        cancelLabel={t('admin.common.cancel')}
        confirmTone={
          pending?.action === 'reject' || pending?.action === 'suspend'
            ? 'danger'
            : 'primary'
        }
        busy={busy}
        error={actionError}
        onClose={() => {
          setPending(null);
          setActionError('');
        }}
        onConfirm={runAction}
      />
    </div>
  );
}

function RowActions({ broker, t, onPick }) {
  const status = broker.broker_status;
  const btn = {
    padding: '5px 10px',
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  };

  if (status === BROKER_STATUS.REJECTED) {
    return (
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        {t('admin.brokers.terminal')}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {status === BROKER_STATUS.PENDING && (
        <>
          <button type="button" className="btn-ghost" style={btn} onClick={() => onPick('approve')}>
            <CheckCircle2 size={14} strokeWidth={1.8} />
            {t('admin.brokers.actions.approve')}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ ...btn, color: 'var(--accent-danger)' }}
            onClick={() => onPick('reject')}
          >
            <XCircle size={14} strokeWidth={1.8} />
            {t('admin.brokers.actions.reject')}
          </button>
        </>
      )}

      {status === BROKER_STATUS.ACTIVE && (
        <button
          type="button"
          className="btn-ghost"
          style={{ ...btn, color: '#b8862a' }}
          onClick={() => onPick('suspend')}
        >
          <PauseCircle size={14} strokeWidth={1.8} />
          {t('admin.brokers.actions.suspend')}
        </button>
      )}

      {status === BROKER_STATUS.SUSPENDED && (
        <>
          <button type="button" className="btn-ghost" style={btn} onClick={() => onPick('reactivate')}>
            <PlayCircle size={14} strokeWidth={1.8} />
            {t('admin.brokers.actions.reactivate')}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ ...btn, color: 'var(--accent-danger)' }}
            onClick={() => onPick('reject')}
          >
            <XCircle size={14} strokeWidth={1.8} />
            {t('admin.brokers.actions.reject')}
          </button>
        </>
      )}
    </div>
  );
}
