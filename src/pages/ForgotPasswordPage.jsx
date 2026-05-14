import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Field from '../components/form/Field';
import PasswordField from '../components/form/PasswordField';
import { auth } from '../services';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  ForgotPasswordPage
 *  ----------------------------------------------------------------
 *  Two-step flow on a single page:
 *    1. request — POST /auth/forgot-password
 *    2. reset   — POST /auth/reset-password (revokes all tokens on
 *                 success, so we route to /login).
 * ============================================================ */

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState('request'); // request | reset | done
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSubmitting(true);
    try {
      await auth.forgotPassword({ email });
      setStep('reset');
    } catch (err) {
      setError(err.message || t('auth.forgot.errorRequest'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const ve = {};
    if (!/^\d{6}$/.test(code.trim())) ve.code = t('auth.forgot.errors.codeFormat');
    if (!password || password.length < 8)
      ve.password = t('auth.forgot.errors.passwordShort');
    if (password !== confirmation)
      ve.confirmation = t('auth.forgot.errors.passwordMismatch');
    setErrors(ve);
    if (Object.keys(ve).length > 0) return;

    setError('');
    setSubmitting(true);
    try {
      await auth.resetPassword({
        email,
        code: code.trim(),
        password,
        password_confirmation: confirmation,
      });
      setStep('done');
    } catch (err) {
      setError(err.message || t('auth.forgot.errorReset'));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <AuthShell
        title={t('auth.forgot.successTitle')}
        subtitle={t('auth.forgot.successSubtitle')}
        onBack={() => navigate('/login')}
      >
        <div className="flex flex-col items-center gap-4 pt-6 pb-2 animate-fade-up">
          <div
            className="flex items-center justify-center w-[76px] h-[76px] rounded-full"
            style={{ background: 'rgba(19,109,74,0.10)' }}
          >
            <CheckCircle2 size={34} color="#136d4a" strokeWidth={1.8} />
          </div>
        </div>

        <button className="btn-primary mt-4" onClick={() => navigate('/login')}>
          {t('auth.forgot.goToLogin')}
          <ArrowLeft size={17} />
        </button>
      </AuthShell>
    );
  }

  if (step === 'reset') {
    return (
      <AuthShell
        kicker={t('auth.forgot.kicker')}
        title={t('auth.forgot.step2Title')}
        subtitle={
          <>
            {t('auth.forgot.step2SubtitlePrefix')}{' '}
            <span className="font-semibold" style={{ color: 'var(--text-ink)' }}>
              {email}
            </span>
            {t('auth.forgot.step2SubtitleSuffix')}
          </>
        }
        onBack={() => {
          setStep('request');
          setError('');
        }}
      >
        <form onSubmit={handleReset} className="flex flex-col gap-[18px]">
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

          <Field
            label={t('auth.forgot.code')}
            icon={KeyRound}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={t('auth.forgot.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={errors.code}
            hint={t('auth.forgot.codeHint')}
          />

          <PasswordField
            label={t('auth.forgot.newPassword')}
            placeholder={t('auth.forgot.newPasswordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <PasswordField
            label={t('auth.forgot.newPasswordConfirm')}
            placeholder={t('auth.forgot.newPasswordConfirmPlaceholder')}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.confirmation}
          />

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('auth.forgot.step2Submitting') : t('auth.forgot.step2Submit')}
            {!submitting && <ArrowLeft size={17} />}
          </button>

          <div
            className="text-center mt-2 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('auth.forgot.codeNotReceived')}{' '}
            <button
              type="button"
              className="link bg-transparent border-0 p-0 cursor-pointer"
              onClick={() => {
                setStep('request');
                setError('');
              }}
            >
              {t('auth.forgot.tryAgain')}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker={t('auth.forgot.kicker')}
      title={t('auth.forgot.step1Title')}
      subtitle={t('auth.forgot.step1Subtitle')}
      onBack={() => navigate('/login')}
    >
      <form onSubmit={handleRequest} className="flex flex-col gap-[18px]">
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
        <Field
          label={t('auth.forgot.email')}
          icon={Mail}
          type="email"
          placeholder={t('auth.forgot.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={t('auth.forgot.emailHint')}
        />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('auth.forgot.step1Submitting') : t('auth.forgot.step1Submit')}
          {!submitting && <ArrowLeft size={17} />}
        </button>
      </form>

      <div
        className="text-center mt-6 text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('auth.forgot.backLogin')}{' '}
        <a className="link" onClick={() => navigate('/login')}>
          {t('auth.forgot.signIn')}
        </a>
      </div>
    </AuthShell>
  );
}
