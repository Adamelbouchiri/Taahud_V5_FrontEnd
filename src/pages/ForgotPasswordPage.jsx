import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Field from '../components/form/Field';
import PasswordField from '../components/form/PasswordField';
import { auth } from '../services';

/* ============================================================
 *  ForgotPasswordPage
 *  ----------------------------------------------------------------
 *  Two-step flow on a single page:
 *
 *    1. request — user enters their email; we call
 *       POST /auth/forgot-password and the BE emails a 6-digit code.
 *    2. reset   — user enters the code + new password; we call
 *       POST /auth/reset-password. On success the BE revokes every
 *       token for the account, so we route to /login.
 *
 *  The BE response on step 1 is identical for known/unknown emails
 *  (privacy by design). We treat any 2xx as "sent" and advance.
 * ============================================================ */

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState('request'); // request | reset | done
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  /* -------------------------------------------------------------
   * Step 1 — request a code
   * ----------------------------------------------------------- */
  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSubmitting(true);
    try {
      await auth.forgotPassword({ email });
      setStep('reset');
    } catch (err) {
      setError(err.message || 'تعذّر إرسال الرمز. تحقّق من بريدك الإلكتروني.');
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------
   * Step 2 — submit the code + new password
   * ----------------------------------------------------------- */
  const handleReset = async (e) => {
    e.preventDefault();
    const ve = {};
    if (!/^\d{6}$/.test(code.trim())) ve.code = 'الرمز مكوّن من ٦ أرقام.';
    if (!password || password.length < 8)
      ve.password = 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل.';
    if (password !== confirmation)
      ve.confirmation = 'تأكيد كلمة المرور غير مطابق.';
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
      setError(err.message || 'تعذّر إعادة تعيين كلمة المرور.');
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------
   * Step 3 — success card
   * ----------------------------------------------------------- */
  if (step === 'done') {
    return (
      <AuthShell
        title="تمّ تغيير كلمة المرور"
        subtitle="يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة."
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

        <button
          className="btn-primary mt-4"
          onClick={() => navigate('/login')}
        >
          الانتقال إلى تسجيل الدخول
          <ArrowLeft size={17} />
        </button>
      </AuthShell>
    );
  }

  /* -------------------------------------------------------------
   * Step 2 view — code + new password
   * ----------------------------------------------------------- */
  if (step === 'reset') {
    return (
      <AuthShell
        kicker="استرجاع الحساب"
        title="أدخل الرمز وكلمة المرور الجديدة"
        subtitle={
          <>
            أرسلنا رمزاً مكوّناً من ٦ أرقام إلى{' '}
            <span className="text-ink font-semibold">{email}</span>. أدخله أدناه
            مع كلمة المرور الجديدة.
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
                color: '#b91c1c',
                fontSize: 13.5,
              }}
            >
              {error}
            </div>
          )}

          <Field
            label="الرمز"
            icon={KeyRound}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={errors.code}
            hint="٦ أرقام، صالحة لمدّة ١٥ دقيقة."
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
            placeholder="أعد إدخال كلمة المرور"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.confirmation}
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
            {!submitting && <ArrowLeft size={17} />}
          </button>

          <div className="text-center mt-2 text-sm text-muted">
            لم يصل الرمز؟{' '}
            <button
              type="button"
              className="link bg-transparent border-0 p-0 cursor-pointer"
              onClick={() => {
                setStep('request');
                setError('');
              }}
            >
              أعد المحاولة
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  /* -------------------------------------------------------------
   * Step 1 view — request the code
   * ----------------------------------------------------------- */
  return (
    <AuthShell
      kicker="استرجاع الحساب"
      title="نسيت كلمة المرور؟"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رمزاً لإعادة تعيين كلمة المرور."
      onBack={() => navigate('/login')}
    >
      <form onSubmit={handleRequest} className="flex flex-col gap-[18px]">
        {error && (
          <div
            className="p-3.5 rounded-[11px] animate-fade-up"
            style={{
              background: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.18)',
              color: '#b91c1c',
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}
        <Field
          label="البريد الإلكتروني"
          icon={Mail}
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="أدخل البريد المرتبط بحسابك."
        />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'جارٍ الإرسال...' : 'إرسال رمز الاسترجاع'}
          {!submitting && <ArrowLeft size={17} />}
        </button>
      </form>

      <div className="text-center mt-6 text-sm text-muted">
        تذكرت كلمة المرور؟{' '}
        <a className="link" onClick={() => navigate('/login')}>
          سجّل الدخول
        </a>
      </div>
    </AuthShell>
  );
}
