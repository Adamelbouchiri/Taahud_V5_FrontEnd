import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Check, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import { auth } from '../services';

/* ============================================================
 *  OtpPage — /otp
 *  ----------------------------------------------------------------
 *  Reached after register (where the backend auto-sends an OTP)
 *  or after login when the user's phone isn't verified yet. The
 *  bearer token has already been stored in localStorage by then,
 *  so /auth/me, /auth/otp/send, /auth/otp/verify all work.
 *
 *  We pull the real phone number on mount so the subtitle shows
 *  the user's actual number (masked) instead of a placeholder.
 * ============================================================ */

/* Mask a phone like "+966500000001" → "+966 50 *** **01"
   so we don't print the full number on screen. Returns a string
   formatted left-to-right; the JSX wrapper applies dir="ltr". */
function maskPhone(phone) {
  if (!phone) return '';
  // Normalize: strip everything but digits, then re-format.
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 6) return phone;
  // Saudi format: 966 XX XXX XXXX
  const cc = digits.slice(0, 3);          // 966
  const head = digits.slice(3, 5);        // 5X
  const tail = digits.slice(-2);          // last two
  const middleStars = '••• ••';           // visual placeholder
  return `+${cc} ${head} ${middleStars}${tail}`;
}

export default function OtpPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = useState(45);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phone, setPhone] = useState('');
  const inputs = useRef([]);

  // Pull the authenticated user's phone for the subtitle.
  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((user) => {
        if (!cancelled && user?.phone) setPhone(user.phone);
      })
      .catch(() => {
        // If /auth/me fails (no token, network error), the page
        // still works — we just show no phone in the subtitle.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST /api/auth/otp/verify  (auth required — token already
  // stored after register or login).
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const submitCode = async (code) => {
    setVerifying(true);
    try {
      await auth.verifyOtp({ otp: code });
      setVerified(true);
      // User is already authenticated — drop them in the dashboard.
      setTimeout(() => navigate('/dashboard'), 1600);
    } catch {
      setError(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError(false);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) {
      setTimeout(() => submitCode(next.join('')), 250);
    }
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i < 5) inputs.current[i + 1]?.focus();
    if (e.key === 'ArrowRight' && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('');
    while (next.length < 6) next.push('');
    setDigits(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST /api/auth/otp/send  (auth required)
  // No body; backend pulls phone from the authenticated user.
  // Returns 422 if phone is already verified.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const resend = async () => {
    if (seconds > 0) return;
    setSeconds(45);
    setDigits(['', '', '', '', '', '']);
    setError(false);
    inputs.current[0]?.focus();
    try {
      await auth.resendOtp();
    } catch {
      // Silent — could surface a toast. Timer already restarted.
    }
  };

  if (verified) {
    return (
      <AuthShell title="تم التحقق بنجاح" subtitle="سيتم تحويلك إلى حسابك خلال لحظات...">
        <div className="flex flex-col items-center gap-4 py-8 animate-fade-up">
          <div className="bg-secondary flex items-center justify-center w-[76px] h-[76px] rounded-full animate-ring-pulse">
            <Check size={36} color="white" strokeWidth={2.5} />
          </div>
          <p className="text-muted text-sm">تم تأكيد رقم هاتفك بنجاح.</p>
        </div>
      </AuthShell>
    );
  }

  const allFilled = digits.every((d) => d !== '');

  return (
    <AuthShell
      kicker="خطوة أخيرة"
      title="تحقّق من رقم هاتفك"
      subtitle={
        phone ? (
          <>
            أدخل الرمز المكوّن من ٦ أرقام المُرسل إلى{' '}
            <span
              className="text-ink font-semibold inline-block"
              style={{ direction: 'ltr' }}
            >
              {maskPhone(phone)}
            </span>
          </>
        ) : (
          'أدخل الرمز المكوّن من ٦ أرقام المُرسل إلى رقم هاتفك.'
        )
      }
      onBack={() => navigate('/register')}
    >
      <div
        className="flex justify-between gap-2 mb-7"
        style={{ direction: 'ltr' }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={`otp ${d ? 'filled' : ''} ${error ? 'error' : ''} flex-1 min-w-0`}
          />
        ))}
      </div>

      {error && (
        <p
          className="text-[13.5px] text-danger mb-4 px-3.5 py-2.5 rounded-[10px] text-center animate-fade-up"
          style={{ background: 'rgba(185,28,28,0.06)' }}
        >
          الرمز غير صحيح. حاول مرة أخرى.
        </p>
      )}

      <button
        className="btn-primary"
        onClick={() => allFilled && submitCode(digits.join(''))}
        disabled={!allFilled || verifying}
      >
        {verifying ? 'جارٍ التحقّق...' : 'تأكيد الرمز'}
        {!verifying && <Shield size={17} />}
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-5 text-[13.5px] text-muted">
        <span>لم تصلك الرسالة؟</span>
        {seconds > 0 ? (
          <span className="text-ink-soft font-medium">
            إعادة الإرسال خلال {String(seconds).padStart(2, '0')} ث
          </span>
        ) : (
          <button
            onClick={resend}
            className="link bg-transparent border-0 p-0 inline-flex items-center gap-1 cursor-pointer text-[13.5px]"
          >
            <RefreshCw size={13} />
            <span>إعادة الإرسال</span>
          </button>
        )}
      </div>

      <div className="mt-7 px-4 py-3.5 bg-cream rounded-[11px] text-[12.5px] text-muted leading-relaxed flex items-start gap-2.5">
        <Shield size={16} className="flex-shrink-0 mt-0.5 text-secondary" />
        <span>
          لا تشارك هذا الرمز مع أحد. لن يطلبه منك فريق تعاهد أبداً عبر الهاتف أو الرسائل.
        </span>
      </div>
    </AuthShell>
  );
}
