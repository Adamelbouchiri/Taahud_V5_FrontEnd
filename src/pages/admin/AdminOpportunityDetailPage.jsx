import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  UserRound,
  HardHat,
  CalendarClock,
  IdCard,
} from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import Ltr from '../../components/Ltr';
import {
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUS_TONE,
  PARTY_ROLE,
} from '../../config/brokerConstants';
import {
  PageHeader,
  Card,
  Badge,
  ConfirmDialog,
} from '../../components/admin/AdminUI';
import { formatDate } from '../../utils/date';

/* ============================================================
 *  AdminOpportunityDetailPage — /admin/opportunities/:id
 *  ----------------------------------------------------------------
 *  Where the review decision is made.
 *
 *    approve → starts the 90-day hold on the owner's national_id,
 *              locking every other broker out of that owner
 *    reject  → requires a reason, shown to the broker
 *    cancel  → requires a reason; allowed at any live stage
 *
 *  BROKER_SYSTEM_INTEGRATION.md asks the reviewer to verify the
 *  national_id / phone / notes the broker supplied, so the party
 *  cards put those front and centre — and flag an owner with NO
 *  national_id, since the duplicate check silently skips those.
 * ============================================================ */
export default function AdminOpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [action, setAction] = useState(null); // approve | reject | cancel
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    admin.opportunities
      .get(id)
      .then((res) => {
        setOpp(res);
        setError('');
      })
      .catch((err) => setError(err.message || t('admin.common.loadError')))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(load, [load]);

  const run = async () => {
    setBusy(true);
    setActionError('');
    try {
      if (action === 'approve') await admin.opportunities.approve(opp.id);
      if (action === 'reject') await admin.opportunities.reject(opp.id, reason.trim());
      if (action === 'cancel') await admin.opportunities.cancel(opp.id, reason.trim());
      setAction(null);
      setReason('');
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-5xl mx-auto flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="shimmer" style={{ height: 150, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-4xl mx-auto">
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {error || t('admin.common.loadError')}
          </p>
        </Card>
      </div>
    );
  }

  const owner = (opp.parties || []).find((p) => p.role === PARTY_ROLE.OWNER);
  const executor = (opp.parties || []).find((p) => p.role === PARTY_ROLE.EXECUTOR);
  const isPending = opp.status === OPPORTUNITY_STATUS.PENDING;
  const isLive =
    opp.status === OPPORTUNITY_STATUS.DRAFT ||
    opp.status === OPPORTUNITY_STATUS.PENDING ||
    opp.status === OPPORTUNITY_STATUS.ACTIVE;

  return (
    <div className="px-5 lg:px-8 py-7 max-w-6xl mx-auto flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/admin/opportunities')}
        className="btn-ghost inline-flex items-center gap-2 self-start"
        style={{ padding: 0, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        {t('admin.common.back')}
      </button>

      <PageHeader
        eyebrow={opp.reference}
        title={opp.title}
        subtitle={opp.description || undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isPending && (
              <>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={() => {
                    setReason('');
                    setActionError('');
                    setAction('approve');
                  }}
                  style={{ fontSize: 13 }}
                >
                  <CheckCircle2 size={15} strokeWidth={1.8} />
                  {t('admin.opportunities.actions.approve')}
                </button>
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-2"
                  onClick={() => {
                    setReason('');
                    setActionError('');
                    setAction('reject');
                  }}
                  style={{ fontSize: 13, color: 'var(--accent-danger)' }}
                >
                  <XCircle size={15} strokeWidth={1.8} />
                  {t('admin.opportunities.actions.reject')}
                </button>
              </>
            )}
            {isLive && (
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2"
                onClick={() => {
                  setReason('');
                  setActionError('');
                  setAction('cancel');
                }}
                style={{ fontSize: 13, color: 'var(--accent-danger)' }}
              >
                <Ban size={15} strokeWidth={1.8} />
                {t('admin.opportunities.actions.cancel')}
              </button>
            )}
          </div>
        }
      />

      {/* ---------- Status + broker ---------- */}
      <Card>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Badge tone={OPPORTUNITY_STATUS_TONE[opp.status] || 'default'}>
            {t(`broker.opportunityStatus.${opp.status}`)}
          </Badge>
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--text-muted)',
              fontFamily: 'ui-monospace, Menlo, monospace',
            }}
          >
            {opp.reference}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Meta
            label={t('admin.opportunities.columns.broker')}
            value={
              opp.broker
                ? `${opp.broker.name} · ${opp.broker.identifier}`
                : null
            }
          />
          <Meta label={t('broker.detail.createdAt')} value={formatDate(opp.created_at, lang)} />
          <Meta label={t('broker.detail.submittedAt')} value={formatDate(opp.submitted_at, lang)} />
          <Meta label={t('broker.detail.reviewedAt')} value={formatDate(opp.reviewed_at, lang)} />
        </div>

        {opp.held_until && (
          <div
            className="mt-4 p-4 rounded-[12px] flex items-start gap-3"
            style={{
              background: 'rgba(19,109,74,0.06)',
              border: '1px solid rgba(19,109,74,0.18)',
            }}
          >
            <CalendarClock
              size={17}
              strokeWidth={1.8}
              style={{ color: '#136d4a', flexShrink: 0, marginTop: 1 }}
            />
            <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>
              {t('broker.detail.hold.title', { date: formatDate(opp.held_until, lang) })}
            </div>
          </div>
        )}

        {opp.rejection_reason && (
          <Callout danger label={t('broker.detail.rejectionReason')} text={opp.rejection_reason} />
        )}
        {opp.cancellation_reason && (
          <Callout label={t('broker.detail.cancellationReason')} text={opp.cancellation_reason} />
        )}
      </Card>

      {/* ---------- Parties to verify ---------- */}
      <Card>
        <h3 className="font-display m-0 mb-4" style={{ fontSize: 15, fontWeight: 700 }}>
          {t('broker.detail.parties')}
        </h3>
        <div className="flex flex-col gap-3">
          <PartyCard party={owner} role={PARTY_ROLE.OWNER} t={t} />
          {executor ? (
            <PartyCard party={executor} role={PARTY_ROLE.EXECUTOR} t={t} />
          ) : (
            <p className="m-0" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('broker.detail.noExecutor')}
            </p>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(action)}
        title={action ? t(`admin.opportunities.confirm.${action}.title`) : ''}
        description={action ? t(`admin.opportunities.confirm.${action}.description`) : ''}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        // Approve needs no reason; reject and cancel both do.
        requireReason={action !== 'approve'}
        confirmLabel={action ? t(`admin.opportunities.actions.${action}`) : ''}
        cancelLabel={t('admin.common.cancel')}
        confirmTone={action === 'approve' ? 'primary' : 'danger'}
        busy={busy}
        error={actionError}
        onClose={() => {
          setAction(null);
          setActionError('');
        }}
        onConfirm={run}
      />
    </div>
  );
}

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{value}</div>
    </div>
  );
}

function Callout({ danger, label, text }) {
  return (
    <div
      className="mt-4 p-4 rounded-[12px]"
      style={{
        background: danger ? 'rgba(185,28,28,0.05)' : 'var(--bg-canvas)',
        border: `1px solid ${danger ? 'rgba(185,28,28,0.16)' : 'var(--border-soft)'}`,
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          marginBottom: 4,
          color: danger ? 'var(--accent-danger)' : 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-ink)' }}>{text}</div>
    </div>
  );
}

function PartyCard({ party, role, t }) {
  if (!party) return null;
  const isOwner = role === PARTY_ROLE.OWNER;
  const Icon = isOwner ? UserRound : HardHat;
  // The duplicate check runs on national_id alone — an owner without
  // one was never checked, and the reviewer needs to know that.
  const missingId = isOwner && !party.national_id;

  return (
    <div
      className="p-4 rounded-[12px]"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-soft)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isOwner ? 'rgba(44,47,124,0.08)' : 'rgba(19,109,74,0.08)',
            color: isOwner ? 'var(--accent-primary)' : '#136d4a',
          }}
        >
          <Icon size={16} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {t(`broker.partyRole.${role}`)}
          </div>
          <div
            className="font-semibold"
            style={{ fontSize: 14, color: 'var(--text-ink)', marginTop: 1 }}
          >
            {party.name}
          </div>

          <div
            style={{ fontSize: 12.5, color: 'var(--text-ink-soft)', marginTop: 5, lineHeight: 1.8 }}
          >
            {party.national_id && (
              <div className="flex items-center gap-1.5">
                <IdCard size={13} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} />
                <Ltr>{party.national_id}</Ltr>
              </div>
            )}
            {party.phone && <div><Ltr>{party.phone}</Ltr></div>}
            {party.email && <div><Ltr>{party.email}</Ltr></div>}
            {party.notes && (
              <div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{party.notes}</div>
            )}
          </div>

          {missingId && (
            <div
              className="mt-3 p-2.5 rounded-[9px]"
              style={{
                background: 'rgba(184,134,42,0.08)',
                border: '1px solid rgba(184,134,42,0.20)',
                fontSize: 12,
                lineHeight: 1.7,
                color: 'var(--text-ink-soft)',
              }}
            >
              {t('admin.opportunities.noNationalId')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
