import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  ShieldOff,
  ShieldCheck,
  Phone,
  KeyRound,
  Activity as ActivityIcon,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { admin } from '../../services';
import { useTranslation } from '../../i18n/LanguageContext';
import IdentifierChip from '../../components/IdentifierChip';
import {
  PageHeader,
  Card,
  Badge,
  Modal,
  ConfirmDialog,
} from '../../components/admin/AdminUI';

/* ============================================================
 *  AdminUserDetailPage — /admin/users/:id
 *
 *  Shows the user's profile + 4 moderation actions:
 *    1. Edit profile (name / email / city / account_type)
 *    2. Suspend / Unsuspend  (reason required for suspend)
 *    3. Force verify phone
 *    4. Force password reset → new password shown ONCE
 *
 *  Each action has its own modal so the admin sees the exact
 *  consequence and reason text before confirming.
 * ============================================================ */

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state — only one open at a time.
  const [openModal, setOpenModal] = useState(null); // 'edit' | 'suspend' | 'unsuspend' | 'forceVerify' | 'forceReset' | null
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Edit form state — initialized from the loaded user.
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    city: '',
    account_type: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.users.get(id);
      const u = res?.user ?? res;
      setUser(u);
      setEditForm({
        name: u?.name || '',
        email: u?.email || '',
        city: u?.city || '',
        account_type: u?.account_type || '',
      });
    } catch (err) {
      setError(err.message || t('admin.common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const closeModal = () => {
    if (busy) return;
    setOpenModal(null);
    setReason('');
    setActionError('');
    setNewPassword('');
    setCopied(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleEdit = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.users.update(id, editForm);
      showToast(t('admin.users.detail.edit.saved'));
      closeModal();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleSuspend = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.users.suspend(id, reason);
      showToast(t('admin.users.detail.suspend.done'));
      closeModal();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleUnsuspend = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.users.unsuspend(id);
      showToast(t('admin.users.detail.unsuspend.done'));
      closeModal();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleForceVerify = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.users.forceVerifyPhone(id);
      showToast(t('admin.users.detail.forceVerify.done'));
      closeModal();
      load();
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleForceReset = async () => {
    setBusy(true);
    setActionError('');
    try {
      const res = await admin.users.forcePasswordReset(id);
      // Show the password inside the modal — DO NOT auto-close.
      // The admin must copy it before navigating away.
      setNewPassword(res?.new_password || '');
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const handleForceDelete = async () => {
    setBusy(true);
    setActionError('');
    try {
      await admin.users.forceDelete(id, reason);
      // The user row is gone — there's nothing left to reload on this page,
      // so return to the list where the user no longer appears.
      navigate('/admin/users');
    } catch (err) {
      setActionError(err.message || t('admin.common.actionError'));
      setBusy(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — user can still select the text manually
    }
  };

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-4xl mx-auto">
        <div className="shimmer" style={{ height: 24, width: 220, borderRadius: 8 }} />
        <div
          className="shimmer mt-4"
          style={{ height: 140, width: '100%', borderRadius: 14 }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-4xl mx-auto">
        <Card>
          <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>
            {error || t('admin.common.loadError')}
          </div>
          <button
            type="button"
            className="btn-secondary mt-4"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => navigate('/admin/users')}
          >
            <ArrowLeft size={14} />
            {t('admin.common.back')}
          </button>
        </Card>
      </div>
    );
  }

  const isSuspended = !!user.suspended_at;
  const fmt = (s) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="px-5 lg:px-8 py-7 max-w-5xl mx-auto">
      <button
        type="button"
        className="btn-ghost mb-4"
        style={{ padding: 0 }}
        onClick={() => navigate('/admin/users')}
      >
        <ArrowLeft size={15} />
        <span style={{ fontSize: 13.5 }}>{t('admin.common.back')}</span>
      </button>

      <PageHeader
        eyebrow={t('admin.users.detail.title')}
        title={user.name || '—'}
        subtitle={`#${user.id} · ${user.email || '—'}`}
        actions={
          <Badge tone={isSuspended ? 'danger' : 'success'}>
            {isSuspended ? t('admin.users.status.suspended') : t('admin.users.status.active')}
          </Badge>
        }
      />

      {user.identifier && (
        <div className="mb-4">
          <IdentifierChip
            identifier={user.identifier}
            label={t('identifier.label')}
          />
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-display m-0 mb-4" style={{ fontSize: 16, fontWeight: 700 }}>
              {t('admin.users.detail.title')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <Field label={t('admin.users.detail.fields.name')} value={user.name} />
              <Field label={t('admin.users.detail.fields.email')} value={user.email} />
              <Field label={t('admin.users.detail.fields.phone')} value={user.phone} />
              <Field label={t('admin.users.detail.fields.city')} value={user.city} />
              <Field
                label={t('admin.users.detail.fields.accountType')}
                value={user.account_type ? t(`accountType.${user.account_type}`) : null}
              />
              <Field
                label={t('admin.users.detail.fields.specialty')}
                value={user.specialty}
              />
              <Field
                label={t('admin.users.detail.fields.phoneVerified')}
                value={
                  <Badge tone={user.is_phone_verified ? 'success' : 'warning'}>
                    {user.is_phone_verified
                      ? t('admin.users.status.verified')
                      : t('admin.users.status.unverified')}
                  </Badge>
                }
              />
              <Field
                label={t('admin.users.detail.fields.createdAt')}
                value={fmt(user.created_at)}
              />
              {isSuspended && (
                <>
                  <Field
                    label={t('admin.users.detail.fields.suspendedAt')}
                    value={fmt(user.suspended_at)}
                  />
                  <Field
                    label={t('admin.users.detail.fields.suspendedReason')}
                    value={user.suspended_reason}
                    span={2}
                  />
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div>
          <Card>
            <h3 className="font-display m-0 mb-4" style={{ fontSize: 16, fontWeight: 700 }}>
              {t('admin.users.columns.actions')}
            </h3>
            <div className="flex flex-col gap-2">
              <ActionButton
                icon={Edit3}
                label={t('admin.users.detail.actions.edit')}
                onClick={() => setOpenModal('edit')}
              />
              {isSuspended ? (
                <ActionButton
                  icon={ShieldCheck}
                  tone="success"
                  label={t('admin.users.detail.actions.unsuspend')}
                  onClick={() => setOpenModal('unsuspend')}
                />
              ) : (
                <ActionButton
                  icon={ShieldOff}
                  tone="danger"
                  label={t('admin.users.detail.actions.suspend')}
                  onClick={() => setOpenModal('suspend')}
                />
              )}
              {!user.is_phone_verified && (
                <ActionButton
                  icon={Phone}
                  label={t('admin.users.detail.actions.forceVerify')}
                  onClick={() => setOpenModal('forceVerify')}
                />
              )}
              <ActionButton
                icon={KeyRound}
                label={t('admin.users.detail.actions.forceReset')}
                onClick={() => setOpenModal('forceReset')}
              />
              <ActionButton
                icon={ActivityIcon}
                label={t('admin.users.detail.actions.viewActivity')}
                onClick={() => navigate(`/admin/activity?target_type=User&target_id=${user.id}`)}
              />
              <ActionButton
                icon={Trash2}
                tone="danger"
                label={t('admin.users.detail.actions.forceDelete')}
                onClick={() => setOpenModal('forceDelete')}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* ---------- Edit modal ---------- */}
      <Modal
        open={openModal === 'edit'}
        onClose={closeModal}
        title={t('admin.users.detail.edit.title')}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={closeModal}
              disabled={busy}
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={handleEdit}
              disabled={busy}
            >
              {busy ? '…' : t('admin.users.detail.edit.save')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="field-label">{t('admin.users.detail.fields.name')}</label>
            <input
              className="field field-no-icon"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">{t('admin.users.detail.fields.email')}</label>
            <input
              type="email"
              className="field field-no-icon"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">{t('admin.users.detail.fields.city')}</label>
            <input
              className="field field-no-icon"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">
              {t('admin.users.detail.fields.accountType')}
            </label>
            <select
              className="field"
              value={editForm.account_type}
              onChange={(e) =>
                setEditForm({ ...editForm, account_type: e.target.value })
              }
            >
              {['individual', 'entrepreneur', 'engineering', 'developer', 'supplier'].map(
                (tp) => (
                  <option key={tp} value={tp}>
                    {t(`accountType.${tp}`)}
                  </option>
                )
              )}
            </select>
          </div>
          {actionError && (
            <div
              className="p-3 rounded-[10px]"
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
        </div>
      </Modal>

      {/* ---------- Suspend modal ---------- */}
      <ConfirmDialog
        open={openModal === 'suspend'}
        onClose={closeModal}
        onConfirm={handleSuspend}
        title={t('admin.users.detail.suspend.title')}
        description={t('admin.users.detail.suspend.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.users.detail.suspend.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />

      {/* ---------- Unsuspend modal (no reason) ---------- */}
      <ConfirmDialog
        open={openModal === 'unsuspend'}
        onClose={closeModal}
        onConfirm={handleUnsuspend}
        title={t('admin.users.detail.unsuspend.title')}
        description={t('admin.users.detail.unsuspend.description')}
        reason=""
        setReason={() => {}}
        confirmLabel={t('admin.users.detail.unsuspend.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="primary"
        requireReason={false}
        busy={busy}
        error={actionError}
      />

      {/* ---------- Force verify modal (no reason) ---------- */}
      <ConfirmDialog
        open={openModal === 'forceVerify'}
        onClose={closeModal}
        onConfirm={handleForceVerify}
        title={t('admin.users.detail.forceVerify.title')}
        description={t('admin.users.detail.forceVerify.description')}
        reason=""
        setReason={() => {}}
        confirmLabel={t('admin.users.detail.forceVerify.confirm')}
        cancelLabel={t('admin.common.cancel')}
        requireReason={false}
        busy={busy}
        error={actionError}
      />

      {/* ---------- Force delete modal (irreversible, reason required) ---------- */}
      <ConfirmDialog
        open={openModal === 'forceDelete'}
        onClose={closeModal}
        onConfirm={handleForceDelete}
        title={t('admin.users.detail.forceDelete.title')}
        description={t('admin.users.detail.forceDelete.description')}
        reason={reason}
        setReason={setReason}
        reasonLabel={t('admin.common.reasonLabel')}
        reasonPlaceholder={t('admin.common.reasonPlaceholder')}
        confirmLabel={t('admin.users.detail.forceDelete.confirm')}
        cancelLabel={t('admin.common.cancel')}
        confirmTone="danger"
        busy={busy}
        error={actionError}
      />

      {/* ---------- Force password reset modal ----------
          Custom flow because the BE returns the new password ONCE.
          We show it inline and require the admin to dismiss. */}
      <Modal
        open={openModal === 'forceReset'}
        onClose={closeModal}
        title={t('admin.users.detail.forceReset.title')}
        footer={
          newPassword ? (
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
              onClick={closeModal}
              disabled={busy}
            >
              {t('admin.common.close')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 18px' }}
                onClick={closeModal}
                disabled={busy}
              >
                {t('admin.common.cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 18px' }}
                onClick={handleForceReset}
                disabled={busy}
              >
                {busy ? '…' : t('admin.users.detail.forceReset.confirm')}
              </button>
            </>
          )
        }
      >
        <p
          className="m-0 mb-4"
          style={{ fontSize: 13.5, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}
        >
          {t('admin.users.detail.forceReset.description')}
        </p>
        {newPassword ? (
          <div>
            <label className="field-label">
              {t('admin.users.detail.forceReset.newPasswordLabel')}
            </label>
            <div className="flex gap-2">
              <input
                className="field field-no-icon"
                readOnly
                value={newPassword}
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  fontSize: 14,
                }}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '12px 14px', flexShrink: 0 }}
                onClick={copyPassword}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? t('admin.common.copied') : t('admin.common.copy')}
              </button>
            </div>
            <div
              className="mt-3 p-3 rounded-[10px]"
              style={{
                background: 'rgba(184,134,42,0.10)',
                border: '1px solid rgba(184,134,42,0.22)',
                color: '#9a701f',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {t('admin.users.detail.forceReset.done')}
            </div>
          </div>
        ) : actionError ? (
          <div
            className="p-3 rounded-[10px]"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}
          >
            {actionError}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Field({ label, value, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-ink)', wordBreak: 'break-word' }}>
        {value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone = 'neutral' }) {
  const color =
    tone === 'danger'
      ? 'var(--accent-danger)'
      : tone === 'success'
      ? '#136d4a'
      : 'var(--text-ink-soft)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 text-start"
      style={{
        padding: '11px 14px',
        background: 'transparent',
        border: '1px solid var(--border-default)',
        borderRadius: 11,
        cursor: 'pointer',
        color,
        fontSize: 13.5,
        fontWeight: 500,
        fontFamily: 'inherit',
        transition: 'background 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-canvas)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <Icon size={15} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}
