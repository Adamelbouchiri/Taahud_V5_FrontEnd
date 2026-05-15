import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Field from '../components/form/Field';
import PasswordField from '../components/form/PasswordField';
import PhoneField from '../components/form/PhoneField';
import { auth } from '../services';
import { useTranslation } from '../i18n/LanguageContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [mode, setMode] = useState('phone'); // 'phone' | 'email'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Where to send the user after a successful login. If they were
  // bounced here from a protected route by RequireAuth, that path
  // was saved in location.state.from — honor it. Otherwise default
  // to /dashboard.
  const redirectAfterLogin = location.state?.from || '/dashboard';

  // Normalize the user's input into the `login` field the
  // backend expects:
  //   - Phone mode: prepend +966 and strip non-digits
  //   - Email mode: just trim
  const buildLoginField = () => {
    if (mode === 'phone') {
      const digits = identifier.replace(/\D/g, '');
      const trimmed = digits.replace(/^0+/, '');
      return `+966${trimmed}`;
    }
    return identifier.trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await auth.login({
        login: buildLoginField(),
        password,
        remember_me: remember,
      });
      const verified = res?.user?.is_phone_verified !== false;
      if (!verified) {
        navigate('/otp');
      } else {
        navigate(redirectAfterLogin, { replace: true });
      }
    } catch (err) {
      setError(err.message || t('auth.login.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker={t('auth.login.kicker')}
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
    >
      <div className="pill-group animate-fade-up mb-5">
        <button
          type="button"
          className={`pill ${mode === 'phone' ? 'active' : ''}`}
          onClick={() => setMode('phone')}
        >
          {t('auth.login.modePhone')}
        </button>
        <button
          type="button"
          className={`pill ${mode === 'email' ? 'active' : ''}`}
          onClick={() => setMode('email')}
        >
          {t('auth.login.modeEmail')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {error && (
          <div
            className="p-3.5 rounded-[11px] animate-fade-up"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: 'var(--accent-danger)',
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}

        {mode === 'phone' ? (
          <PhoneField
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        ) : (
          <Field
            label={t('auth.login.emailLabel')}
            icon={Mail}
            type="email"
            placeholder={t('auth.login.emailPlaceholder')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        )}

        <PasswordField
          label={t('auth.login.password')}
          placeholder={t('auth.login.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-between items-center mt-0.5 mb-1.5">
          <label
            className="flex items-center gap-2 text-[13.5px] cursor-pointer"
            style={{ color: 'var(--text-ink-soft)' }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              className="w-4 h-4"
              style={{ accentColor: '#2c2f7c' }}
            />
            <span>{t('auth.login.remember')}</span>
          </label>
          <a
            className="link text-[13.5px]"
            onClick={() => navigate('/forgot-password')}
          >
            {t('auth.login.forgotPassword')}
          </a>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
          {!submitting && <ArrowLeft size={17} />}
        </button>

        <div
          className="flex items-center gap-3.5 my-2.5 text-[12.5px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <div
            className="flex-1 h-px"
            style={{ background: 'var(--border-default)' }}
          />
          <span>{t('auth.login.orDivider')}</span>
          <div
            className="flex-1 h-px"
            style={{ background: 'var(--border-default)' }}
          />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/register')}
        >
          {t('auth.login.createAccount')}
        </button>
      </form>

      <p
        className="text-center mt-7 text-[12.5px]"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('auth.login.termsPrefix')}{' '}
        <a className="link">{t('auth.login.terms')}</a>{' '}
        {t('auth.login.termsAnd')}{' '}
        <a className="link">{t('auth.login.privacy')}</a>.
      </p>
    </AuthShell>
  );
}
