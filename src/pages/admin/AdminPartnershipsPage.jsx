import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Plus } from 'lucide-react';
import { admin } from '../../services';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { OFFERING_TYPES, offeringTypeLabel } from '../../config/projectConstants';
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
 *  AdminPartnershipsPage — /admin/partnerships
 *
 *  Manage every partnership offer (Solidarity arena) across the
 *  platform. Mirrors the applications admin surface plus two
 *  partnership-specific powers: proxy-create on behalf of a user
 *  and force-accept on behalf of an unresponsive owner. Soft-delete
 *  is reversible; force-delete is super-admin-only and permanent.
 *  See ADMIN_PARTNERSHIP_INTEGRATION.md.
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

const EMPTY_PROXY = {
  project_id: '',
  // The user we're registering the offer FOR, by identifier — the BE
  // dropped the numeric user_id on this endpoint.
  user_identifier: '',
  offering_type: '',
  firm_name: '',
  capability_brief: '',
  proposed_share: '',
  message: '',
  reason: '',
};

export default function AdminPartnershipsPage() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useUser();
  const [searchParams] = useSearchParams();

  const [projectId, setProjectId] = useState(searchParams.get('project_id') || '');
  // Partner lookup is by the offering user's human-readable identifier
  // ("260703R47"); the numeric user_id filter is gone from the API.
  const [partnerIdentifier, setPartnerIdentifier] = useState(
    searchParams.get('partner_identifier') || ''
  );
  const [status, setStatus] = useState('');
  const [offeringType, setOfferingType] = useState('');
  const [archived, setArchived] = useState(''); // '' | 'with' | 'only'
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail + action state
  const [selected, setSelected] = useState(null);
  const [openOverride, setOpenOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [openForceAccept, setOpenForceAccept] = useState(false);
  const [openSoftDelete, setOpenSoftDelete] = useState(false);
  const [openForceDelete, setOpenForceDelete] = useState(false);
  const [openProxy, setOpenProxy] = useState(false);
  const [proxy, setProxy] = useState(EMPTY_PROXY);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.partnerships.list({
        project_id: projectId || undefined,
        partner_identifier: partnerIdentifier.trim() || undefined,
        status: status || undefined,
        offering_type: offeringType || undefined,
        with_trashed: archived === 'with',
        only_trashed: archived === 'only',
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
  }, [projectId, partnerIdentifier, status, offeringType, archived, page, t]);

  // Debounced — the identifier field is free text. An identifier that
  // matches nobody comes back as an empty page, never an error.
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [projectId, partnerIdentifier, status, offeringType, archived]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const closeAllActions = () => {
    setOpenOverride(false);
    setOpenForceAccept(false);
    setOpenSoftDelete(false);
    setOpenForceDelete(false);
    setReason('');
    setActionError('');
  };

  const handleOverride = async () => {
    if (!selected || !overrideStatus) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.partnerships.override(selected.id, overrideStatus, reason);
      showToast(t('admin.partnerships.detail.override.done'));
      closeAllActions();
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleForceAccept = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.partnerships.forcePartner(
        selected.project?.id ?? selected.project_id,
        selected.id,
        reason
      );
      showToast(t('admin.partnerships.detail.forceAccept.done'));
      closeAllActions();
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.partnerships.remove(selected.id, reason);
      showToast(t('admin.partnerships.detail.softDelete.done'));
      closeAllActions();
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (row) => {
    setBusy(true);
    setActionError('');
    try {
      await admin.partnerships.restore(row.id);
      showToast(t('admin.partnerships.detail.restore.done'));
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleForceDelete = async () => {
    if (!selected) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.partnerships.forceDelete(selected.id, reason);
      showToast(t('admin.partnerships.detail.forceDelete.done'));
      closeAllActions();
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleProxyCreate = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.partnerships.proxyCreate({
        project_id: proxy.project_id ? Number(proxy.project_id) : undefined,
        user_identifier: proxy.user_identifier.trim() || undefined,
        offering_type: proxy.offering_type,
        firm_name: proxy.firm_name.trim(),
        capability_brief: proxy.capability_brief.trim(),
        proposed_share: proxy.proposed_share.trim() || undefined,
        message: proxy.message.trim(),
        reason: proxy.reason.trim(),
      });
      showToast(t('admin.partnerships.proxy.done'));
      setOpenProxy(false);
      setProxy(EMPTY_PROXY);
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const offeringOptions = useMemo(
    () => [
      { value: '', label: t('admin.partnerships.filters.anyOffering') },
      ...OFFERING_TYPES.map((o) => ({ value: o.value, label: t(`offering.${o.value}`) })),
    ],
    [t]
  );

  const columns = useMemo(
    () => [
      {
        key: 'offer',
        label: t('admin.partnerships.columns.offer'),
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
        key: 'partner',
        label: t('admin.partnerships.columns.partner'),
        render: (row) => (
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 13 }}>
              {row.firm_name || row.partner?.name || `#${row.user_id}`}
            </div>
            {/* Identifier rather than the numeric id — it's what the
                partner filter above takes. */}
            <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {row.partner?.name
                ? [row.partner.name, row.partner.identifier || `#${row.partner.id}`].join(' · ')
                : `#${row.user_id}`}
            </div>
          </div>
        ),
      },
      {
        key: 'offering',
        label: t('admin.partnerships.columns.offering'),
        render: (row) => (
          <Badge tone="primary">
            {row.offering_label || offeringTypeLabel(row.offering_type)}
          </Badge>
        ),
      },
      {
        key: 'project',
        label: t('admin.partnerships.columns.project'),
        render: (row) =>
          row.project ? (
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13 }}>{row.project.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>#{row.project.id}</div>
            </div>
          ) : (
            `#${row.project_id}`
          ),
      },
      {
        key: 'share',
        label: t('admin.partnerships.columns.share'),
        render: (row) => <span style={{ fontSize: 13 }}>{row.proposed_share || '—'}</span>,
      },
      {
        key: 'status',
        label: t('admin.partnerships.columns.status'),
        render: (row) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={statusTone(row.status)}>
              {t(`admin.statuses.${row.status}`) || row.status}
            </Badge>
            {row.deleted_at && (
              <Badge tone="muted">{t('admin.partnerships.archived')}</Badge>
            )}
          </div>
        ),
      },
    ],
    [t]
  );

  const activeFilterCount =
    (projectId ? 1 : 0) +
    (partnerIdentifier ? 1 : 0) +
    (status ? 1 : 0) +
    (offeringType ? 1 : 0) +
    (archived ? 1 : 0);

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.partnerships.eyebrow')}
        title={t('admin.partnerships.title')}
        subtitle={t('admin.partnerships.subtitle')}
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
              onClick={() => {
                setProxy(EMPTY_PROXY);
                setActionError('');
                setOpenProxy(true);
              }}
            >
              <Plus size={14} />
              {t('admin.partnerships.proxy.cta')}
            </button>
          </>
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
        activeCount={activeFilterCount}
        onReset={() => {
          setProjectId('');
          setPartnerIdentifier('');
          setStatus('');
          setOfferingType('');
          setArchived('');
        }}
        resetLabel={t('admin.common.reset')}
      >
        <FilterText
          label={t('admin.partnerships.filters.projectId')}
          value={projectId}
          onChange={setProjectId}
          type="number"
        />
        <FilterText
          label={t('admin.partnerships.filters.partnerIdentifier')}
          value={partnerIdentifier}
          onChange={setPartnerIdentifier}
          placeholder={t('admin.common.identifierPlaceholder')}
          minWidth={190}
        />
        <FilterSelect
          label={t('admin.partnerships.columns.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.anyStatus') },
            ...STATUSES.map((s) => ({ value: s, label: t(`admin.statuses.${s}`) })),
          ]}
        />
        <FilterSelect
          label={t('admin.partnerships.columns.offering')}
          value={offeringType}
          onChange={setOfferingType}
          options={offeringOptions}
        />
        <FilterSelect
          label={t('admin.partnerships.filters.archived')}
          value={archived}
          onChange={setArchived}
          options={[
            { value: '', label: t('admin.partnerships.filters.archivedActive') },
            { value: 'with', label: t('admin.partnerships.filters.archivedWith') },
            { value: 'only', label: t('admin.partnerships.filters.archivedOnly') },
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
            emptyTitle={t('admin.partnerships.empty')}
            onRowClick={(row) => {
              setSelected(row);
              setOverrideStatus(row.status);
            }}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected && !openOverride && !openForceAccept && !openSoftDelete && !openForceDelete}
        onClose={() => setSelected(null)}
        title={selected ? `#${selected.id}` : ''}
        width={580}
        footer={
          selected && (
            <div className="flex flex-wrap gap-2 justify-end w-full">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 16px' }}
                onClick={() => setSelected(null)}
              >
                {t('admin.common.close')}
              </button>

              {selected.deleted_at ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => handleRestore(selected)}
                  disabled={busy}
                >
                  {t('admin.partnerships.detail.actions.restore')}
                </button>
              ) : (
                <>
                  {selected.status === 'pending' && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        width: 'auto',
                        padding: '10px 16px',
                        background: '#136d4a',
                        borderColor: '#136d4a',
                        boxShadow: '0 6px 14px rgba(19,109,74,0.20)',
                      }}
                      onClick={() => {
                        setReason('');
                        setActionError('');
                        setOpenForceAccept(true);
                      }}
                    >
                      {t('admin.partnerships.detail.actions.forceAccept')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '10px 16px' }}
                    onClick={() => {
                      setOverrideStatus(selected.status);
                      setReason('');
                      setActionError('');
                      setOpenOverride(true);
                    }}
                  >
                    {t('admin.partnerships.detail.actions.override')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      width: 'auto',
                      padding: '10px 16px',
                      borderColor: 'rgba(185,28,28,0.3)',
                      color: '#b91c1c',
                    }}
                    onClick={() => {
                      setReason('');
                      setActionError('');
                      setOpenSoftDelete(true);
                    }}
                  >
                    {t('admin.partnerships.detail.actions.softDelete')}
                  </button>
                </>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '10px 16px',
                    background: '#b91c1c',
                    borderColor: '#b91c1c',
                    boxShadow: '0 6px 14px rgba(185,28,28,0.20)',
                  }}
                  onClick={() => {
                    setReason('');
                    setActionError('');
                    setOpenForceDelete(true);
                  }}
                >
                  {t('admin.partnerships.detail.actions.forceDelete')}
                </button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(selected.status)}>
                {t(`admin.statuses.${selected.status}`) || selected.status}
              </Badge>
              <Badge tone="primary">
                {selected.offering_label || offeringTypeLabel(selected.offering_type)}
              </Badge>
              {selected.deleted_at && (
                <Badge tone="muted">{t('admin.partnerships.archived')}</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ fontSize: 13 }}>
              <DetailField label={t('admin.partnerships.columns.project')}>
                {selected.project?.name || `#${selected.project_id}`}
              </DetailField>
              <DetailField label={t('admin.partnerships.detail.partner')}>
                {selected.partner?.name
                  ? [selected.partner.name, selected.partner.identifier]
                      .filter(Boolean)
                      .join(' · ')
                  : `#${selected.user_id}`}
              </DetailField>
              <DetailField label={t('admin.partnerships.detail.firm')}>
                {selected.firm_name || '—'}
              </DetailField>
              <DetailField label={t('admin.partnerships.columns.share')}>
                {selected.proposed_share || '—'}
              </DetailField>
            </div>
            <DetailBlock label={t('admin.partnerships.detail.capabilityBrief')}>
              {selected.capability_brief || '—'}
            </DetailBlock>
            <DetailBlock label={t('admin.partnerships.detail.message')}>
              {selected.message || '—'}
            </DetailBlock>
          </div>
        )}
      </Modal>

      {/* Override modal — needs a status picker, so it's a custom Modal */}
      <Modal
        open={openOverride}
        onClose={busy ? undefined : () => setOpenOverride(false)}
        title={t('admin.partnerships.detail.override.title')}
        width={460}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => setOpenOverride(false)}
              disabled={busy}
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleOverride}
              disabled={
                busy ||
                !overrideStatus ||
                overrideStatus === selected?.status ||
                reason.trim().length < 10
              }
            >
              {busy ? '…' : t('admin.partnerships.detail.override.confirm')}
            </button>
          </>
        }
      >
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
        >
          {t('admin.partnerships.detail.override.description')}
        </p>
        <label className="field-label">{t('admin.partnerships.detail.override.newStatus')}</label>
        <select
          className="field"
          value={overrideStatus}
          onChange={(e) => setOverrideStatus(e.target.value)}
          style={{ marginBottom: 14 }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.statuses.${s}`)}
            </option>
          ))}
        </select>
        <label className="field-label">{t('admin.common.reasonLabel')}</label>
        <textarea
          className="field"
          placeholder={t('admin.common.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          style={{ padding: '12px 14px', resize: 'vertical' }}
        />
        {actionError && (
          <div
            className="p-3 rounded-[10px] mt-3"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {actionError}
          </div>
        )}
      </Modal>

      {/* Force-accept */}
      <ConfirmDialog
        open={openForceAccept}
        onClose={() => setOpenForceAccept(false)}
        onConfirm={handleForceAccept}
        title={t('admin.partnerships.detail.forceAccept.title')}
        description={t('admin.partnerships.detail.forceAccept.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.partnerships.detail.forceAccept.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="primary"
        busy={busy}
        error={actionError}
      />

      {/* Soft-delete */}
      <ConfirmDialog
        open={openSoftDelete}
        onClose={() => setOpenSoftDelete(false)}
        onConfirm={handleSoftDelete}
        title={t('admin.partnerships.detail.softDelete.title')}
        description={t('admin.partnerships.detail.softDelete.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.partnerships.detail.softDelete.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />

      {/* Force-delete (super-admin) */}
      <ConfirmDialog
        open={openForceDelete}
        onClose={() => setOpenForceDelete(false)}
        onConfirm={handleForceDelete}
        title={t('admin.partnerships.detail.forceDelete.title')}
        description={t('admin.partnerships.detail.forceDelete.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.partnerships.detail.forceDelete.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />

      {/* Proxy-create */}
      <Modal
        open={openProxy}
        onClose={busy ? undefined : () => setOpenProxy(false)}
        title={t('admin.partnerships.proxy.title')}
        width={560}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={() => setOpenProxy(false)}
              disabled={busy}
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleProxyCreate}
              disabled={
                busy ||
                Number(proxy.project_id) < 1 ||
                !proxy.user_identifier.trim() ||
                !proxy.offering_type ||
                proxy.firm_name.trim().length < 2 ||
                proxy.capability_brief.trim().length < 10 ||
                proxy.message.trim().length < 10 ||
                proxy.reason.trim().length < 10
              }
            >
              {busy ? '…' : t('admin.partnerships.proxy.confirm')}
            </button>
          </>
        }
      >
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
        >
          {t('admin.partnerships.proxy.description')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">{t('admin.partnerships.proxy.projectId')}</label>
            <input
              className="field"
              type="number"
              min="1"
              step="1"
              value={proxy.project_id}
              onChange={(e) =>
                setProxy({ ...proxy, project_id: e.target.value.replace(/[^0-9]/g, '') })
              }
            />
          </div>
          <div>
            <label className="field-label">
              {t('admin.partnerships.proxy.userIdentifier')}
            </label>
            <input
              className="field field-no-icon"
              type="text"
              value={proxy.user_identifier}
              placeholder={t('admin.common.identifierPlaceholder')}
              onChange={(e) => setProxy({ ...proxy, user_identifier: e.target.value })}
            />
            <div className="field-hint">
              {t('admin.partnerships.proxy.userIdentifierHint')}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.partnerships.columns.offering')}</label>
          <select
            className="field"
            value={proxy.offering_type}
            onChange={(e) => setProxy({ ...proxy, offering_type: e.target.value })}
          >
            <option value="">{t('admin.partnerships.proxy.offeringPlaceholder')}</option>
            {OFFERING_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {t(`offering.${o.value}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.partnerships.detail.firm')}</label>
          <input
            className="field"
            value={proxy.firm_name}
            onChange={(e) => setProxy({ ...proxy, firm_name: e.target.value })}
            maxLength={255}
          />
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.partnerships.columns.share')}</label>
          <input
            className="field"
            value={proxy.proposed_share}
            onChange={(e) => setProxy({ ...proxy, proposed_share: e.target.value })}
            maxLength={255}
            placeholder="30% · 5M ر.س"
          />
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.partnerships.detail.capabilityBrief')}</label>
          <textarea
            className="field"
            value={proxy.capability_brief}
            onChange={(e) => setProxy({ ...proxy, capability_brief: e.target.value })}
            rows={3}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.partnerships.detail.message')}</label>
          <textarea
            className="field"
            value={proxy.message}
            onChange={(e) => setProxy({ ...proxy, message: e.target.value })}
            rows={3}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        <div className="mt-3">
          <label className="field-label">{t('admin.common.reasonLabel')}</label>
          <textarea
            className="field"
            placeholder={t('admin.partnerships.proxy.reasonPlaceholder')}
            value={proxy.reason}
            onChange={(e) => setProxy({ ...proxy, reason: e.target.value })}
            rows={3}
            style={{ padding: '12px 14px', resize: 'vertical' }}
          />
        </div>
        {actionError && (
          <div
            className="p-3 rounded-[10px] mt-3"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {actionError}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- small detail helpers ---------- */
function DetailField({ label, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function DetailBlock({ label, children }) {
  return (
    <div>
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
        {label}
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
        {children}
      </div>
    </div>
  );
}
