import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, User, MapPin, Briefcase, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Field from '../components/form/Field';
import SelectField from '../components/form/SelectField';
import PasswordField from '../components/form/PasswordField';
import PhoneField from '../components/form/PhoneField';
import {
  ACCOUNT_CATEGORIES,
  SERVICE_PROVIDER_ROLES,
  CITIES,
  getSpecialties,
  hasSpecialty,
  specialtyLabel,
} from '../config/constants';
import { auth } from '../services';

/* ============================================================
 *  RegisterPage
 *  ----------------------------------------------------------------
 *  The form distinguishes two pieces of state:
 *
 *    categoryChoice  the UI card the user clicked (one of the four
 *                    cards: individual / service_provider / supplier
 *                    / developer). "service_provider" is a UI-only
 *                    grouping — see config/constants.js.
 *
 *    accountType     the value sent to the backend in the
 *                    `account_type` field. For most categories this
 *                    equals categoryChoice. For "service_provider",
 *                    it remains empty until the user picks a sub-role
 *                    (entrepreneur or engineering), at which point
 *                    it becomes that role's value.
 *
 *  This split keeps the DB happy (which never sees the fake
 *  "service_provider" value) without making the UI awkward.
 * ============================================================ */

export default function RegisterPage() {
  const navigate = useNavigate();

  // UI grouping (what card was clicked)
  const [categoryChoice, setCategoryChoice] = useState('');

  // The actual value sent to the backend
  const [accountType, setAccountType] = useState('');

  const [specialty, setSpecialty] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isServiceProviderCategory = categoryChoice === 'service_provider';
  const showSpecialtyDropdown = hasSpecialty(accountType);

  const validate = () => {
    const e = {};
    if (!categoryChoice) {
      e.accountType = 'الرجاء اختيار نوع الحساب';
    } else if (isServiceProviderCategory && !accountType) {
      // They picked "service provider" but didn't pick a sub-role yet
      e.role = 'الرجاء اختيار تخصصك';
    }
    if (showSpecialtyDropdown && !specialty) {
      e.specialty = 'الرجاء اختيار التخصص';
    }
    if (!name) e.name = 'الاسم مطلوب';
    if (!city) e.city = 'المدينة مطلوبة';
    if (!phone) e.phone = 'رقم الهاتف مطلوب';
    if (!email) e.email = 'البريد الإلكتروني مطلوب';
    if (!password || password.length < 8)
      e.password = 'كلمة المرور يجب أن لا تقل عن ٨ أحرف';
    if (password !== confirm) e.confirm = 'كلمتا المرور غير متطابقتين';
    if (!agreed) e.agreed = 'يجب الموافقة على الشروط';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST /api/auth/register
  // Backend validates account_type ∈ {individual, entrepreneur,
  // engineering, supplier, developer} and phone matching the
  // pattern +9665XXXXXXXX. Auth service adds password_confirmation
  // and device_name to the body. On success the response includes
  // a token (already stored by the service) AND the backend has
  // auto-sent an OTP to the phone — so we just navigate to /otp.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      // Normalize phone to +9665XXXXXXXX
      const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
      const normalizedPhone = `+966${digits}`;

      await auth.register({
        account_type: accountType,
        specialty: specialty || null,
        name,
        city,
        phone: normalizedPhone,
        email: email.trim(),
        password,
      });
      navigate('/otp');
    } catch (err) {
      setSubmitError(err.message || 'تعذّر إنشاء الحساب. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  /* When the user clicks a category card:
     - For non-service-provider categories, the category IS the
       account_type, so we set both to the same value.
     - For "service_provider", we set categoryChoice but clear
       accountType — the user has to pick a sub-role next. */
  const handleCategoryChange = (categoryValue) => {
    setCategoryChoice(categoryValue);
    if (categoryValue === 'service_provider') {
      setAccountType(''); // wait for sub-role choice
    } else {
      setAccountType(categoryValue);
    }
    // Reset specialty when changing category
    if (!hasSpecialty(categoryValue)) setSpecialty('');
  };

  /* Sub-role picker: writes directly to accountType. */
  const handleRoleChange = (roleValue) => {
    setAccountType(roleValue);
    if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
  };

  return (
    <AuthShell
      kicker="ابدأ معنا"
      title="أنشئ حسابك في تعاهد"
      subtitle="نحتاج بضع معلومات لإعداد حسابك."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {submitError && (
          <div
            className="p-3.5 rounded-[11px] animate-fade-up"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: '#b91c1c',
              fontSize: 13.5,
            }}
          >
            {submitError}
          </div>
        )}
        {/* Account category cards */}
        <div className="animate-fade-up">
          <label className="field-label">نوع الحساب</label>
          <div className="grid grid-cols-2 gap-2.5">
            {ACCOUNT_CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = categoryChoice === c.value;
              return (
                <button
                  type="button"
                  key={c.value}
                  className={`acct ${active ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(c.value)}
                >
                  <div className="ico">
                    <Icon size={20} strokeWidth={1.7} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-ink">{c.label}</div>
                    <div className="text-[11.5px] text-muted mt-0.5">{c.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.accountType && <p className="field-err">{errors.accountType}</p>}
        </div>

        {/* Sub-role buttons — only when "service provider" category
            is picked. The chosen role IS the account_type sent to
            the backend (entrepreneur or engineering). */}
        {isServiceProviderCategory && (
          <ServiceProviderRoles
            value={accountType}
            onChange={handleRoleChange}
            error={errors.role}
          />
        )}

        {/* Specialty dropdown — only for supplier and developer.
            Service providers don't have a separate specialty;
            their account_type IS their specialty. */}
        {showSpecialtyDropdown && (
          <SelectField
            label={specialtyLabel(accountType)}
            icon={Briefcase}
            options={getSpecialties(accountType)}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            error={errors.specialty}
            placeholder="اختر التخصص"
          />
        )}

        {/* Name + City */}
        <div className="grid grid-cols-2 gap-3.5">
          <Field
            label="الاسم الكامل"
            icon={User}
            placeholder="مثال: أحمد محمد"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <SelectField
            label="المدينة"
            icon={MapPin}
            options={CITIES}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            error={errors.city}
            placeholder="اختر المدينة"
          />
        </div>

        {/* Phone */}
        <PhoneField
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="سنرسل رمز تحقق لتأكيد الرقم."
        />

        {/* Email */}
        <Field
          label="البريد الإلكتروني"
          icon={Mail}
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        {/* Passwords */}
        <div className="grid grid-cols-2 gap-3.5">
          <PasswordField
            label="كلمة المرور"
            placeholder="٨ أحرف على الأقل"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <PasswordField
            label="تأكيد كلمة المرور"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
        </div>

        {/* Terms */}
        <label
          className={`flex gap-2.5 items-start text-[13px] text-ink-soft cursor-pointer p-3.5 bg-cream rounded-[11px] border ${
            errors.agreed ? 'border-danger' : 'border-transparent'
          }`}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={() => setAgreed(!agreed)}
            className="w-4 h-4 mt-0.5"
            style={{ accentColor: '#2c2f7c' }}
          />
          <span className="leading-relaxed">
            أوافق على <a className="link">شروط الاستخدام</a> و
            <a className="link"> سياسة الخصوصية</a>، وأقر بأن المعلومات المُدخلة صحيحة.
          </span>
        </label>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'جارٍ الإرسال...' : 'متابعة وإرسال رمز التحقق'}
          {!submitting && <ArrowLeft size={17} />}
        </button>

        <p className="text-center text-sm text-muted m-0 mt-1">
          لديك حساب بالفعل؟{' '}
          <a className="link" onClick={() => navigate('/login')}>
            سجّل الدخول
          </a>
        </p>
      </form>
    </AuthShell>
  );
}

/* ============================================================
 *  ServiceProviderRoles — sub-role chooser shown when the user
 *  picks "مقدم خدمة". Two buttons styled to match the account-type
 *  cards above. The chosen value IS the database account_type
 *  (entrepreneur or engineering) — these are real user-table
 *  values, not a UI grouping.
 * ============================================================ */
function ServiceProviderRoles({ value, onChange, error }) {
  return (
    <div className="animate-fade-up">
      <label className="field-label">تخصصك</label>
      <div className="grid grid-cols-2 gap-2.5">
        {SERVICE_PROVIDER_ROLES.map((role) => {
          const Icon = role.icon;
          const active = value === role.value;
          return (
            <button
              type="button"
              key={role.value}
              className={`acct ${active ? 'active' : ''}`}
              onClick={() => onChange(role.value)}
            >
              <div className="ico">
                <Icon size={20} strokeWidth={1.7} />
              </div>
              <div>
                <div className="font-semibold text-sm text-ink">{role.label}</div>
                <div className="text-[11.5px] text-muted mt-0.5">{role.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="field-err">{error}</p>}
    </div>
  );
}
