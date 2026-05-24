import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Check } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import { auth } from '../services';
import { OTP_ENABLED, OTP_EXPIRY_MINUTES } from '../config/constants';
import { useTranslation } from '../i18n/LanguageContext';

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

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 6) return phone;
  const cc = digits.slice(0, 3);
  const head = digits.slice(3, 5);
  const tail = digits.slice(-2);
  const middleStars = '••• ••';
  return `+${cc} ${head} ${middleStars}${tail}`;
}

const EXPIRY_SECONDS = OTP_EXPIRY_MINUTES * 60;

export default function OtpPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = useState(45);
  const [expirySeconds, setExpirySeconds] = useState(EXPIRY_SECONDS);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phone, setPhone] = useState('');
  const inputs = useRef([]);

  useEffect(() => {
    if (!OTP_ENABLED) {
      navigate('/dashboard', { replace: true });
      return undefined;
    }
    let cancelled = false;
    auth
      .me()
      .then((user) => {
        if (cancelled) return;
        if (user?.is_phone_verified !== false) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (user?.phone) setPhone(user.phone);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  useEffect(() => {
    if (expirySeconds <= 0) return;
    const id = setTimeout(() => setExpirySeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [expirySeconds]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const submitCode = async (code) => {
    setVerifying(true);
    try {
      await auth.verifyOtp({ otp: code });
      setVerified(true);
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

  const resend = async () => {
    if (seconds > 0) return;
    setSeconds(45);
    setExpirySeconds(EXPIRY_SECONDS);
    setDigits(['', '', '', '', '', '']);
    setError(false);
    inputs.current[0]?.focus();
    try {
      await auth.resendOtp();
    } catch {
      // silent
    }
  };

  if (verified) {
    return (
      <AuthShell
        title={t('auth.otp.verifiedTitle')}
        subtitle={t('auth.otp.verifiedSubtitle')}
      >
        <div className="flex flex-col items-center gap-4 py-8 animate-fade-up">
          <div className="bg-secondary flex items-center justify-center w-[76px] h-[76px] rounded-full animate-ring-pulse">
            <Check size={36} color="white" strokeWidth={2.5} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {t('auth.otp.verifiedConfirmed')}
          </p>
        </div>
      </AuthShell>
    );
  }

  const allFilled = digits.every((d) => d !== '');
  const phoneSubtitle = phone ? (
    <>
      {t('auth.otp.subtitleWithPhone', { phone: '__PHONE__' })
        .split('__PHONE__')
        .map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <span
                className="font-semibold inline-block"
                style={{ direction: 'ltr', color: 'var(--text-ink)' }}
              >
                {maskPhone(phone)}
              </span>
            )}
          </React.Fragment>
        ))}
    </>
  ) : (
    t('auth.otp.subtitleNoPhone')
  );

  return (
    <AuthShell
      kicker={t('auth.otp.kicker')}
      title={t('auth.otp.title')}
      subtitle={phoneSubtitle}
      onBack={() => navigate('/register')}
    >
      <div
        className="flex justify-between gap-2 mb-3"
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

      <p
        className="text-center text-[13px] mb-5"
        style={{
          color:
            expirySeconds > 0 ? 'var(--text-muted)' : 'var(--accent-danger)',
        }}
      >
        {expirySeconds > 0
          ? t('auth.otp.expiresIn', {
              time: `${Math.floor(expirySeconds / 60)}:${String(
                expirySeconds % 60,
              ).padStart(2, '0')}`,
            })
          : t('auth.otp.expired')}
      </p>

      {error && (
        <p
          className="text-[13.5px] mb-4 px-3.5 py-2.5 rounded-[10px] text-center animate-fade-up"
          style={{
            background: 'rgba(185,28,28,0.06)',
            color: 'var(--accent-danger)',
          }}
        >
          {t('auth.otp.errorWrong')}
        </p>
      )}

      <button
        className="btn-primary"
        onClick={() => allFilled && submitCode(digits.join(''))}
        disabled={!allFilled || verifying}
      >
        {verifying ? t('auth.otp.submitting') : t('auth.otp.submit')}
        {!verifying && <Shield size={17} />}
      </button>

      <div
        className="flex items-center justify-center gap-1.5 mt-5 text-[13.5px]"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>{t('auth.otp.notReceived')}</span>
        {seconds > 0 ? (
          <span
            className="font-medium"
            style={{ color: 'var(--text-ink-soft)' }}
          >
            {t('auth.otp.resendIn', { seconds: String(seconds).padStart(2, '0') })}
          </span>
        ) : (
          <button
            onClick={resend}
            className="link bg-transparent border-0 p-0 inline-flex items-center gap-1 cursor-pointer text-[13.5px]"
          >
            <RefreshCw size={13} />
            <span>{t('auth.otp.resend')}</span>
          </button>
        )}
      </div>

      <div
        className="mt-7 px-4 py-3.5 rounded-[11px] text-[12.5px] leading-relaxed flex items-start gap-2.5"
        style={{
          background: 'var(--bg-cream)',
          color: 'var(--text-muted)',
        }}
      >
        <Shield size={16} className="flex-shrink-0 mt-0.5 text-secondary" />
        <span>{t('auth.otp.securityHint')}</span>
      </div>
    </AuthShell>
  );
}
