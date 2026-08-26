import React, { useState } from 'react';
import {
  Mail,
  Link2,
  Copy,
  Check,
  UserPlus,
  CalendarClock,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, Badge, ConfirmDialog } from '../admin/AdminUI';
import Field from '../form/Field';
import TextareaField from '../form/TextareaField';
import Ltr from '../Ltr';
import { useTranslation } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/date';
import {
  INVITATION_STATUS_TONE,
  INVITATION_VALID_DAYS,
  canCreateInvitation,
  canCancelInvitation,
  isInvitationAccepted,
  invitationUrl,
} from '../../config/brokerConstants';

/* ============================================================
 *  InvitationCard — Method D, the copy-and-send invitation.
 *  ----------------------------------------------------------------
 *  Per the COO there is deliberately no automation here: the platform
 *  mints a link, the broker copies it and sends it over whatever
 *  channel they already use with that owner. So the card's real job
 *  is making the link impossible to miss and saying plainly that
 *  nothing is sent on the broker's behalf.
 *
 *  One invitation per opportunity. A pending one has to be cancelled
 *  before a new one can be minted; an expired or cancelled one is
 *  replaced silently by the BE; an accepted one is permanent.
 *
 *  `invitation` comes straight off the opportunity resource, which
 *  carries the token on every broker read path — so the link survives
 *  a reload and doesn't have to be held from the create response.
 * ============================================================ */
export default function InvitationCard({
  invitation,
  busy = false,
  error,
  onCreate,
  onCancel,
}) {
  const { t, lang } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const accepted = isInvitationAccepted(invitation);
  const canCreate = canCreateInvitation(invitation);
  const canCancel = canCancelInvitation(invitation);
  const url = invitationUrl(invitation);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3
            className="font-display m-0 inline-flex items-center gap-2"
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-ink)' }}
          >
            <UserPlus size={15} strokeWidth={1.9} />
            {t('broker.invite.title')}
          </h3>
          <p
            className="m-0 mt-1"
            style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}
          >
            {t('broker.invite.subtitle')}
          </p>
        </div>
        {invitation?.status && (
          <Badge tone={INVITATION_STATUS_TONE[invitation.status] || 'default'}>
            {t(`broker.invitationStatus.${invitation.status}`)}
          </Badge>
        )}
      </div>

      {error && (
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13, color: 'var(--accent-danger)' }}
        >
          {error}
        </p>
      )}

      {/* ---------- accepted: the flow has moved on ---------- */}
      {accepted && (
        <div
          className="p-4 rounded-[12px] flex items-start gap-3"
          style={{
            background: 'rgba(19,109,74,0.06)',
            border: '1px solid rgba(19,109,74,0.18)',
          }}
        >
          <CheckCircle2
            size={17}
            strokeWidth={1.8}
            style={{ color: '#136d4a', flexShrink: 0, marginTop: 1 }}
          />
          <div>
            <div
              style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-ink)' }}
            >
              {t('broker.invite.accepted.title')}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-ink-soft)',
                marginTop: 3,
                lineHeight: 1.7,
              }}
            >
              {t('broker.invite.accepted.body')}
            </div>
            {invitation?.accepted_at && (
              <div
                style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}
              >
                {t('broker.invite.accepted.at')}:{' '}
                {formatDate(invitation.accepted_at, lang)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- pending: the link the broker sends by hand ---------- */}
      {!accepted && invitation && !canCreate && (
        <div className="flex flex-col gap-4">
          <InviteeSummary invitation={invitation} t={t} />

          {url && (
            <div>
              <div
                className="font-semibold uppercase mb-2"
                style={{
                  fontSize: 10.5,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                }}
              >
                {t('broker.invite.link.label')}
              </div>
              <LinkRow url={url} t={t} />
              <p
                className="m-0 mt-2"
                style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}
              >
                {t('broker.invite.link.hint')}
              </p>
            </div>
          )}

          {invitation.expires_at && (
            <div
              className="inline-flex items-center gap-2 self-start"
              style={{ fontSize: 12.5, color: '#b8862a', fontWeight: 600 }}
            >
              <CalendarClock size={14} strokeWidth={1.9} />
              {t('broker.invite.link.expires', {
                date: formatDate(invitation.expires_at, lang),
              })}
            </div>
          )}

          {canCancel && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2"
                style={{ fontSize: 13, color: 'var(--accent-danger)', padding: 0 }}
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
              >
                <XCircle size={15} strokeWidth={1.9} />
                {t('broker.invite.cancel')}
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('broker.invite.oneOnly')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ---------- nothing live: mint one ---------- */}
      {!accepted && canCreate && (
        <div className="flex flex-col gap-4">
          <p
            className="m-0"
            style={{ fontSize: 13, color: 'var(--text-ink-soft)', lineHeight: 1.75 }}
          >
            {invitation
              ? t('broker.invite.expiredHint')
              : t('broker.invite.none')}
          </p>

          {formOpen ? (
            <InviteForm
              busy={busy}
              t={t}
              onCancel={() => setFormOpen(false)}
              onSubmit={async (payload) => {
                const ok = await onCreate?.(payload);
                if (ok !== false) setFormOpen(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 self-start"
              style={{ width: 'auto', fontSize: 13.5 }}
              onClick={() => setFormOpen(true)}
            >
              <Mail size={15} strokeWidth={1.9} />
              {invitation
                ? t('broker.invite.recreate')
                : t('broker.invite.create')}
            </button>
          )}

          <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('broker.invite.link.validDays', { days: INVITATION_VALID_DAYS })}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title={t('broker.invite.cancelConfirm.title')}
        description={t('broker.invite.cancelConfirm.message')}
        confirmLabel={t('broker.invite.cancelConfirm.confirm')}
        cancelLabel={t('broker.detail.confirmSubmit.cancel')}
        confirmTone="danger"
        requireReason={false}
        busy={busy}
        onClose={() => setConfirmCancel(false)}
        onConfirm={async () => {
          await onCancel?.();
          setConfirmCancel(false);
        }}
      />
    </Card>
  );
}

/* ---------- the link + a copy button that actually confirms ---------- */
function LinkRow({ url, t }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / denied permission). The
      // URL is in a selectable input, so the broker can still copy it
      // by hand — no error state needed.
    }
  };

  return (
    <div className="flex items-stretch gap-2 flex-wrap">
      <input
        readOnly
        dir="ltr"
        value={url}
        onFocus={(e) => e.target.select()}
        className="field field-no-icon"
        style={{
          flex: '1 1 240px',
          minWidth: 0,
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 12.5,
          textAlign: 'start',
        }}
      />
      <button
        type="button"
        className="btn-secondary inline-flex items-center justify-center gap-2"
        style={{ width: 'auto', padding: '10px 16px', fontSize: 13 }}
        onClick={copy}
      >
        {copied ? (
          <Check size={15} strokeWidth={2.2} />
        ) : (
          <Copy size={15} strokeWidth={1.9} />
        )}
        {copied ? t('broker.invite.link.copied') : t('broker.invite.link.copy')}
      </button>
    </div>
  );
}

function InviteeSummary({ invitation, t }) {
  return (
    <div
      className="p-4 rounded-[12px]"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {t('broker.invite.invitee')}
      </div>
      <div
        className="font-semibold"
        style={{ fontSize: 14, color: 'var(--text-ink)', marginTop: 1 }}
      >
        {invitation.invitee_name}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--text-ink-soft)',
          marginTop: 4,
          lineHeight: 1.8,
        }}
      >
        {invitation.invitee_phone && (
          <div>
            <Ltr>{invitation.invitee_phone}</Ltr>
          </div>
        )}
        {invitation.invitee_email && (
          <div>
            <Ltr>{invitation.invitee_email}</Ltr>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteForm({ busy, t, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    invitee_name: '',
    invitee_phone: '',
    invitee_email: '',
    invitee_notes: '',
  });
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div
      className="p-5 rounded-[14px] flex flex-col gap-4"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div
        className="font-semibold"
        style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
      >
        {t('broker.invite.form.title')}
      </div>

      <Field
        label={t('broker.invite.form.name')}
        placeholder={t('broker.invite.form.namePlaceholder')}
        required
        value={form.invitee_name}
        onChange={(e) => set('invitee_name', e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={t('broker.invite.form.phone')}
          placeholder="+9665XXXXXXXX"
          required={false}
          value={form.invitee_phone}
          onChange={(e) => set('invitee_phone', e.target.value)}
        />
        <Field
          label={t('broker.invite.form.email')}
          type="email"
          required={false}
          value={form.invitee_email}
          onChange={(e) => set('invitee_email', e.target.value)}
        />
      </div>
      <TextareaField
        label={t('broker.invite.form.notes')}
        rows={3}
        required={false}
        placeholder={t('broker.invite.form.notesPlaceholder')}
        value={form.invitee_notes}
        onChange={(e) => set('invitee_notes', e.target.value)}
      />
      <p className="m-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t('broker.invite.form.notesHint')}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          style={{ width: 'auto', fontSize: 13.5 }}
          disabled={busy || !form.invitee_name.trim()}
          onClick={() =>
            onSubmit({ ...form, invitee_name: form.invitee_name.trim() })
          }
        >
          <Link2 size={15} strokeWidth={1.9} />
          {busy ? t('broker.form.saving') : t('broker.invite.form.submit')}
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 13 }}
          disabled={busy}
          onClick={onCancel}
        >
          {t('broker.detail.confirmSubmit.cancel')}
        </button>
      </div>
    </div>
  );
}
