import React, { useState } from 'react';
import {
  Percent,
  Send,
  Check,
  X,
  Hourglass,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, ConfirmDialog } from '../admin/AdminUI';
import Field from '../form/Field';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/date';
import {
  FEE_PERCENT_MIN,
  FEE_PERCENT_MAX,
  FEE_STATUS,
  FEE_STATUS_TONE,
  feeStatus,
  canProposeFee,
  canDecideFee,
  canRespondToFee,
  isValidCounter,
} from '../../config/brokerConstants';

/* ============================================================
 *  FeeCard — the whole commission-rate handshake, one component.
 *  ----------------------------------------------------------------
 *  The negotiation is a three-move state machine shared by two
 *  actors, so the same card serves both sides and switches on
 *  `role` × `fee_status`:
 *
 *                        role=broker              role=owner
 *    not_set             propose form             waiting
 *    pending_owner_…     waiting                  approve / counter
 *    counter_proposed    accept / reject          waiting
 *    approved            agreed badge             agreed badge
 *    rejected            propose again            ended
 *
 *  Keeping it in one file is deliberate: the two views are mirror
 *  images and the rules that matter (one counter round, counter must
 *  be LOWER, rejection preserves the hold) are easier to keep honest
 *  when both halves are read together.
 *
 *  The handlers are async and their resolved value decides whether
 *  the local form closes — a rejected promise leaves the user's input
 *  in place so they can retry without retyping.
 *
 *    onPropose(percent)          broker
 *    onDecide('approve'|'counter', counterPercent)  owner
 *    onRespond('accept'|'reject')                   broker
 * ============================================================ */
export default function FeeCard({
  opportunity,
  role = 'broker',
  busy = false,
  error,
  onPropose,
  onDecide,
  onRespond,
}) {
  const { t, lang } = useTranslation();
  const status = feeStatus(opportunity);
  const isBroker = role === 'broker';

  const proposed = opportunity?.fee_percent;
  const counter = opportunity?.fee_counter_percent;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3
            className="font-display m-0 inline-flex items-center gap-2"
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            <Percent size={15} strokeWidth={1.9} />
            {t('broker.fee.title')}
          </h3>
          <p
            className="m-0 mt-1"
            style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}
          >
            {t('broker.fee.subtitle')}
          </p>
        </div>
        <Badge tone={FEE_STATUS_TONE[status] || 'default'}>
          {t(`broker.feeStatus.${status}`)}
        </Badge>
      </div>

      {/* The numbers on the table, whichever of them exist. */}
      {(proposed || counter) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Amount
            label={
              status === FEE_STATUS.APPROVED
                ? t('broker.fee.approvedLabel')
                : t('broker.fee.proposedLabel')
            }
            value={proposed}
            strong={status === FEE_STATUS.APPROVED}
            t={t}
          />
          <Amount label={t('broker.fee.counterLabel')} value={counter} t={t} />
          <Meta
            label={t('broker.fee.proposedAt')}
            value={formatDate(opportunity?.fee_proposed_at, lang)}
          />
        </div>
      )}

      {error && (
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13, color: 'var(--accent-danger)' }}
        >
          {error}
        </p>
      )}

      {/* ---------- not_set / rejected ---------- */}
      {canProposeFee(opportunity) &&
        (isBroker ? (
          <ProposeForm
            hint={
              status === FEE_STATUS.REJECTED
                ? t('broker.fee.rejectedHint')
                : t('broker.fee.notSetHint')
            }
            cta={
              status === FEE_STATUS.REJECTED
                ? t('broker.fee.repropose')
                : t('broker.fee.propose')
            }
            busy={busy}
            t={t}
            onSubmit={onPropose}
          />
        ) : (
          <Notice
            icon={status === FEE_STATUS.REJECTED ? AlertTriangle : Hourglass}
            text={
              status === FEE_STATUS.REJECTED
                ? t('broker.fee.rejectedHintOwner')
                : t('broker.fee.notSetHint')
            }
          />
        ))}

      {/* ---------- pending_owner_decision ---------- */}
      {canDecideFee(opportunity) &&
        (isBroker ? (
          <Notice icon={Hourglass} text={t('broker.fee.waitingOwner')} />
        ) : (
          <OwnerDecision
            opportunity={opportunity}
            busy={busy}
            t={t}
            onDecide={onDecide}
          />
        ))}

      {/* ---------- counter_proposed ---------- */}
      {canRespondToFee(opportunity) &&
        (isBroker ? (
          <BrokerResponse
            opportunity={opportunity}
            busy={busy}
            t={t}
            onRespond={onRespond}
          />
        ) : (
          <Notice icon={Hourglass} text={t('broker.fee.waitingBroker')} />
        ))}

      {/* ---------- approved ---------- */}
      {status === FEE_STATUS.APPROVED && (
        <Notice icon={Check} tone="success" text={t('broker.fee.approvedHint')} />
      )}
    </Card>
  );
}

/* ---------- broker: propose (or re-propose after a rejection) ---------- */
function ProposeForm({ hint, cta, busy, t, onSubmit }) {
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < FEE_PERCENT_MIN || n > FEE_PERCENT_MAX) {
      setErr(
        t('broker.fee.errors.range', {
          min: FEE_PERCENT_MIN,
          max: FEE_PERCENT_MAX,
        })
      );
      return;
    }
    setErr('');
    const ok = await onSubmit?.(n);
    if (ok !== false) setValue('');
  };

  return (
    <div className="flex flex-col gap-4">
      <Notice icon={Percent} text={hint} />
      <div className="grid grid-cols-1 sm:grid-cols-[200px,auto] gap-3 sm:items-end">
        <Field
          label={t('broker.fee.form.label')}
          type="number"
          step="0.05"
          min={FEE_PERCENT_MIN}
          max={FEE_PERCENT_MAX}
          required
          hint={t('broker.fee.form.hint', {
            min: FEE_PERCENT_MIN,
            max: FEE_PERCENT_MAX,
          })}
          error={err || undefined}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (err) setErr('');
          }}
        />
        <button
          type="button"
          className="btn-primary inline-flex items-center justify-center gap-2"
          style={{ width: 'auto', fontSize: 13.5, marginBottom: err ? 26 : 20 }}
          disabled={busy || !value}
          onClick={submit}
        >
          <Send size={15} strokeWidth={1.9} />
          {busy ? t('broker.form.saving') : cta}
        </button>
      </div>
    </div>
  );
}

/* ---------- owner: approve, or counter LOWER ---------- */
function OwnerDecision({ opportunity, busy, t, onDecide }) {
  const [mode, setMode] = useState(null); // null | 'counter'
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);

  const proposed = opportunity?.fee_percent;
  const proposedLabel = t('broker.fee.percent', { value: proposed });

  const submitCounter = async () => {
    if (!isValidCounter(value, proposed)) {
      setErr(
        Number(value) >= Number(proposed)
          ? t('broker.fee.errors.counterTooHigh')
          : t('broker.fee.errors.range', {
              min: FEE_PERCENT_MIN,
              max: FEE_PERCENT_MAX,
            })
      );
      return;
    }
    setErr('');
    const ok = await onDecide?.('counter', Number(value));
    if (ok !== false) {
      setValue('');
      setMode(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Notice
        icon={Percent}
        text={t('broker.fee.ownerDecision.body', {
          name: opportunity?.broker?.name || '',
          percent: proposedLabel,
        })}
      />

      {mode !== 'counter' ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            style={{ width: 'auto', fontSize: 13.5 }}
            disabled={busy}
            onClick={() => setConfirmApprove(true)}
          >
            <Check size={15} strokeWidth={2} />
            {t('broker.fee.ownerDecision.approve')}
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2"
            style={{ fontSize: 13 }}
            disabled={busy}
            onClick={() => setMode('counter')}
          >
            <Percent size={14} strokeWidth={1.9} />
            {t('broker.fee.ownerDecision.counter')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[200px,auto,auto] gap-3 sm:items-end">
          <Field
            label={t('broker.fee.ownerDecision.counterLabel')}
            type="number"
            step="0.05"
            min={FEE_PERCENT_MIN}
            max={FEE_PERCENT_MAX}
            required
            hint={t('broker.fee.ownerDecision.counterHint', {
              percent: proposedLabel,
            })}
            error={err || undefined}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (err) setErr('');
            }}
          />
          <button
            type="button"
            className="btn-primary inline-flex items-center justify-center gap-2"
            style={{ width: 'auto', fontSize: 13.5, marginBottom: err ? 26 : 20 }}
            disabled={busy || !value}
            onClick={submitCounter}
          >
            <Send size={15} strokeWidth={1.9} />
            {busy
              ? t('broker.form.saving')
              : t('broker.fee.ownerDecision.submitCounter')}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 13, marginBottom: err ? 26 : 20 }}
            disabled={busy}
            onClick={() => {
              setMode(null);
              setValue('');
              setErr('');
            }}
          >
            {t('broker.detail.confirmSubmit.cancel')}
          </button>
        </div>
      )}

      {/* Countering is a one-shot move — say so before it's spent. */}
      <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t('broker.fee.onlyOneRound')}
      </p>

      <ConfirmDialog
        open={confirmApprove}
        title={t('broker.fee.ownerDecision.confirmApprove.title')}
        description={t('broker.fee.ownerDecision.confirmApprove.message')}
        confirmLabel={t('broker.fee.ownerDecision.confirmApprove.confirm')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        requireReason={false}
        busy={busy}
        onClose={() => setConfirmApprove(false)}
        onConfirm={async () => {
          await onDecide?.('approve');
          setConfirmApprove(false);
        }}
      />
    </div>
  );
}

/* ---------- broker: accept or reject the counter (final) ---------- */
function BrokerResponse({ opportunity, busy, t, onRespond }) {
  const [confirmReject, setConfirmReject] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Notice
        icon={Percent}
        text={t('broker.fee.brokerResponse.body', {
          counter: t('broker.fee.percent', {
            value: opportunity?.fee_counter_percent,
          }),
          proposed: t('broker.fee.percent', { value: opportunity?.fee_percent }),
        })}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          style={{ width: 'auto', fontSize: 13.5 }}
          disabled={busy}
          onClick={() => onRespond?.('accept')}
        >
          <Check size={15} strokeWidth={2} />
          {t('broker.fee.brokerResponse.accept')}
        </button>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-2"
          style={{ fontSize: 13, color: 'var(--accent-danger)' }}
          disabled={busy}
          onClick={() => setConfirmReject(true)}
        >
          <X size={15} strokeWidth={2} />
          {t('broker.fee.brokerResponse.reject')}
        </button>
      </div>

      {/* The one thing a broker needs to know before rejecting: the
          hold survives it. */}
      <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t('broker.fee.brokerResponse.rejectHint')}
      </p>

      <ConfirmDialog
        open={confirmReject}
        title={t('broker.fee.brokerResponse.confirmReject.title')}
        description={t('broker.fee.brokerResponse.confirmReject.message')}
        confirmLabel={t('broker.fee.brokerResponse.confirmReject.confirm')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        confirmTone="danger"
        requireReason={false}
        busy={busy}
        onClose={() => setConfirmReject(false)}
        onConfirm={async () => {
          await onRespond?.('reject');
          setConfirmReject(false);
        }}
      />
    </div>
  );
}

/* ---------- small pieces ---------- */

function Amount({ label, value, strong, t }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div
      className="p-3 rounded-[11px]"
      style={{
        background: strong ? 'rgba(19,109,74,0.06)' : 'var(--bg-canvas)',
        border: `1px solid ${strong ? 'rgba(19,109,74,0.20)' : 'var(--border-soft)'}`,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      <div
        className="font-bold"
        style={{
          fontSize: 17,
          marginTop: 2,
          color: strong ? '#0d5538' : 'var(--text-ink)',
        }}
      >
        {t('broker.fee.percent', { value })}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div className="p-3">
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 13, marginTop: 3, color: 'var(--text-ink)' }}>
        {value}
      </div>
    </div>
  );
}

function Notice({ icon: Icon, text, tone }) {
  const success = tone === 'success';
  return (
    <div
      className="p-4 rounded-[12px] flex items-start gap-3"
      style={{
        background: success ? 'rgba(19,109,74,0.06)' : 'var(--bg-canvas)',
        border: `1px solid ${
          success ? 'rgba(19,109,74,0.18)' : 'var(--border-soft)'
        }`,
      }}
    >
      {Icon && (
        <Icon
          size={16}
          strokeWidth={1.8}
          style={{
            color: success ? '#136d4a' : 'var(--text-muted)',
            flexShrink: 0,
            marginTop: 2,
          }}
        />
      )}
      <p
        className="m-0"
        style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-ink-soft)' }}
      >
        {text}
      </p>
    </div>
  );
}
