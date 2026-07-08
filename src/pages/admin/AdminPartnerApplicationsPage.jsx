import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Check,
  X as XIcon,
  RefreshCcw,
  Ban,
  RotateCcw,
  Trash2,
  Pencil,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { admin } from '../../services';
import { useUser } from '../../contexts/UserContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { PARTNER_SECTORS } from '../../config/partnerSectors';
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
 *  AdminPartnerApplicationsPage — /admin/partner-applications
 *
 *  The "Become a Partner" review console. List + filter every
 *  application, open a row for the full record, and drive the
 *  whole lifecycle: approve (mints the code), reject, edit,
 *  regenerate / revoke / reinstate the code, soft-delete /
 *  restore, and (super-admin) force-delete. See partner_applications.md.
 * ============================================================ */

const STATUSES = ['pending', 'approved', 'rejected'];

// Derive the row's effective lifecycle state for display + actions.
// `revoked` and `archived` aren't `status` values on the BE — they're
// inferred from revoked_at / deleted_at on top of status === 'approved'.
function partnerStatus(row) {
  if (row.deleted_at) return 'archived';
  if (row.status === 'approved' && row.revoked_at) return 'revoked';
  return row.status;
}

function statusTone(state) {
  switch (state) {
    case 'approved':
      return 'success';
    case 'rejected':
    case 'revoked':
      return 'danger';
    case 'archived':
      return 'muted';
    case 'pending':
    default:
      return 'warning';
  }
}

export default function AdminPartnerApplicationsPage() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useUser();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [archived, setArchived] = useState(''); // '' | 'with' | 'only'
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);

  // The contextual confirm action (reason-prompt) and the edit modal.
  const [action, setAction] = useState(null); // { key, requireReason, tone, run }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const sectorLabels = PARTNER_SECTORS.map((s) => s.canonical);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.partnerApplications.list({
        q: q || undefined,
        status: status || undefined,
        sector: sector || undefined,
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
  }, [q, status, sector, archived, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, sector, archived]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Keep the open detail modal in sync after an action mutates the row.
  const refreshSelected = async (id) => {
    try {
      const fresh = await admin.partnerApplications.get(id);
      setSelected(fresh);
    } catch {
      setSelected(null);
    }
  };

  const runAction = async () => {
    if (!action || !selected) return;
    setBusy(true);
    setActionError('');
    try {
      await action.run(selected.id, reason.trim());
      showToast(t(`admin.partners.actions.${action.key}.done`));
      setAction(null);
      setReason('');
      if (action.closesRow) {
        setSelected(null);
      } else {
        await refreshSelected(selected.id);
      }
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const columns = useMemo(
    () => [
      {
        key: 'partner',
        label: t('admin.partners.columns.partner'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {row.company_name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              #{row.id} · {new Date(row.created_at).toLocaleDateString()}
            </div>
          </div>
        ),
      },
      {
        key: 'applicant',
        label: t('admin.partners.columns.applicant'),
        render: (row) =>
          row.applicant ? (
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13 }}>{row.applicant.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>#{row.applicant.id}</div>
            </div>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {t('admin.partners.guest')}
            </span>
          ),
      },
      {
        key: 'sector',
        label: t('admin.partners.columns.sector'),
        render: (row) => <span style={{ fontSize: 13 }}>{row.sector || '—'}</span>,
      },
      {
        key: 'code',
        label: t('admin.partners.columns.code'),
        render: (row) =>
          row.code ? (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12.5, fontWeight: 600, direction: 'ltr', fontFamily: 'monospace' }}>
                {row.code}
              </span>
              <Badge tone={row.is_code_valid ? 'success' : 'muted'}>
                {row.is_code_valid
                  ? t('admin.partners.code.valid')
                  : t('admin.partners.code.invalid')}
              </Badge>
            </div>
          ) : (
            '—'
          ),
      },
      {
        key: 'status',
        label: t('admin.partners.columns.status'),
        render: (row) => {
          const st = partnerStatus(row);
          return <Badge tone={statusTone(st)}>{t(`admin.partners.statuses.${st}`)}</Badge>;
        },
      },
    ],
    [t]
  );

  const activeCount =
    (q ? 1 : 0) + (status ? 1 : 0) + (sector ? 1 : 0) + (archived ? 1 : 0);

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.partners.eyebrow')}
        title={t('admin.partners.title')}
        subtitle={t('admin.partners.subtitle')}
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
        activeCount={activeCount}
        onReset={() => {
          setQ('');
          setStatus('');
          setSector('');
          setArchived('');
        }}
        resetLabel={t('admin.common.reset')}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder={t('admin.partners.filters.searchPlaceholder')}
      >
        <FilterSelect
          label={t('admin.partners.columns.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.anyStatus') },
            ...STATUSES.map((s) => ({ value: s, label: t(`admin.partners.statuses.${s}`) })),
          ]}
        />
        <FilterSelect
          label={t('admin.partners.columns.sector')}
          value={sector}
          onChange={setSector}
          options={[
            { value: '', label: t('admin.partners.filters.anySector') },
            ...sectorLabels.map((s) => ({ value: s, label: s })),
          ]}
          minWidth={180}
        />
        <FilterSelect
          label={t('admin.partners.filters.archived')}
          value={archived}
          onChange={setArchived}
          options={[
            { value: '', label: t('admin.partners.filters.archivedActive') },
            { value: 'with', label: t('admin.partners.filters.archivedWith') },
            { value: 'only', label: t('admin.partners.filters.archivedOnly') },
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
            emptyTitle={t('admin.partners.empty')}
            onRowClick={(row) => setSelected(row)}
          />
          <Pagination meta={data.meta} onPage={(p) => setPage(p)} t={t} />
        </Card>
      </div>

      {/* Detail + actions */}
      <DetailModal
        row={selected}
        open={!!selected && !action && !editOpen}
        onClose={() => setSelected(null)}
        t={t}
        isSuperAdmin={isSuperAdmin}
        copied={copied}
        onCopyCode={copyCode}
        onEdit={() => setEditOpen(true)}
        onAction={(a) => {
          setReason('');
          setActionError('');
          setAction(a);
        }}
      />

      {/* Reason-prompt / confirm for the chosen action */}
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        title={action ? t(`admin.partners.actions.${action.key}.title`) : ''}
        description={action ? t(`admin.partners.actions.${action.key}.description`) : ''}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={action ? t(`admin.partners.actions.${action.key}.confirm`) : ''}
        cancelLabel={t('admin.common.cancel')}
        confirmTone={action?.tone || 'primary'}
        requireReason={!!action?.requireReason}
        busy={busy}
        error={actionError}
      />

      {/* Edit fields */}
      <EditModal
        open={editOpen}
        row={selected}
        onClose={() => setEditOpen(false)}
        t={t}
        sectorLabels={sectorLabels}
        onSaved={async (id) => {
          setEditOpen(false);
          showToast(t('admin.partners.actions.edit.done'));
          await refreshSelected(id);
          load();
        }}
      />
    </div>
  );
}

/* ============================================================
 *  DetailModal — full record + contextual lifecycle actions.
 * ============================================================ */
function DetailModal({
  row,
  open,
  onClose,
  t,
  isSuperAdmin,
  copied,
  onCopyCode,
  onEdit,
  onAction,
}) {
  if (!row) return null;
  const st = partnerStatus(row);

  // Action descriptors. `run` calls the matching service method;
  // `requireReason` gates the ConfirmDialog's textarea; `closesRow`
  // dismisses the detail modal after success (for delete/force-delete).
  const A = {
    approve: {
      key: 'approve',
      requireReason: false,
      tone: 'primary',
      icon: Check,
      run: (id) => admin.partnerApplications.approve(id),
    },
    reject: {
      key: 'reject',
      requireReason: true,
      tone: 'danger',
      icon: XIcon,
      run: (id, reason) => admin.partnerApplications.reject(id, reason),
    },
    regenerate: {
      key: 'regenerate',
      requireReason: false,
      tone: 'primary',
      icon: RefreshCcw,
      run: (id) => admin.partnerApplications.regenerateCode(id),
    },
    revoke: {
      key: 'revoke',
      requireReason: true,
      tone: 'danger',
      icon: Ban,
      run: (id, reason) => admin.partnerApplications.revoke(id, reason),
    },
    reinstate: {
      key: 'reinstate',
      requireReason: false,
      tone: 'primary',
      icon: RotateCcw,
      run: (id) => admin.partnerApplications.reinstate(id),
    },
    remove: {
      key: 'remove',
      requireReason: true,
      tone: 'danger',
      icon: Trash2,
      closesRow: true,
      run: (id, reason) => admin.partnerApplications.remove(id, reason),
    },
    restore: {
      key: 'restore',
      requireReason: false,
      tone: 'primary',
      icon: RotateCcw,
      run: (id) => admin.partnerApplications.restore(id),
    },
    forceDelete: {
      key: 'forceDelete',
      requireReason: true,
      tone: 'danger',
      icon: Trash2,
      closesRow: true,
      run: (id, reason) => admin.partnerApplications.forceDelete(id, reason),
    },
  };

  // Which actions apply in the current state.
  const buttons = [];
  if (st === 'archived') {
    buttons.push(A.restore);
    if (isSuperAdmin) buttons.push(A.forceDelete);
  } else {
    if (st === 'pending' || st === 'rejected') buttons.push(A.approve);
    if (st === 'pending') buttons.push(A.reject);
    if (st === 'approved') {
      buttons.push(A.regenerate);
      buttons.push(A.revoke);
    }
    if (st === 'revoked') buttons.push(A.reinstate);
    buttons.push(A.remove);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row.company_name}
      width={580}
      footer={
        <div className="flex items-center justify-between gap-2 w-full flex-wrap">
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={onClose}
          >
            {t('admin.common.close')}
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {st !== 'archived' && (
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 14px' }}
                onClick={onEdit}
              >
                <Pencil size={14} />
                {t('admin.partners.actions.edit.button')}
              </button>
            )}
            {buttons.map((a) => {
              const Icon = a.icon;
              const danger = a.tone === 'danger';
              return (
                <button
                  key={a.key}
                  type="button"
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '10px 14px',
                    background: danger ? '#b91c1c' : '#2c2f7c',
                    borderColor: danger ? '#b91c1c' : '#2c2f7c',
                    boxShadow: danger
                      ? '0 6px 14px rgba(185,28,28,0.20)'
                      : '0 6px 14px rgba(44,47,124,0.18)',
                  }}
                  onClick={() => onAction(a)}
                >
                  <Icon size={14} />
                  {t(`admin.partners.actions.${a.key}.button`)}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(st)}>{t(`admin.partners.statuses.${st}`)}</Badge>
          {row.code && (
            <Badge tone={row.is_code_valid ? 'success' : 'muted'}>
              {row.is_code_valid
                ? t('admin.partners.code.valid')
                : t('admin.partners.code.invalid')}
            </Badge>
          )}
        </div>

        {/* Code with copy */}
        {row.code && (
          <div
            className="flex items-center justify-between gap-3 p-3 rounded-[10px]"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
          >
            <div className="min-w-0">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('admin.partners.columns.code')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, direction: 'ltr', fontFamily: 'monospace', color: 'var(--text-ink)' }}>
                {row.code}
              </div>
              {row.code_expires_at && (
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('admin.partners.detail.expires', {
                    date: new Date(row.code_expires_at).toLocaleDateString(),
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 12px', fontSize: 12.5 }}
              onClick={() => onCopyCode(row.code)}
            >
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              {copied ? t('admin.common.copied') : t('admin.common.copy')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ fontSize: 13 }}>
          <Detail label={t('admin.partners.columns.sector')} value={row.sector} />
          <Detail
            label={t('admin.partners.columns.applicant')}
            value={row.applicant ? `${row.applicant.name} (#${row.applicant.id})` : t('admin.partners.guest')}
          />
          <Detail label={t('admin.partners.detail.email')} value={row.email} ltr />
          <Detail label={t('admin.partners.detail.phone')} value={row.phone} ltr />
        </div>

        <div>
          <FieldLabel>{t('admin.partners.detail.offer')}</FieldLabel>
          <div
            className="p-3 rounded-[10px]"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
              fontSize: 13,
              color: 'var(--text-ink)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {row.offer || '—'}
          </div>
        </div>

        {row.rejection_reason && (
          <div>
            <FieldLabel>{t('admin.partners.detail.rejectionReason')}</FieldLabel>
            <div
              className="p-3 rounded-[10px]"
              style={{
                background: 'rgba(185,28,28,0.06)',
                border: '1px solid rgba(185,28,28,0.18)',
                fontSize: 13,
                color: 'var(--accent-danger)',
                lineHeight: 1.6,
              }}
            >
              {row.rejection_reason}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Detail({ label, value, ltr }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div
        className="truncate"
        style={{ color: 'var(--text-ink)', direction: ltr ? 'ltr' : undefined }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
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

/* ============================================================
 *  EditModal — PATCH the editable fields.
 * ============================================================ */
function EditModal({ open, row, onClose, t, sectorLabels, onSaved }) {
  const [form, setForm] = useState({ company_name: '', sector: '', email: '', phone: '', offer: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open && row) {
      setForm({
        company_name: row.company_name || '',
        sector: row.sector || '',
        email: row.email || '',
        phone: row.phone || '',
        offer: row.offer || '',
      });
      setErr('');
    }
  }, [open, row]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!row) return;
    setBusy(true);
    setErr('');
    try {
      await admin.partnerApplications.update(row.id, form);
      onSaved(row.id);
    } catch (e) {
      setErr(e.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  // Offer the stored sector as an option even if it isn't in the
  // canonical list, so editing an off-list value doesn't blank it.
  const sectorOpts = sectorLabels.includes(form.sector) || !form.sector
    ? sectorLabels
    : [form.sector, ...sectorLabels];

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={t('admin.partners.actions.edit.title')}
      width={520}
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={onClose}
            disabled={busy}
          >
            {t('admin.common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={save}
            disabled={busy}
          >
            {busy ? '…' : t('admin.common.save')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="field-label">{t('admin.partners.detail.company')}</label>
          <input className="field field-no-icon" value={form.company_name} onChange={set('company_name')} maxLength={255} />
        </div>
        <div>
          <label className="field-label">{t('admin.partners.columns.sector')}</label>
          <select className="field" value={form.sector} onChange={set('sector')}>
            <option value="">—</option>
            {sectorOpts.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">{t('admin.partners.detail.email')}</label>
          <input className="field field-no-icon" type="email" dir="ltr" value={form.email} onChange={set('email')} maxLength={255} />
        </div>
        <div>
          <label className="field-label">{t('admin.partners.detail.phone')}</label>
          <input className="field field-no-icon" dir="ltr" value={form.phone} onChange={set('phone')} maxLength={30} />
        </div>
        <div>
          <label className="field-label">{t('admin.partners.detail.offer')}</label>
          <textarea
            className="field field-no-icon"
            value={form.offer}
            onChange={set('offer')}
            rows={3}
            maxLength={2000}
            style={{ resize: 'vertical' }}
          />
        </div>
        {err && (
          <div
            className="p-3 rounded-[10px]"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
