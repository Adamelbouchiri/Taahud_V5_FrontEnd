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
  OTP_ENABLED,
  getSpecialties,
  hasSpecialty,
} from '../config/constants';
import { auth } from '../services';
import { useTranslation } from '../i18n/LanguageContext';

// constants.js stores `service_provider` with an underscore but our
// translation keys are camelCased. Same idea for the sub-roles —
// they map 1:1 to existing `accountType.*` keys.
const ACCOUNT_TYPE_KEY = {
  individual: 'individual',
  service_provider: 'serviceProvider',
  supplier: 'supplier',
  developer: 'developer',
  entrepreneur: 'entrepreneur',
  engineering: 'engineering',
};

function specialtyKey(accountType) {
  if (accountType === 'supplier') return 'specialty.supplierLabel';
  if (accountType === 'developer') return 'specialty.developerLabel';
  return 'specialty.defaultLabel';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [categoryChoice, setCategoryChoice] = useState('');
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
  // Contractors (entrepreneur) and engineering offices register as
  // companies, not individuals — swap the "name" field to a
  // "company name" label/placeholder for those two roles.
  const isCompanyRole =
    accountType === 'entrepreneur' || accountType === 'engineering';

  const validate = () => {
    const e = {};
    if (!categoryChoice) {
      e.accountType = t('auth.register.errors.accountTypeMissing');
    } else if (isServiceProviderCategory && !accountType) {
      e.role = t('auth.register.errors.roleMissing');
    }
    if (showSpecialtyDropdown && !specialty) {
      e.specialty = t('auth.register.errors.specialtyMissing');
    }
    if (!name) e.name = t('auth.register.errors.nameMissing');
    if (!city) e.city = t('auth.register.errors.cityMissing');
    if (!phone) e.phone = t('auth.register.errors.phoneMissing');
    if (!email) e.email = t('auth.register.errors.emailMissing');
    if (!password || password.length < 8)
      e.password = t('auth.register.errors.passwordShort');
    if (password !== confirm) e.confirm = t('auth.register.errors.passwordMismatch');
    if (!agreed) e.agreed = t('auth.register.errors.notAgreed');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
      const normalizedPhone = `+966${digits}`;

      const res = await auth.register({
        account_type: accountType,
        specialty: specialty || null,
        name,
        city,
        phone: normalizedPhone,
        email: email.trim(),
        password,
      });
      // OTP_ENABLED is the kill switch — until an SMS provider is
      // wired up we skip the /otp step entirely and drop the user
      // on the dashboard. When the flag flips back to true, also
      // honor the BE's verification flag: only send the user to
      // /otp if the BE explicitly says they're not verified yet.
      const verified = res?.user?.is_phone_verified !== false;
      const skipOtp = !OTP_ENABLED || verified;
      navigate(skipOtp ? '/dashboard' : '/otp');
    } catch (err) {
      setSubmitError(err.message || t('auth.register.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryChange = (categoryValue) => {
    setCategoryChoice(categoryValue);
    if (categoryValue === 'service_provider') {
      setAccountType('');
    } else {
      setAccountType(categoryValue);
    }
    if (!hasSpecialty(categoryValue)) setSpecialty('');
  };

  const handleRoleChange = (roleValue) => {
    setAccountType(roleValue);
    if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
  };

  return (
    <AuthShell
      kicker={t('auth.register.kicker')}
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {submitError && (
          <div
            className="p-3.5 rounded-[11px] animate-fade-up"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13.5,
            }}
          >
            {submitError}
          </div>
        )}

        {/* Account category cards */}
        <div className="animate-fade-up">
          <label className="field-label">{t('auth.register.accountTypeLabel')}</label>
          <div className="grid grid-cols-2 gap-2.5">
            {ACCOUNT_CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = categoryChoice === c.value;
              const k = ACCOUNT_TYPE_KEY[c.value] || c.value;
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
                    <div className="font-semibold text-sm text-ink">
                      {t(`accountType.${k}`)}
                    </div>
                    <div className="text-[11.5px] text-muted mt-0.5">
                      {t(`accountType.${k}Desc`)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.accountType && <p className="field-err">{errors.accountType}</p>}
        </div>

        {isServiceProviderCategory && (
          <ServiceProviderRoles
            value={accountType}
            onChange={handleRoleChange}
            error={errors.role}
            t={t}
          />
        )}

        {showSpecialtyDropdown && (
          <SelectField
            label={t(specialtyKey(accountType))}
            icon={Briefcase}
            options={getSpecialties(accountType)}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            error={errors.specialty}
            placeholder={t('auth.register.specialtyPlaceholder')}
          />
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <Field
            label={t(
              isCompanyRole
                ? 'auth.register.companyName'
                : 'auth.register.name'
            )}
            icon={isCompanyRole ? Briefcase : User}
            placeholder={t(
              isCompanyRole
                ? 'auth.register.companyNamePlaceholder'
                : 'auth.register.namePlaceholder'
            )}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <SelectField
            label={t('auth.register.city')}
            icon={MapPin}
            options={CITIES}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            error={errors.city}
            placeholder={t('auth.register.cityPlaceholder')}
          />
        </div>

        <PhoneField
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint={t('auth.register.phoneHint')}
        />

        <Field
          label={t('auth.register.email')}
          icon={Mail}
          type="email"
          placeholder={t('auth.register.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <div className="grid grid-cols-2 gap-3.5">
          <PasswordField
            label={t('auth.register.password')}
            placeholder={t('auth.register.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <PasswordField
            label={t('auth.register.passwordConfirm')}
            placeholder={t('auth.register.passwordConfirmPlaceholder')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
        </div>

        <label
          className={`flex gap-2.5 items-start text-[13px] cursor-pointer p-3.5 rounded-[11px] border ${
            errors.agreed ? 'border-danger' : 'border-transparent'
          }`}
          style={{
            color: 'var(--text-ink-soft)',
            background: 'var(--bg-cream)',
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={() => setAgreed(!agreed)}
            className="w-4 h-4 mt-0.5"
            style={{ accentColor: '#2c2f7c' }}
          />
          <span className="leading-relaxed">
            {t('auth.register.termsText', {
              terms: `__TERMS__`,
              privacy: `__PRIVACY__`,
            })
              .split(/(__TERMS__|__PRIVACY__)/)
              .map((part, i) => {
                if (part === '__TERMS__')
                  return (
                    <a
                      key={i}
                      className="link"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/terms');
                      }}
                    >
                      {t('auth.register.terms')}
                    </a>
                  );
                if (part === '__PRIVACY__')
                  return (
                    <a
                      key={i}
                      className="link"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/privacy');
                      }}
                    >
                      {t('auth.register.privacy')}
                    </a>
                  );
                return <React.Fragment key={i}>{part}</React.Fragment>;
              })}
          </span>
        </label>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
          {!submitting && <ArrowLeft size={17} />}
        </button>

        <p
          className="text-center text-sm m-0 mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('auth.register.haveAccount')}{' '}
          <a className="link" onClick={() => navigate('/login')}>
            {t('auth.register.signIn')}
          </a>
        </p>
      </form>
    </AuthShell>
  );
}

function ServiceProviderRoles({ value, onChange, error, t }) {
  return (
    <div className="animate-fade-up">
      <label className="field-label">{t('auth.register.serviceRoleLabel')}</label>
      <div className="grid grid-cols-2 gap-2.5">
        {SERVICE_PROVIDER_ROLES.map((role) => {
          const Icon = role.icon;
          const active = value === role.value;
          const k = ACCOUNT_TYPE_KEY[role.value] || role.value;
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
                <div className="font-semibold text-sm text-ink">
                  {t(`accountType.${k}`)}
                </div>
                <div className="text-[11.5px] text-muted mt-0.5">
                  {t(`accountType.${k}Desc`)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="field-err">{error}</p>}
    </div>
  );
}
