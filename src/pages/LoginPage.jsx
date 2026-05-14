import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Field from '../components/form/Field';
import PasswordField from '../components/form/PasswordField';
import PhoneField from '../components/form/PhoneField';
import { auth } from '../services';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
      // Drop a leading 0 if present (some users type "05XXXXXXXX")
      const trimmed = digits.replace(/^0+/, '');
      return `+966${trimmed}`;
    }
    return identifier.trim();
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST /api/auth/login
  // Service stores the token; we route based on user.is_phone_verified.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await auth.login({
        login: buildLoginField(),
        password,
      });
      // Backend may or may not surface is_phone_verified; treat
      // missing as "verified" so we don't trap users on /otp.
      const verified =
        res?.user?.is_phone_verified !== false;
      if (!verified) {
        navigate('/otp');
      } else {
        // Send back to wherever they were trying to go, or to the
        // dashboard if they came in cold.
        navigate(redirectAfterLogin, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مجدّداً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker="مرحباً بعودتك"
      title="سجّل الدخول إلى حسابك"
      subtitle="أدخل بياناتك لمتابعة رحلتك في تعاهد."
    >
      <div className="pill-group animate-fade-up mb-5">
        <button
          type="button"
          className={`pill ${mode === 'phone' ? 'active' : ''}`}
          onClick={() => setMode('phone')}
        >
          رقم الهاتف
        </button>
        <button
          type="button"
          className={`pill ${mode === 'email' ? 'active' : ''}`}
          onClick={() => setMode('email')}
        >
          البريد الإلكتروني
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
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

        {mode === 'phone' ? (
          <PhoneField
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        ) : (
          <Field
            label="البريد الإلكتروني"
            icon={Mail}
            type="email"
            placeholder="name@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        )}

        <PasswordField
          label="كلمة المرور"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-between items-center mt-0.5 mb-1.5">
          <label className="flex items-center gap-2 text-[13.5px] text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              className="w-4 h-4"
              style={{ accentColor: '#2c2f7c' }}
            />
            <span>تذكّرني</span>
          </label>
          <a
            className="link text-[13.5px]"
            onClick={() => navigate('/forgot-password')}
          >
            نسيت كلمة المرور؟
          </a>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'جارٍ التسجيل...' : 'تسجيل الدخول'}
          {!submitting && <ArrowLeft size={17} />}
        </button>

        <div className="flex items-center gap-3.5 my-2.5 text-muted text-[12.5px]">
          <div className="flex-1 h-px bg-app-border" />
          <span>أو</span>
          <div className="flex-1 h-px bg-app-border" />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/register')}
        >
          إنشاء حساب جديد
        </button>
      </form>

      <p className="text-center mt-7 text-muted text-[12.5px]">
        بالاستمرار، فإنك توافق على{' '}
        <a className="link">شروط الاستخدام</a> و
        <a className="link"> سياسة الخصوصية</a>.
      </p>
    </AuthShell>
  );
}
