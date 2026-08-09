import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Banknote,
  Smartphone,
  CheckCircle2,
  XCircle,
  Hourglass,
  Wallet,
  Eye,
  Check,
  X,
  Copy,
  AlertCircle,
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatHalalas } from '../../utils/money';
import {
  PageHeader,
  Card,
  DataTable,
  Pagination,
  Badge,
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminWithdrawalsPage — /admin/withdrawals
 *  ----------------------------------------------------------------
 *  The escrow payout review queue (WALLET_PAYMENTS_FRONTEND.md §3).
 *
 *  A provider earns into a wallet when project owners pay for steps;
 *  requesting a withdrawal DEBITS that wallet immediately and parks
 *  the row as `pending`. Nothing has left the platform yet — this
 *  screen is where an admin decides whether it should:
 *
 *    approve → status `approved`. The debit stands. The actual bank /
 *              stc transfer happens OFF-PLATFORM for now, so there is
 *              no `approved → paid` action to offer here.
 *    reject  → status `rejected` AND the amount is credited back to
 *              the provider. A reason is required and the provider
 *              sees it on their wallet page.
 *
 *  Both 422 when the row isn't `pending` any more, which is exactly
 *  what should happen if two admins open the queue at once — the
 *  second one gets an error rather than a double credit. We surface
 *  that message and reload rather than retrying.
 *
 *  MONEY UNIT: `amount` is an INTEGER IN HALALAS (1 SAR = 100).
 *
 *  THE REQUESTER: the admin list eager-loads `wallet.user`, so every row
 *  carries `requester` (a UserResource — name, identifier, contact,
 *  account type, suspension). The provider's own list does NOT load it,
 *  so the field is absent there; requesterOf() below tolerates that and
 *  the approve/reject responses, which only reload `reviewer`.
 * ============================================================ */

const STATUSES = ['pending', 'approved', 'paid', 'rejected'];

const STATUS_TONE = {
  pending: 'warning',
  approved: 'success',
  paid: 'success',
  rejected: 'danger',
};

const KPI_TONE = {
  pending: { accent: '#b8862a', soft: 'rgba(184,134,42,0.12)', icon: Hourglass },
  approved: { accent: '#136d4a', soft: 'rgba(19,109,74,0.10)', icon: CheckCircle2 },
  paid: { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: Wallet },
  rejected: { accent: 'var(--accent-danger)', soft: 'rgba(185,28,28,0.10)', icon: XCircle },
};

export default function AdminWithdrawalsPage() {
  const { t, lang } = useTranslation();

  // The pending queue is the reason this page exists — open on it.
  const [statusTab, setStatusTab] = useState('pending');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  /* ---------- details modal ---------- */
  const [detailsRow, setDetailsRow] = useState(null);

  /* ---------- approve / reject ---------- */
  const [approveRow, setApproveRow] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const fmtMoney = useCallback((halalas) => formatHalalas(halalas, lang, t), [lang, t]);
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

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.withdrawals.list({ status: statusTab || undefined, page });
      setRows(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [statusTab, page, t]);

  /* Tab counts. There's no aggregate endpoint, so we ask the list for
     each status and read meta.total — four cheap calls that give real
     numbers instead of a badge that only counts the current page. */
  const loadCounts = useCallback(async () => {
    try {
      const results = await Promise.all(
        STATUSES.map((s) =>
          admin.withdrawals
            .list({ status: s })
            .then((r) => r.meta?.total ?? r.data.length)
            .catch(() => null)
        )
      );
      setCounts(Object.fromEntries(STATUSES.map((s, i) => [s, results[i]])));
    } catch {
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Reset to page 1 when the tab changes so we never land past the end.
  useEffect(() => {
    setPage(1);
  }, [statusTab]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), loadCounts()]);
  };

  /* ---------- actions ---------- */
  const doApprove = async () => {
    if (!approveRow) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.withdrawals.approve(approveRow.id);
      setApproveRow(null);
      showToast(
        t('admin.withdrawals.approved', {
          id: approveRow.id,
          amount: fmtMoney(approveRow.amount),
        })
      );
      await refreshAll();
    } catch (err) {
      // 422 = the row stopped being pending (settled in another tab).
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejectRow) return;
    setBusy(true);
    setActionError('');
    try {
      await admin.withdrawals.reject(rejectRow.id, reason.trim());
      setRejectRow(null);
      setReason('');
      showToast(
        t('admin.withdrawals.rejected', {
          id: rejectRow.id,
          amount: fmtMoney(rejectRow.amount),
        })
      );
      await refreshAll();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- table ---------- */
  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: t('admin.withdrawals.table.request'),
        render: (row) => (
          <div className="flex flex-col">
            <span
              style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text-ink)' }}
            >
              #{row.id}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {fmtDateTime(row.created_at)}
            </span>
          </div>
        ),
      },
      {
        key: 'provider',
        label: t('admin.withdrawals.table.provider'),
        render: (row) => {
          const u = requesterOf(row);
          const name = u?.name || '';
          return (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center font-display font-bold flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: u?.is_suspended ? 'var(--accent-danger)' : '#136d4a',
                  color: 'white',
                  fontSize: 13,
                }}
              >
                {(name || '·').trim().charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="font-semibold truncate"
                    style={{ fontSize: 13.5, color: name ? 'var(--text-ink)' : 'var(--text-muted)' }}
                  >
                    {name || t('admin.withdrawals.table.providerUnknown')}
                  </span>
                  {u?.is_suspended && (
                    <Badge tone="danger">{t('admin.users.status.suspended')}</Badge>
                  )}
                </div>
                <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {u?.identifier ? (
                    <code
                      dir="ltr"
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {u.identifier}
                    </code>
                  ) : (
                    u?.account_type ? t(`accountType.${u.account_type}`) : '—'
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'amount',
        label: t('admin.withdrawals.table.amount'),
        render: (row) => (
          <span style={{ fontWeight: 700, color: 'var(--text-ink)', fontSize: 13.5 }}>
            {fmtMoney(row.amount)}
          </span>
        ),
      },
      {
        key: 'method',
        label: t('admin.withdrawals.table.method'),
        render: (row) => (
          <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
            {row.payout_method === 'stc_pay' ? (
              <Smartphone size={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <Banknote size={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            )}
            <span>{t(`wallet.methods.${row.payout_method}`)}</span>
          </div>
        ),
      },
      {
        key: 'destination',
        label: t('admin.withdrawals.table.destination'),
        render: (row) => (
          <div className="flex flex-col min-w-0">
            <span
              dir="ltr"
              style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-ink-soft)' }}
            >
              {row.payout_details?.iban || row.payout_details?.mobile || '—'}
            </span>
            {/* The account holder as typed by the provider — worth seeing next
                to the destination, since it may differ from their profile name. */}
            {row.payout_details?.holder_name && (
              <span className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {row.payout_details.holder_name}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        label: t('admin.withdrawals.table.status'),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status] || 'default'}>
            {t(`wallet.statuses.${row.status}`)}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: t('admin.withdrawals.table.actions'),
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
            <IconAction
              icon={Eye}
              label={t('admin.common.view')}
              onClick={() => setDetailsRow(row)}
            />
            {row.status === 'pending' && (
              <>
                <IconAction
                  icon={Check}
                  tone="success"
                  label={t('admin.withdrawals.actions.approve')}
                  onClick={() => {
                    setActionError('');
                    setApproveRow(row);
                  }}
                />
                <IconAction
                  icon={X}
                  tone="danger"
                  label={t('admin.withdrawals.actions.reject')}
                  onClick={() => {
                    setActionError('');
                    setReason('');
                    setRejectRow(row);
                  }}
                />
              </>
            )}
          </div>
        ),
      },
    ],
    [t, fmtMoney, fmtDateTime]
  );

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={t('admin.withdrawals.eyebrow')}
        title={t('admin.withdrawals.title')}
        subtitle={t('admin.withdrawals.subtitle')}
        actions={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={refreshAll}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {STATUSES.map((s) => {
          const tone = KPI_TONE[s];
          return (
            <StatusKpi
              key={s}
              icon={tone.icon}
              tone={tone}
              label={t(`wallet.statuses.${s}`)}
              value={counts?.[s] != null ? String(counts[s]) : '—'}
              active={statusTab === s}
              onClick={() => setStatusTab(s)}
            />
          );
        })}
      </div>

      {/* ---------- Status tabs ---------- */}
      <style>{`
        .wd-tabs-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .wd-tabs-scroll::-webkit-scrollbar { height: 0; width: 0; display: none; }
      `}</style>
      <div
        className="wd-tabs-scroll flex items-center gap-1 mb-4 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        {['', ...STATUSES].map((key) => {
          const isActive = statusTab === key;
          return (
            <button
              key={key || 'all'}
              type="button"
              onClick={() => setStatusTab(key)}
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
              {key ? t(`wallet.statuses.${key}`) : t('admin.common.all')}
              {key && counts?.[key] != null && (
                <span
                  style={{
                    marginInlineStart: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  ({counts[key]})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------- Data table ---------- */}
      <Card padded={false}>
        <div
          className="px-4 py-3 font-display"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-ink)',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          {statusTab ? t(`wallet.statuses.${statusTab}`) : t('admin.withdrawals.listTitle')}
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
          emptyTitle={t('admin.withdrawals.table.empty')}
          onRowClick={(row) => setDetailsRow(row)}
        />
        <Pagination meta={meta} onPage={(p) => setPage(p)} t={t} />
      </Card>

      {/* ---------- Details modal ---------- */}
      <Modal
        open={!!detailsRow}
        onClose={() => setDetailsRow(null)}
        width={540}
        title={t('admin.withdrawals.details.title', { id: detailsRow?.id ?? '' })}
        footer={
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => setDetailsRow(null)}
          >
            {t('admin.common.close')}
          </button>
        }
      >
        {detailsRow && (
          <WithdrawalDetails
            w={detailsRow}
            t={t}
            fmtMoney={fmtMoney}
            fmtDateTime={fmtDateTime}
          />
        )}
      </Modal>

      {/* ---------- Approve confirm ----------
          No reason required — approving is the expected outcome and the
          BE doesn't ask for one. The warning is that the payout itself
          still has to be made by hand, outside the platform. */}
      <ConfirmDialog
        open={!!approveRow}
        onClose={() => {
          setApproveRow(null);
          setActionError('');
        }}
        onConfirm={doApprove}
        title={t('admin.withdrawals.approveDialog.title')}
        description={t('admin.withdrawals.approveDialog.body', {
          amount: approveRow ? fmtMoney(approveRow.amount) : '',
          destination: approveRow
            ? approveRow.payout_details?.iban || approveRow.payout_details?.mobile || '—'
            : '',
        })}
        confirmLabel={t('admin.withdrawals.actions.approve')}
        cancelLabel={t('admin.common.cancel')}
        requireReason={false}
        busy={busy}
        error={actionError}
      />

      {/* ---------- Reject confirm ----------
          The reason is required by the API AND shown to the provider,
          so it's the one field that matters here. Rejecting reverses
          the debit — the money goes back to the wallet. */}
      <ConfirmDialog
        open={!!rejectRow}
        onClose={() => {
          setRejectRow(null);
          setReason('');
          setActionError('');
        }}
        onConfirm={doReject}
        title={t('admin.withdrawals.rejectDialog.title')}
        description={t('admin.withdrawals.rejectDialog.body', {
          amount: rejectRow ? fmtMoney(rejectRow.amount) : '',
        })}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.withdrawals.rejectDialog.reasonLabel')}
        reasonPlaceholder={t('admin.withdrawals.rejectDialog.reasonPlaceholder')}
        confirmLabel={t('admin.withdrawals.actions.reject')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />
    </div>
  );
}

/* ============================================================
 *  Details
 * ============================================================ */
function WithdrawalDetails({ w, t, fmtMoney, fmtDateTime }) {
  const [copied, setCopied] = useState('');
  const destination = w.payout_details?.iban || w.payout_details?.mobile || '';
  const requester = requesterOf(w);

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions) —
      // the value is visible and selectable either way.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={STATUS_TONE[w.status] || 'default'}>{t(`wallet.statuses.${w.status}`)}</Badge>
        <Badge tone="muted">{t(`wallet.methods.${w.payout_method}`)}</Badge>
      </div>

      <div
        className="flex items-center gap-3 p-4 rounded-[12px]"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(19,109,74,0.10)', color: '#136d4a' }}
        >
          <Wallet size={20} />
        </div>
        <div className="min-w-0">
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t('admin.withdrawals.table.amount')}
          </div>
          <div
            className="font-display"
            style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.1 }}
          >
            {fmtMoney(w.amount)}
          </div>
        </div>
      </div>

      {/* Who is being paid. Present on the admin list (wallet.user is
          eager-loaded); absent on the approve/reject response, so the
          block simply doesn't render there. */}
      {requester && <RequesterCard u={requester} t={t} />}

      {/* Payout target — the value an operator retypes into the banking
          portal, so it gets a copy button and never gets masked here. */}
      <div>
        <DetailLabel>{t('admin.withdrawals.details.destination')}</DetailLabel>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            dir="ltr"
            style={{
              fontFamily: 'monospace',
              fontSize: 13.5,
              color: 'var(--text-ink)',
              wordBreak: 'break-all',
            }}
          >
            {destination || '—'}
          </span>
          {destination && (
            <button
              type="button"
              onClick={() => copy(destination, 'dest')}
              className="inline-flex items-center gap-1 bg-transparent cursor-pointer"
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '3px 8px',
                fontSize: 11.5,
                color: 'var(--text-ink-soft)',
                fontFamily: 'inherit',
              }}
            >
              <Copy size={12} />
              {copied === 'dest' ? t('admin.common.copied') : t('admin.common.copy')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {w.payout_details?.holder_name && (
          <div>
            <DetailLabel>{t('wallet.form.holder')}</DetailLabel>
            <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {w.payout_details.holder_name}
            </div>
          </div>
        )}
        <div>
          <DetailLabel>{t('admin.withdrawals.details.requestedAt')}</DetailLabel>
          <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{fmtDateTime(w.created_at)}</div>
        </div>
        {w.reviewed_at && (
          <div>
            <DetailLabel>{t('admin.withdrawals.details.reviewedAt')}</DetailLabel>
            <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{fmtDateTime(w.reviewed_at)}</div>
          </div>
        )}
        {w.reviewer?.name && (
          <div>
            <DetailLabel>{t('admin.withdrawals.details.reviewer')}</DetailLabel>
            <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{w.reviewer.name}</div>
          </div>
        )}
        {w.paid_at && (
          <div>
            <DetailLabel>{t('admin.withdrawals.details.paidAt')}</DetailLabel>
            <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{fmtDateTime(w.paid_at)}</div>
          </div>
        )}
      </div>

      {w.rejection_reason && (
        <div
          className="p-3 rounded-[10px]"
          style={{ background: 'rgba(185,28,28,0.05)', border: '1px solid rgba(185,28,28,0.16)' }}
        >
          <DetailLabel danger>{t('admin.withdrawals.details.rejectionReason')}</DetailLabel>
          <p className="m-0" style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-ink-soft)' }}>
            {w.rejection_reason}
          </p>
        </div>
      )}

      {w.status === 'approved' && (
        <div
          className="flex items-start gap-2 p-3 rounded-[10px]"
          style={{
            background: 'rgba(184,134,42,0.08)',
            border: '1px solid rgba(184,134,42,0.20)',
            color: '#8a6518',
            fontSize: 12.5,
            lineHeight: 1.6,
          }}
        >
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('admin.withdrawals.details.manualPayout')}</span>
        </div>
      )}
    </div>
  );
}

function DetailLabel({ children, danger }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: danger ? 'var(--accent-danger)' : 'var(--text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 3,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
 *  Local presentational helpers
 * ============================================================ */
function StatusKpi({ icon: Icon, label, value, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-start"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${active ? tone.accent : 'var(--border-default)'}`,
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s ease',
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
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div
          className="font-display"
          style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.15 }}
        >
          {value}
        </div>
      </div>
    </button>
  );
}

const ICON_ACTION_TONES = {
  neutral: { color: 'var(--text-ink-soft)', hbg: 'rgba(44,47,124,0.10)', hcolor: 'var(--accent-primary)' },
  success: { color: '#136d4a', hbg: 'rgba(19,109,74,0.12)', hcolor: '#0d5538' },
  danger: { color: 'var(--accent-danger)', hbg: 'rgba(185,28,28,0.10)', hcolor: '#b91c1c' },
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

/**
 * The provider who asked to be paid.
 *
 * `requester` is what the admin list returns (WithdrawalResource adds it
 * whenever `wallet.user` is loaded). The other shapes are kept as cheap
 * fallbacks; `null` means the row came from a response that didn't load
 * the relation, in which case callers render the unknown state.
 */
function requesterOf(row) {
  return row?.requester || row?.wallet?.user || row?.user || null;
}

/* ============================================================
 *  Requester card — the provider identity block in the details modal.
 *  Name links to the full profile so an admin can check standing
 *  (suspensions, history) before releasing money.
 * ============================================================ */
function RequesterCard({ u, t }) {
  const contact = [
    { icon: Mail, value: u.email, ltr: true },
    { icon: Phone, value: u.phone, ltr: true },
    { icon: MapPin, value: u.city, ltr: false },
  ].filter((c) => c.value);

  return (
    <div
      className="p-4 rounded-[12px]"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
    >
      <DetailLabel>{t('admin.withdrawals.details.requester')}</DetailLabel>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center font-display font-bold flex-shrink-0"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: u.is_suspended ? 'var(--accent-danger)' : '#136d4a',
            color: 'white',
            fontSize: 14,
          }}
        >
          {(u.name || '·').trim().charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {u.id ? (
              <Link
                to={`/admin/users/${u.id}`}
                className="font-semibold inline-flex items-center gap-1"
                style={{ fontSize: 14, color: 'var(--accent-primary)', textDecoration: 'none' }}
              >
                {u.name || `#${u.id}`}
                <ArrowUpRight size={13} strokeWidth={2} />
              </Link>
            ) : (
              <span className="font-semibold" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
                {u.name || t('admin.withdrawals.table.providerUnknown')}
              </span>
            )}
            {u.account_type && <Badge tone="muted">{t(`accountType.${u.account_type}`)}</Badge>}
            {u.is_suspended && <Badge tone="danger">{t('admin.users.status.suspended')}</Badge>}
          </div>
          {u.identifier && (
            <code
              dir="ltr"
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                letterSpacing: '0.03em',
              }}
            >
              {u.identifier}
            </code>
          )}
        </div>
      </div>

      {contact.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-3">
          {contact.map(({ icon: Icon, value, ltr }) => (
            <div key={value} className="flex items-center gap-2 min-w-0">
              <Icon size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span
                dir={ltr ? 'ltr' : undefined}
                className="truncate"
                style={{ fontSize: 12.5, color: 'var(--text-ink-soft)' }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* A frozen/suspended provider is exactly the case where an admin
          should stop and look before approving a payout. */}
      {u.is_suspended && u.suspension_reason && (
        <p
          className="m-0 mt-3"
          style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--accent-danger)' }}
        >
          {u.suspension_reason}
        </p>
      )}
    </div>
  );
}
