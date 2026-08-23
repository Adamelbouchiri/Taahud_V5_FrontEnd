import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  XCircle,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  HardHat,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import { brokers, readHoldConflict } from '../../services/brokers';
import { useTranslation } from '../../i18n/LanguageContext';
import Ltr from '../../components/Ltr';
import Field from '../../components/form/Field';
import TextareaField from '../../components/form/TextareaField';
import {
  PageHeader,
  Card,
  Badge,
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';
import {
  OPPORTUNITY_STATUS_TONE,
  PARTY_ROLE,
  canEditOpportunity,
  canManageParties,
  canSubmitOpportunity,
  canCancelOpportunity,
} from '../../config/brokerConstants';
import { formatDate } from '../../utils/date';

/* ============================================================
 *  OpportunityDetailPage — /broker/opportunities/:id
 *  ----------------------------------------------------------------
 *  Everything the broker can do to one opportunity lives here:
 *  refine the title/description, add or replace the executor,
 *  submit for review, cancel.
 *
 *  What's editable is driven entirely by `status` through the
 *  helpers in brokerConstants — a submitted opportunity is frozen,
 *  because the owner identity is what the duplicate check and the
 *  90-day hold are pinned to.
 *
 *  The one flow worth reading carefully is submit(): a 422 carrying
 *  `conflict.held_until` means another broker already holds this
 *  owner's national_id. The BE deliberately does NOT say which
 *  broker — only when the hold lapses — so the modal shows just
 *  that date.
 * ============================================================ */
export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [conflict, setConflict] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [removeParty, setRemoveParty] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    brokers.opportunities
      .get(id)
      .then((res) => {
        setOpp(res);
        setError('');
      })
      .catch((err) => setError(err.message || t('broker.detail.loadError')))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(load, [load]);

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="shimmer"
            style={{ height: 140, width: '100%', borderRadius: 12 }}
          />
        ))}
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {error || t('broker.detail.loadError')}
          </p>
        </Card>
      </div>
    );
  }

  const owner = (opp.parties || []).find((p) => p.role === PARTY_ROLE.OWNER);
  const executor = (opp.parties || []).find((p) => p.role === PARTY_ROLE.EXECUTOR);
  const tone = OPPORTUNITY_STATUS_TONE[opp.status] || 'default';

  const runAction = async (fn) => {
    setBusy(true);
    setActionError('');
    try {
      await fn();
      load();
      return true;
    } catch (err) {
      // A duplicate hold gets its own modal rather than an inline error.
      const held = readHoldConflict(err);
      if (held) {
        setConflict(held);
      } else {
        setActionError(err.message || t('broker.detail.actionError'));
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/broker/opportunities')}
        className="btn-ghost inline-flex items-center gap-2 self-start"
        style={{ padding: 0, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        {t('broker.form.back')}
      </button>

      <PageHeader
        eyebrow={opp.reference}
        title={opp.title}
        subtitle={opp.description || undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canEditOpportunity(opp.status) && (
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2"
                onClick={() => setEditOpen(true)}
                style={{ fontSize: 13 }}
              >
                <Pencil size={15} strokeWidth={1.8} />
                {t('broker.detail.actions.edit')}
              </button>
            )}
            {canSubmitOpportunity(opp.status) && (
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2"
                onClick={() => setConfirmSubmit(true)}
                disabled={busy}
                style={{ fontSize: 13 }}
              >
                <Send size={15} strokeWidth={1.8} />
                {t('broker.detail.actions.submit')}
              </button>
            )}
            {canCancelOpportunity(opp.status) && (
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2"
                onClick={() => setCancelOpen(true)}
                disabled={busy}
                style={{ fontSize: 13, color: 'var(--accent-danger)' }}
              >
                <XCircle size={15} strokeWidth={1.8} />
                {t('broker.detail.actions.cancel')}
              </button>
            )}
          </div>
        }
      />

      {actionError && (
        <Card>
          <p className="m-0" style={{ fontSize: 13.5, color: 'var(--accent-danger)' }}>
            {actionError}
          </p>
        </Card>
      )}

      {/* ---------- Status + timeline ---------- */}
      <Card>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Badge tone={tone}>{t(`broker.opportunityStatus.${opp.status}`)}</Badge>
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
          <Meta label={t('broker.detail.createdAt')} value={formatDate(opp.created_at, lang)} />
          <Meta label={t('broker.detail.submittedAt')} value={formatDate(opp.submitted_at, lang)} />
          <Meta label={t('broker.detail.reviewedAt')} value={formatDate(opp.reviewed_at, lang)} />
          <Meta label={t('broker.detail.cancelledAt')} value={formatDate(opp.cancelled_at, lang)} />
        </div>

        {/* The hold is the whole point of an approved opportunity —
            give it its own callout rather than a metadata row. */}
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
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-ink)' }}>
                {t('broker.detail.hold.title', { date: formatDate(opp.held_until, lang) })}
              </div>
              <div
                style={{ fontSize: 12.5, color: 'var(--text-ink-soft)', marginTop: 3, lineHeight: 1.7 }}
              >
                {t('broker.detail.hold.body')}
              </div>
            </div>
          </div>
        )}

        {opp.rejection_reason && (
          <Callout
            tone="danger"
            label={t('broker.detail.rejectionReason')}
            text={opp.rejection_reason}
          />
        )}
        {opp.cancellation_reason && (
          <Callout
            tone="muted"
            label={t('broker.detail.cancellationReason')}
            text={opp.cancellation_reason}
          />
        )}
        {opp.admin_notes && (
          <Callout
            tone="muted"
            label={t('broker.detail.adminNotes')}
            text={opp.admin_notes}
          />
        )}
      </Card>

      {/* ---------- Parties ---------- */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-display m-0" style={{ fontSize: 15, fontWeight: 700 }}>
            {t('broker.detail.parties')}
          </h3>
          {canManageParties(opp.status) && !executor && (
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2"
              onClick={() => setPartyOpen(true)}
              style={{ padding: 0, fontSize: 12.5 }}
            >
              <Plus size={14} strokeWidth={2} />
              {t('broker.detail.addExecutor')}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <PartyCard
            party={owner}
            role={PARTY_ROLE.OWNER}
            t={t}
            editable={canManageParties(opp.status)}
            onEdit={() => setPartyOpen(PARTY_ROLE.OWNER)}
          />
          {executor ? (
            <PartyCard
              party={executor}
              role={PARTY_ROLE.EXECUTOR}
              t={t}
              editable={canManageParties(opp.status)}
              onEdit={() => setPartyOpen(PARTY_ROLE.EXECUTOR)}
              onRemove={() => setRemoveParty(executor)}
            />
          ) : (
            <p className="m-0" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('broker.detail.noExecutor')}
            </p>
          )}
        </div>
      </Card>

      {/* ---------- Edit title / description ---------- */}
      <EditModal
        open={editOpen}
        opportunity={opp}
        busy={busy}
        t={t}
        onClose={() => setEditOpen(false)}
        onSave={async (payload) => {
          const ok = await runAction(() =>
            brokers.opportunities.update(opp.id, payload)
          );
          if (ok) setEditOpen(false);
        }}
      />

      {/* ---------- Add / replace a party ---------- */}
      <PartyModal
        open={Boolean(partyOpen)}
        role={partyOpen === PARTY_ROLE.OWNER ? PARTY_ROLE.OWNER : PARTY_ROLE.EXECUTOR}
        existing={partyOpen === PARTY_ROLE.OWNER ? owner : executor}
        busy={busy}
        t={t}
        onClose={() => setPartyOpen(false)}
        onSave={async (payload) => {
          const ok = await runAction(() =>
            brokers.opportunities.addParty(opp.id, payload)
          );
          if (ok) setPartyOpen(false);
        }}
      />

      {/* ---------- Submit for review ----------
          No reason needed, but it IS the point of no return: parties
          freeze and the duplicate check runs. */}
      <ConfirmDialog
        open={confirmSubmit}
        title={t('broker.detail.confirmSubmit.title')}
        description={t('broker.detail.confirmSubmit.message')}
        confirmLabel={t('broker.detail.actions.submit')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        requireReason={false}
        busy={busy}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={async () => {
          await runAction(() => brokers.opportunities.submit(opp.id));
          setConfirmSubmit(false);
        }}
      />

      {/* ---------- Cancel with a reason ---------- */}
      <ConfirmDialog
        open={cancelOpen}
        title={t('broker.detail.cancelModal.title')}
        description={t('broker.detail.cancelModal.description')}
        reason={cancelReason}
        setReason={setCancelReason}
        reasonLabel={t('broker.detail.cancelModal.label')}
        reasonPlaceholder={t('broker.detail.cancelModal.placeholder')}
        confirmLabel={t('broker.detail.actions.cancel')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        confirmTone="danger"
        busy={busy}
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          const ok = await runAction(() =>
            brokers.opportunities.cancel(opp.id, cancelReason.trim())
          );
          if (ok) {
            setCancelOpen(false);
            setCancelReason('');
          }
        }}
      />

      {/* ---------- Remove executor ---------- */}
      <ConfirmDialog
        open={Boolean(removeParty)}
        title={t('broker.detail.confirmRemoveParty.title')}
        description={t('broker.detail.confirmRemoveParty.message')}
        confirmLabel={t('broker.detail.confirmRemoveParty.confirm')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        confirmTone="danger"
        requireReason={false}
        busy={busy}
        onClose={() => setRemoveParty(null)}
        onConfirm={async () => {
          await runAction(() =>
            brokers.opportunities.removeParty(opp.id, removeParty.id)
          );
          setRemoveParty(null);
        }}
      />

      {/* ---------- Duplicate hold ---------- */}
      <Modal
        open={Boolean(conflict)}
        onClose={() => setConflict(null)}
        title={t('broker.detail.conflict.title')}
        width={440}
        footer={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setConflict(null)}
            style={{ fontSize: 13.5 }}
          >
            {t('broker.detail.conflict.ok')}
          </button>
        }
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={20}
            strokeWidth={1.7}
            style={{ color: '#b8862a', flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p
              className="m-0"
              style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-ink)' }}
            >
              {t('broker.detail.conflict.message')}
            </p>
            {conflict?.heldUntil && (
              <p
                className="m-0"
                style={{ fontSize: 13, marginTop: 10, color: 'var(--text-ink-soft)' }}
              >
                {t('broker.detail.conflict.heldUntil', {
                  date: formatDate(conflict.heldUntil, lang),
                })}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- small pieces ---------- */

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)' }}>{value}</div>
    </div>
  );
}

function Callout({ tone, label, text }) {
  const danger = tone === 'danger';
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
      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-ink)' }}>
        {text}
      </div>
    </div>
  );
}

function PartyCard({ party, role, t, editable, onEdit, onRemove }) {
  if (!party) return null;
  const isOwner = role === PARTY_ROLE.OWNER;
  const Icon = isOwner ? UserRound : HardHat;

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
            style={{ fontSize: 12.5, color: 'var(--text-ink-soft)', marginTop: 4, lineHeight: 1.8 }}
          >
            {party.national_id && (
              <div>
                {t('broker.form.nationalId')}: {party.national_id}
              </div>
            )}
            {party.phone && <div><Ltr>{party.phone}</Ltr></div>}
            {party.email && <div><Ltr>{party.email}</Ltr></div>}
            {party.notes && (
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{party.notes}</div>
            )}
          </div>
        </div>

        {editable && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="btn-ghost"
              style={{ padding: 6 }}
              aria-label={t('broker.detail.actions.edit')}
            >
              <Pencil size={14} strokeWidth={1.8} />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="btn-ghost"
                style={{ padding: 6, color: 'var(--accent-danger)' }}
                aria-label={t('broker.detail.confirmRemoveParty.confirm')}
              >
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({ open, opportunity, busy, t, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(opportunity.title || '');
      setDescription(opportunity.description || '');
    }
  }, [open, opportunity]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('broker.detail.editModal.title')}
      width={520}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} style={{ fontSize: 13.5 }}>
            {t('broker.detail.confirmSubmit.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !title.trim()}
            onClick={() => onSave({ title: title.trim(), description })}
            style={{ fontSize: 13.5 }}
          >
            {busy ? t('broker.form.saving') : t('broker.detail.editModal.save')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label={t('broker.form.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <TextareaField
          label={t('broker.form.description')}
          rows={4}
          required={false}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function PartyModal({ open, role, existing, busy, t, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    national_id: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: existing?.name || '',
      national_id: existing?.national_id || '',
      phone: existing?.phone || '',
      email: existing?.email || '',
      notes: existing?.notes || '',
    });
  }, [open, existing]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        role === PARTY_ROLE.OWNER
          ? t('broker.detail.partyModal.ownerTitle')
          : t('broker.detail.partyModal.executorTitle')
      }
      width={520}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} style={{ fontSize: 13.5 }}>
            {t('broker.detail.confirmSubmit.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !form.name.trim()}
            onClick={() => onSave({ role, ...form, name: form.name.trim() })}
            style={{ fontSize: 13.5 }}
          >
            {busy ? t('broker.form.saving') : t('broker.detail.editModal.save')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Posting a role that already exists REPLACES it — say so. */}
        {existing && (
          <p
            className="m-0"
            style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}
          >
            {t('broker.detail.partyModal.replaceHint')}
          </p>
        )}
        <Field
          label={t('broker.form.ownerName')}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
        />
        <Field
          label={t('broker.form.nationalId')}
          hint={t('broker.form.nationalIdHint')}
          required={false}
          value={form.national_id}
          onChange={(e) => set('national_id', e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t('broker.form.phone')}
            placeholder="+9665XXXXXXXX"
            required={false}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <Field
            label={t('broker.form.email')}
            type="email"
            required={false}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
        <TextareaField
          label={t('broker.form.notes')}
          rows={3}
          required={false}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  );
}

/* Cancel/remove prompts use AdminUI's ConfirmDialog, which already
   enforces the 10-character minimum the admin API expects on a
   reason — no bespoke reason modal needed here. */
