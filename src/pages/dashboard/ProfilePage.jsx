import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Pencil,
  Check,
  X,
  KeyRound,
  LogOut,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  Building2,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import {
  hasSpecialty,
  CITIES,
} from '../../config/constants';
import { auth } from '../../services';
import Field from '../../components/form/Field';
import SelectField from '../../components/form/SelectField';
import PasswordField from '../../components/form/PasswordField';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  ProfilePage — /dashboard/profile
 * ============================================================ */

export default function ProfilePage() {
  const { user, loading, refresh, logout } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);

  if (loading) return <ProfileSkeleton />;

  if (!user) {
    return (
      <div className="px-5 lg:px-8 py-12 text-center">
        <p
          className="m-0 mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('dashboard.profile.notLoaded')}
        </p>
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold"
          style={{
            background: 'var(--bg-ink-deep)',
            border: '1px solid #0f1147',
            cursor: 'pointer',
            fontSize: 13.5,
          }}
        >
          {t('dashboard.profile.goLogin')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px]">
      <PageHeader />
      <IdentityCard user={user} />
      <AccountInfoCard
        user={user}
        editing={editing}
        onEnterEdit={() => setEditing(true)}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await refresh();
        }}
      />
      <SecurityCard onLogout={logout} navigate={navigate} />
    </div>
  );
}

/* ============================================================
 *  Page header
 * ============================================================ */
function PageHeader() {
  const { t } = useTranslation();
  return (
    <div className="mb-8 lg:mb-10 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(44,47,124,0.08)',
          color: 'var(--text-brand-deep)',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <UserCircle size={12} />
        {t('dashboard.profile.eyebrow')}
      </div>
      <h1
        className="font-display m-0 mb-2"
        style={{
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          color: 'var(--text-ink)',
        }}
      >
        {t('dashboard.profile.title')}
      </h1>
      <p
        className="m-0"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}
      >
        {t('dashboard.profile.subtitle')}
      </p>
    </div>
  );
}

/* ============================================================
 *  Identity card
 * ============================================================ */
function IdentityCard({ user }) {
  const { t } = useTranslation();
  const initial = (user.name || '·').trim().charAt(0);
  const roleLabel = user.account_type
    ? t(`accountType.${user.account_type}`)
    : '';
  const phoneVerified = user.is_phone_verified === true;

  return (
    <div
      className="rounded-[16px] mb-5 overflow-hidden animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(150deg, #0f1147 0%, #1f2258 100%)',
          height: 96,
        }}
      />
      <div className="px-7 pb-7" style={{ marginTop: -40 }}>
        <div
          className="flex items-center justify-center font-display font-bold mb-4"
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: '#136d4a',
            color: 'white',
            fontSize: 32,
            border: '4px solid var(--bg-surface)',
            boxShadow: '0 10px 24px rgba(15,17,41,0.10)',
          }}
        >
          {initial}
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2
              className="font-display m-0 mb-1.5"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-ink)',
              }}
            >
              {user.name || t('dashboard.profile.defaultName')}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {roleLabel && (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ fontSize: 13, color: 'var(--text-muted)' }}
                >
                  <Briefcase size={13} strokeWidth={1.7} />
                  {roleLabel}
                </span>
              )}
              {user.specialty && (
                <>
                  <Dot />
                  <span
                    style={{ fontSize: 13, color: 'var(--text-muted)' }}
                  >
                    {user.specialty}
                  </span>
                </>
              )}
              {phoneVerified && (
                <>
                  <Dot />
                  <span
                    className="inline-flex items-center gap-1 rounded-full font-semibold"
                    style={{
                      background: 'rgba(19,109,74,0.10)',
                      color: '#0d5538',
                      fontSize: 11,
                      padding: '3px 8px',
                    }}
                  >
                    <CheckCircle2 size={11} strokeWidth={2.2} />
                    {t('dashboard.profile.verifiedBadge')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Account info card
 * ============================================================ */
function AccountInfoCard({ user, editing, onEnterEdit, onCancel, onSaved }) {
  const { t } = useTranslation();
  const isCompanyAccount =
    user.account_type && user.account_type !== 'individual';
  const nameLabel = isCompanyAccount
    ? t('dashboard.profile.nameLabelCompany')
    : t('dashboard.profile.nameLabelIndividual');
  const NameIcon = isCompanyAccount ? Building2 : UserIcon;

  return (
    <SectionCard
      title={t('dashboard.profile.sectionAccount')}
      action={
        !editing && (
          <button
            type="button"
            onClick={onEnterEdit}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 12.5,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--bg-ink-deep)';
              e.currentTarget.style.color = 'var(--bg-ink-deep)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-ink-soft)';
            }}
          >
            <Pencil size={13} strokeWidth={1.8} />
            {t('dashboard.profile.editCta')}
          </button>
        )
      }
    >
      {editing ? (
        <EditForm
          user={user}
          nameLabel={nameLabel}
          isCompanyAccount={isCompanyAccount}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      ) : (
        <ViewMode user={user} nameLabel={nameLabel} NameIcon={NameIcon} />
      )}
    </SectionCard>
  );
}

function ViewMode({ user, nameLabel, NameIcon }) {
  const { t } = useTranslation();
  const specialtyFieldLabel = hasSpecialty(user.account_type)
    ? user.account_type === 'supplier'
      ? t('specialty.supplierLabel')
      : t('specialty.developerLabel')
    : t('specialty.defaultLabel');

  return (
    <ul className="m-0 p-0 space-y-5">
      <FieldRow icon={NameIcon} label={nameLabel} value={user.name} />
      <FieldRow icon={Phone} label={t('dashboard.profile.phone')} value={user.phone} ltr />
      <FieldRow icon={Mail} label={t('dashboard.profile.email')} value={user.email} ltr />
      <FieldRow icon={MapPin} label={t('dashboard.profile.city')} value={user.city} />
      <FieldRow
        icon={Briefcase}
        label={t('dashboard.profile.accountType')}
        value={user.account_type ? t(`accountType.${user.account_type}`) : ''}
        readOnlyHint={t('dashboard.profile.accountTypeChangeHint')}
      />
      {hasSpecialty(user.account_type) && (
        <FieldRow
          icon={Briefcase}
          label={specialtyFieldLabel}
          value={user.specialty}
        />
      )}
    </ul>
  );
}

function FieldRow({ icon: Icon, label, value, ltr, readOnlyHint }) {
  return (
    <li className="list-none flex items-start gap-3">
      <Icon
        size={16}
        strokeWidth={1.7}
        className="flex-shrink-0 mt-1"
        style={{ color: 'var(--text-muted)' }}
      />
      <div className="min-w-0 flex-1">
        <div
          className="font-medium uppercase mb-1"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </div>
        <div
          className="font-semibold"
          style={{
            fontSize: 14,
            color: value ? 'var(--text-ink)' : 'var(--text-muted)',
            direction: ltr ? 'ltr' : undefined,
            textAlign: ltr ? 'left' : undefined,
            wordBreak: 'break-word',
          }}
        >
          {value || '—'}
        </div>
        {readOnlyHint && (
          <div
            className="mt-1"
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            {readOnlyHint}
          </div>
        )}
      </div>
    </li>
  );
}

function EditForm({ user, nameLabel, isCompanyAccount, onCancel, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    city: user.city || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const NameIcon = isCompanyAccount ? Building2 : UserIcon;

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t('dashboard.profile.errors.nameMissing');
    if (!form.email.trim()) {
      e.email = t('dashboard.profile.errors.emailMissing');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = t('dashboard.profile.errors.emailFormat');
    }
    if (!form.city) e.city = t('dashboard.profile.errors.cityMissing');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaveError('');
    setSaving(true);
    try {
      await auth.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        city: form.city,
      });
      await onSaved();
    } catch (err) {
      setSaveError(err.message || t('dashboard.profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const specialtyFieldLabel = hasSpecialty(user.account_type)
    ? user.account_type === 'supplier'
      ? t('specialty.supplierLabel')
      : t('specialty.developerLabel')
    : t('specialty.defaultLabel');

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <Field
        label={nameLabel}
        icon={NameIcon}
        value={form.name}
        onChange={update('name')}
        error={errors.name}
      />

      <div>
        <label className="field-label">{t('dashboard.profile.phone')}</label>
        <div
          className="px-4 py-3 rounded-[10px] flex items-center gap-2"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            fontSize: 14,
            color: 'var(--text-muted)',
            direction: 'ltr',
            textAlign: 'left',
          }}
        >
          <Phone size={14} strokeWidth={1.7} style={{ flexShrink: 0 }} />
          {user.phone || '—'}
        </div>
        <p
          className="m-0 mt-1.5"
          style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
        >
          {t('dashboard.profile.phoneChangeHint')}
        </p>
      </div>

      <Field
        label={t('dashboard.profile.email')}
        icon={Mail}
        type="email"
        value={form.email}
        onChange={update('email')}
        error={errors.email}
      />

      <SelectField
        label={t('dashboard.profile.city')}
        icon={MapPin}
        options={CITIES}
        value={form.city}
        onChange={update('city')}
        error={errors.city}
        placeholder={t('dashboard.profile.cityPlaceholder')}
      />

      {hasSpecialty(user.account_type) && (
        <div>
          <label className="field-label">{specialtyFieldLabel}</label>
          <div
            className="px-4 py-3 rounded-[10px] flex items-center gap-2"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              fontSize: 14,
              color: 'var(--text-muted)',
            }}
          >
            <Briefcase size={14} strokeWidth={1.7} style={{ flexShrink: 0 }} />
            {user.specialty || '—'}
          </div>
          <p
            className="m-0 mt-1.5"
            style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
          >
            {t('dashboard.profile.specialtyChangeHint')}
          </p>
        </div>
      )}

      {saveError && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-[8px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: 'var(--accent-danger)',
            fontSize: 13,
          }}
        >
          <AlertCircle
            size={14}
            strokeWidth={2}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span>{saveError}</span>
        </div>
      )}

      <div
        className="flex items-center gap-2.5 pt-2"
        style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 16 }}
      >
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: saving ? '#8a8ca5' : 'var(--bg-ink-deep)',
            border: `1px solid ${saving ? '#8a8ca5' : 'var(--bg-ink-deep)'}`,
            cursor: saving ? 'wait' : 'pointer',
            boxShadow: saving ? 'none' : '0 6px 14px rgba(15,17,71,0.20)',
          }}
        >
          <Check size={14} strokeWidth={2} />
          {saving ? t('dashboard.profile.savingCta') : t('dashboard.profile.saveCta')}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: 'var(--bg-surface)',
            color: 'var(--text-ink-soft)',
            border: '1px solid var(--border-default)',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <X size={14} strokeWidth={2} />
          {t('dashboard.profile.cancelCta')}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
 *  Security card
 * ============================================================ */
function SecurityCard({ navigate }) {
  const { t } = useTranslation();
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  const handleLogoutAll = async () => {
    if (loggingOutAll) return;
    const confirmed = window.confirm(t('dashboard.profile.security.logoutAll.confirm'));
    if (!confirmed) return;
    setLoggingOutAll(true);
    try {
      await auth.logoutAll();
    } catch {
      // logoutAll always clears local token in `finally`
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <SectionCard title={t('dashboard.profile.sectionSecurity')}>
      <ul className="m-0 p-0 space-y-2">
        <SecurityRow
          icon={KeyRound}
          title={t('dashboard.profile.security.password.title')}
          desc={t('dashboard.profile.security.password.desc')}
          actionLabel={t('dashboard.profile.security.password.action')}
          onAction={() => setChangePwOpen(true)}
        />
        <SecurityRow
          icon={LogOut}
          title={t('dashboard.profile.security.logoutAll.title')}
          desc={t('dashboard.profile.security.logoutAll.desc')}
          actionLabel={
            loggingOutAll
              ? t('dashboard.profile.security.logoutAll.working')
              : t('dashboard.profile.security.logoutAll.action')
          }
          actionVariant="danger"
          onAction={handleLogoutAll}
        />
      </ul>

      {changePwOpen && (
        <ChangePasswordModal
          onClose={() => setChangePwOpen(false)}
          onSuccess={() => navigate('/login', { replace: true })}
        />
      )}
    </SectionCard>
  );
}

/* ============================================================
 *  ChangePasswordModal
 * ============================================================ */
function ChangePasswordModal({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ve = {};
    if (!currentPassword) ve.current_password = t('dashboard.profile.errors.currentMissing');
    if (!password || password.length < 8)
      ve.password = t('dashboard.profile.errors.passwordShort');
    if (password !== confirmation)
      ve.confirmation = t('dashboard.profile.errors.passwordMismatch');
    setErrors(ve);
    if (Object.keys(ve).length > 0) return;

    setError('');
    setSubmitting(true);
    try {
      await auth.changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || t('dashboard.profile.changePassword.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-up"
      style={{
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 18,
          maxWidth: 460,
          width: '100%',
          padding: '24px 24px 20px',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(58,61,153,0.08)',
                color: '#3a3d99',
              }}
            >
              <KeyRound size={20} strokeWidth={1.7} />
            </div>
            <div>
              <h2
                className="font-display m-0"
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: 'var(--text-ink)',
                }}
              >
                {t('dashboard.profile.changePassword.title')}
              </h2>
              <p
                className="m-0 mt-0.5"
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--text-muted)',
                }}
              >
                {t('dashboard.profile.changePassword.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('dashboard.profile.changePassword.close')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <X size={15} strokeWidth={1.9} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              className="px-3.5 py-3 rounded-[10px] flex items-start gap-2"
              style={{
                background: 'rgba(185,28,28,0.06)',
                border: '1px solid rgba(185,28,28,0.18)',
                color: 'var(--accent-danger)',
                fontSize: 13,
              }}
            >
              <AlertCircle
                size={14}
                strokeWidth={1.9}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <span>{error}</span>
            </div>
          )}

          <PasswordField
            label={t('dashboard.profile.changePassword.current')}
            placeholder={t('dashboard.profile.changePassword.currentPlaceholder')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.current_password}
            autoFocus
          />

          <PasswordField
            label={t('dashboard.profile.changePassword.newPassword')}
            placeholder={t('dashboard.profile.changePassword.newPasswordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <PasswordField
            label={t('dashboard.profile.changePassword.confirm')}
            placeholder={t('dashboard.profile.changePassword.confirmPlaceholder')}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.confirmation}
          />

          <div
            className="flex items-center gap-2.5 pt-3"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: submitting ? '#8a8ca5' : 'var(--bg-ink-deep)',
                border: `1px solid ${submitting ? '#8a8ca5' : 'var(--bg-ink-deep)'}`,
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: submitting ? 'none' : '0 6px 14px rgba(15,17,71,0.20)',
              }}
            >
              <Check size={14} strokeWidth={2} />
              {submitting
                ? t('dashboard.profile.changePassword.submitting')
                : t('dashboard.profile.changePassword.submit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-ink-soft)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {t('dashboard.profile.cancelCta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  title,
  desc,
  actionLabel,
  actionDisabled,
  actionVariant,
  onAction,
}) {
  const isDanger = actionVariant === 'danger';

  return (
    <li
      className="list-none flex items-start justify-between gap-4 py-4"
      style={{ borderBottom: '1px solid var(--border-soft)' }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isDanger
              ? 'rgba(185,28,28,0.08)'
              : 'rgba(58,61,153,0.08)',
            color: isDanger ? '#b91c1c' : '#3a3d99',
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div
            className="font-display font-bold"
            style={{ fontSize: 14, color: 'var(--text-ink)' }}
          >
            {title}
          </div>
          <div
            className="mt-0.5"
            style={{
              fontSize: 12.5,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            {desc}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={actionDisabled}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] font-semibold transition-all flex-shrink-0"
        style={{
          fontSize: 12,
          background: actionDisabled
            ? 'var(--bg-canvas)'
            : 'var(--bg-surface)',
          color: actionDisabled
            ? 'var(--text-muted)'
            : isDanger
            ? 'var(--accent-danger)'
            : 'var(--text-ink-soft)',
          border: `1px solid ${
            actionDisabled
              ? 'var(--border-default)'
              : isDanger
              ? 'rgba(185,28,28,0.25)'
              : 'var(--border-default)'
          }`,
          cursor: actionDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (actionDisabled) return;
          e.currentTarget.style.background = isDanger
            ? 'rgba(185,28,28,0.06)'
            : 'var(--bg-canvas)';
          e.currentTarget.style.borderColor = isDanger
            ? '#b91c1c'
            : 'var(--bg-ink-deep)';
        }}
        onMouseLeave={(e) => {
          if (actionDisabled) return;
          e.currentTarget.style.background = 'var(--bg-surface)';
          e.currentTarget.style.borderColor = isDanger
            ? 'rgba(185,28,28,0.25)'
            : 'var(--border-default)';
        }}
      >
        {actionLabel}
      </button>
    </li>
  );
}

/* ============================================================
 *  Shared bits
 * ============================================================ */
function SectionCard({ title, action, children }) {
  return (
    <section
      className="rounded-[16px] mb-5 animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <header
        className="px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <h3
          className="font-display m-0"
          style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-ink)' }}
        >
          {title}
        </h3>
        {action}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Dot() {
  return (
    <span
      className="inline-block"
      style={{
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: '#cbcec9',
      }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 animate-pulse max-w-[860px]">
      <div
        style={{
          height: 28,
          width: 200,
          background: 'var(--border-soft)',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />
      <div
        style={{
          height: 14,
          width: 320,
          background: 'var(--border-soft)',
          borderRadius: 6,
          marginBottom: 32,
        }}
      />
      {[180, 360, 220].map((h, i) => (
        <div
          key={i}
          className="mb-5"
          style={{
            height: h,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 16,
          }}
        />
      ))}
    </div>
  );
}
