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
  accountTypeLabel,
  hasSpecialty,
  specialtyLabel,
  CITIES,
} from '../../config/constants';
import { auth } from '../../services';
import Field from '../../components/form/Field';
import SelectField from '../../components/form/SelectField';
import PasswordField from '../../components/form/PasswordField';

/* ============================================================
 *  ProfilePage — /dashboard/profile
 *  ----------------------------------------------------------------
 *  Three sections (top to bottom):
 *
 *    1. Identity card       — avatar, display name, role,
 *                             phone-verified badge
 *
 *    2. Account info card   — viewable + editable fields. Toggles
 *                             into edit mode via the pencil button;
 *                             save/cancel buttons appear at the
 *                             bottom while editing. Account type is
 *                             always read-only (not user-changeable).
 *
 *    3. Security card       — sign out from all devices (real action
 *                             via /auth/logout-all), and a stubbed
 *                             change-password row marked "soon".
 *
 *  Field labels adapt to account type — for non-individual accounts
 *  the "name" field is labeled "اسم الشركة" instead of "الاسم".
 * ============================================================ */

export default function ProfilePage() {
  const { user, loading, refresh, logout } = useUser();
  const navigate = useNavigate();

  // Local UI state (separate from form state below).
  const [editing, setEditing] = useState(false);

  if (loading) return <ProfileSkeleton />;

  if (!user) {
    return (
      <div className="px-5 lg:px-8 py-12 text-center">
        <p className="text-muted m-0 mb-4">لم يتم تحميل الملف الشخصي.</p>
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold"
          style={{
            background: '#0f1147',
            border: '1px solid #0f1147',
            cursor: 'pointer',
            fontSize: 13.5,
          }}
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[860px]">
      {/* Page header */}
      <PageHeader />

      {/* Identity card */}
      <IdentityCard user={user} />

      {/* Account info — view or edit mode */}
      <AccountInfoCard
        user={user}
        editing={editing}
        onEnterEdit={() => setEditing(true)}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          // Re-fetch from /auth/me so we're back in sync with
          // the source of truth (works whether the backend has
          // really persisted or not — the stub just echoes).
          await refresh();
        }}
      />

      {/* Security */}
      <SecurityCard onLogout={logout} navigate={navigate} />
    </div>
  );
}

/* ============================================================
 *  Page header
 * ============================================================ */
function PageHeader() {
  return (
    <div className="mb-8 lg:mb-10 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(44,47,124,0.08)',
          color: '#1f2258',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <UserCircle size={12} />
        الحساب
      </div>
      <h1
        className="font-display text-ink m-0 mb-2"
        style={{
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}
      >
        الملف الشخصي
      </h1>
      <p
        className="text-muted m-0"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        إدارة بياناتك على تعاهد وإعدادات حسابك.
      </p>
    </div>
  );
}

/* ============================================================
 *  Identity card — avatar + name + role + verified badge
 * ============================================================ */
function IdentityCard({ user }) {
  const initial = (user.name || 'م').trim().charAt(0);
  const roleLabel = accountTypeLabel(user.account_type);
  const phoneVerified = user.is_phone_verified === true;

  return (
    <div
      className="rounded-[16px] mb-5 overflow-hidden animate-fade-up"
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      {/* Cover band */}
      <div
        style={{
          background: 'linear-gradient(150deg, #0f1147 0%, #1f2258 100%)',
          height: 96,
        }}
      />
      {/* Body */}
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
            border: '4px solid white',
            boxShadow: '0 10px 24px rgba(15,17,41,0.10)',
          }}
        >
          {initial}
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2
              className="font-display text-ink m-0 mb-1.5"
              style={{ fontSize: 22, fontWeight: 700 }}
            >
              {user.name || 'مستخدم'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {roleLabel && (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ fontSize: 13, color: '#7a7a8c' }}
                >
                  <Briefcase size={13} strokeWidth={1.7} />
                  {roleLabel}
                </span>
              )}
              {user.specialty && (
                <>
                  <Dot />
                  <span style={{ fontSize: 13, color: '#7a7a8c' }}>
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
                    رقم موثّق
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
 *  Account info card — view + edit modes
 * ============================================================ */
function AccountInfoCard({ user, editing, onEnterEdit, onCancel, onSaved }) {
  // Field labels adapt to account type.
  const isCompanyAccount =
    user.account_type && user.account_type !== 'individual';
  const nameLabel = isCompanyAccount ? 'اسم الشركة' : 'الاسم الكامل';
  const NameIcon = isCompanyAccount ? Building2 : UserIcon;

  return (
    <SectionCard
      title="بيانات الحساب"
      action={
        !editing && (
          <button
            type="button"
            onClick={onEnterEdit}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 12.5,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.color = '#3a3a52';
            }}
          >
            <Pencil size={13} strokeWidth={1.8} />
            تعديل
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

/* ----- View mode (read-only field rows) ----- */
function ViewMode({ user, nameLabel, NameIcon }) {
  return (
    <ul className="m-0 p-0 space-y-5">
      <FieldRow icon={NameIcon} label={nameLabel} value={user.name} />
      <FieldRow icon={Phone} label="رقم الهاتف" value={user.phone} ltr />
      <FieldRow icon={Mail} label="البريد الإلكتروني" value={user.email} ltr />
      <FieldRow icon={MapPin} label="المدينة" value={user.city} />
      <FieldRow
        icon={Briefcase}
        label="نوع الحساب"
        value={accountTypeLabel(user.account_type)}
        readOnlyHint="يحتاج تواصل مع الدعم لتغييره"
      />
      {hasSpecialty(user.account_type) && (
        <FieldRow
          icon={Briefcase}
          label={specialtyLabel(user.account_type)}
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
        className="flex-shrink-0 mt-1 text-muted"
      />
      <div className="min-w-0 flex-1">
        <div
          className="font-medium uppercase mb-1"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.08em',
            color: '#9a9aab',
          }}
        >
          {label}
        </div>
        <div
          className="font-semibold"
          style={{
            fontSize: 14,
            color: value ? '#0f1129' : '#a0a1b2',
            direction: ltr ? 'ltr' : 'rtl',
            textAlign: ltr ? 'left' : 'right',
            wordBreak: 'break-word',
          }}
        >
          {value || '—'}
        </div>
        {readOnlyHint && (
          <div
            className="mt-1"
            style={{ fontSize: 11, color: '#a0a1b2', fontStyle: 'italic' }}
          >
            {readOnlyHint}
          </div>
        )}
      </div>
    </li>
  );
}

/* ----- Edit mode ----- */
function EditForm({ user, nameLabel, isCompanyAccount, onCancel, onSaved }) {
  // Local form state — populated from current user, mutated as the
  // user types. Doesn't touch the global UserContext until save.
  // Specialty is intentionally NOT in this state: BE doesn't allow
  // editing it via /auth/profile, so it stays read-only below.
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
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.email.trim()) {
      e.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }
    if (!form.city) e.city = 'المدينة مطلوبة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaveError('');
    setSaving(true);
    try {
      // PATCH /auth/profile — only name/email/city are accepted.
      await auth.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        city: form.city,
      });
      await onSaved();
    } catch (err) {
      setSaveError(err.message || 'تعذّر حفظ التغييرات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <Field
        label={nameLabel}
        icon={NameIcon}
        value={form.name}
        onChange={update('name')}
        error={errors.name}
      />

      {/* Phone — display only, can't be changed without re-verify */}
      <div>
        <label className="field-label">رقم الهاتف</label>
        <div
          className="px-4 py-3 rounded-[10px] flex items-center gap-2"
          style={{
            background: '#fafaf6',
            border: '1px solid #e5e3dc',
            fontSize: 14,
            color: '#7a7a8c',
            direction: 'ltr',
            textAlign: 'left',
          }}
        >
          <Phone size={14} strokeWidth={1.7} style={{ flexShrink: 0 }} />
          {user.phone || '—'}
        </div>
        <p
          className="m-0 mt-1.5"
          style={{ fontSize: 11.5, color: '#9a9aab' }}
        >
          لتغيير رقم الهاتف يتطلّب إعادة التحقق — تواصل مع الدعم.
        </p>
      </div>

      <Field
        label="البريد الإلكتروني"
        icon={Mail}
        type="email"
        value={form.email}
        onChange={update('email')}
        error={errors.email}
      />

      <SelectField
        label="المدينة"
        icon={MapPin}
        options={CITIES}
        value={form.city}
        onChange={update('city')}
        error={errors.city}
        placeholder="اختر المدينة"
      />

      {hasSpecialty(user.account_type) && (
        <div>
          <label className="field-label">
            {specialtyLabel(user.account_type)}
          </label>
          <div
            className="px-4 py-3 rounded-[10px] flex items-center gap-2"
            style={{
              background: '#fafaf6',
              border: '1px solid #e5e3dc',
              fontSize: 14,
              color: '#7a7a8c',
            }}
          >
            <Briefcase size={14} strokeWidth={1.7} style={{ flexShrink: 0 }} />
            {user.specialty || '—'}
          </div>
          <p
            className="m-0 mt-1.5"
            style={{ fontSize: 11.5, color: '#9a9aab' }}
          >
            لتغيير التخصص — تواصل مع الدعم.
          </p>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-[8px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: '#b91c1c',
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

      {/* Actions */}
      <div
        className="flex items-center gap-2.5 pt-2"
        style={{ borderTop: '1px solid #efece4', paddingTop: 16 }}
      >
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: saving ? '#8a8ca5' : '#0f1147',
            border: `1px solid ${saving ? '#8a8ca5' : '#0f1147'}`,
            cursor: saving ? 'wait' : 'pointer',
            boxShadow: saving ? 'none' : '0 6px 14px rgba(15,17,71,0.20)',
          }}
        >
          <Check size={14} strokeWidth={2} />
          {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
          style={{
            fontSize: 13.5,
            background: 'white',
            color: '#3a3a52',
            border: '1px solid #e5e3dc',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <X size={14} strokeWidth={2} />
          إلغاء
        </button>
      </div>
    </form>
  );
}

/* ============================================================
 *  Security card
 * ============================================================ */
function SecurityCard({ onLogout, navigate }) {
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  const handleLogoutAll = async () => {
    if (loggingOutAll) return;
    const confirmed = window.confirm(
      'سيتم تسجيل الخروج من جميع الأجهزة بما فيها هذا الجهاز. هل أنت متأكد؟'
    );
    if (!confirmed) return;
    setLoggingOutAll(true);
    try {
      await auth.logoutAll();
    } catch {
      // logoutAll always clears local token in `finally`, so even
      // a network error effectively logs us out locally.
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <SectionCard title="الأمان">
      <ul className="m-0 p-0 space-y-2">
        <SecurityRow
          icon={KeyRound}
          title="تغيير كلمة المرور"
          desc="حدّث كلمة المرور الخاصة بك بشكل دوري لحماية حسابك."
          actionLabel="تغيير"
          onAction={() => setChangePwOpen(true)}
        />
        <SecurityRow
          icon={LogOut}
          title="تسجيل الخروج من كل الأجهزة"
          desc="ينهي جميع جلساتك في كل الأجهزة فوراً، بما في ذلك الجهاز الحالي."
          actionLabel={loggingOutAll ? 'جارٍ...' : 'تسجيل الخروج'}
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
 *  ----------------------------------------------------------------
 *  Three fields: current_password, password, password_confirmation.
 *  On 200 the backend revokes every token (including the current
 *  one) — the service clears the local token in the same call. We
 *  navigate to /login so the user signs back in with the new one.
 * ============================================================ */
function ChangePasswordModal({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Esc closes the modal.
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
    if (!currentPassword) ve.current_password = 'كلمة المرور الحالية مطلوبة.';
    if (!password || password.length < 8)
      ve.password = 'كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل.';
    if (password !== confirmation)
      ve.confirmation = 'تأكيد كلمة المرور غير مطابق.';
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
      setError(err.message || 'تعذّر تغيير كلمة المرور.');
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
        background: 'rgba(15,17,41,0.45)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 18,
          maxWidth: 460,
          width: '100%',
          padding: '24px 24px 20px',
          boxShadow: '0 30px 70px rgba(15,17,41,0.30)',
          border: '1px solid #e5e3dc',
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
                className="font-display text-ink m-0"
                style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}
              >
                تغيير كلمة المرور
              </h2>
              <p
                className="text-muted m-0 mt-0.5"
                style={{ fontSize: 12.5, lineHeight: 1.5 }}
              >
                ستحتاج إلى تسجيل الدخول مجدّداً بعد التغيير.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="إغلاق"
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: '#fafaf6',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
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
                color: '#b91c1c',
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
            label="كلمة المرور الحالية"
            placeholder="أدخل كلمة المرور الحالية"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.current_password}
            autoFocus
          />

          <PasswordField
            label="كلمة المرور الجديدة"
            placeholder="٨ أحرف على الأقل"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <PasswordField
            label="تأكيد كلمة المرور"
            placeholder="أعد إدخال كلمة المرور الجديدة"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.confirmation}
          />

          <div
            className="flex items-center gap-2.5 pt-3"
            style={{ borderTop: '1px solid #efece4' }}
          >
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: submitting ? '#8a8ca5' : '#0f1147',
                border: `1px solid ${submitting ? '#8a8ca5' : '#0f1147'}`,
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: submitting ? 'none' : '0 6px 14px rgba(15,17,71,0.20)',
              }}
            >
              <Check size={14} strokeWidth={2} />
              {submitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: 'white',
                border: '1px solid #e5e3dc',
                color: '#3a3a52',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              إلغاء
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
      style={{ borderBottom: '1px solid #f4f1e9' }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isDanger ? 'rgba(185,28,28,0.08)' : 'rgba(58,61,153,0.08)',
            color: isDanger ? '#b91c1c' : '#3a3d99',
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div
            className="font-display font-bold"
            style={{ fontSize: 14, color: '#0f1129' }}
          >
            {title}
          </div>
          <div
            className="mt-0.5"
            style={{ fontSize: 12.5, color: '#7a7a8c', lineHeight: 1.6 }}
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
            ? '#fafaf6'
            : isDanger
            ? 'white'
            : 'white',
          color: actionDisabled
            ? '#a0a1b2'
            : isDanger
            ? '#b91c1c'
            : '#3a3a52',
          border: `1px solid ${
            actionDisabled
              ? '#e5e3dc'
              : isDanger
              ? 'rgba(185,28,28,0.25)'
              : '#e5e3dc'
          }`,
          cursor: actionDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (actionDisabled) return;
          e.currentTarget.style.background = isDanger
            ? 'rgba(185,28,28,0.06)'
            : '#fafaf6';
          e.currentTarget.style.borderColor = isDanger
            ? '#b91c1c'
            : '#0f1147';
        }}
        onMouseLeave={(e) => {
          if (actionDisabled) return;
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.borderColor = isDanger
            ? 'rgba(185,28,28,0.25)'
            : '#e5e3dc';
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
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      <header
        className="px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid #efece4' }}
      >
        <h3
          className="font-display text-ink m-0"
          style={{ fontSize: 14.5, fontWeight: 700 }}
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
          background: '#efece4',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />
      <div
        style={{
          height: 14,
          width: 320,
          background: '#efece4',
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
            background: 'white',
            border: '1px solid #e5e3dc',
            borderRadius: 16,
          }}
        />
      ))}
    </div>
  );
}
