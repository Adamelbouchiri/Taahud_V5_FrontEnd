import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mail,
  User,
  MapPin,
  ArrowLeft,
  Handshake,
  AlertTriangle,
} from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Field from '../components/form/Field';
import SelectField from '../components/form/SelectField';
import PasswordField from '../components/form/PasswordField';
import PhoneField, { isValidSaudiPhone } from '../components/form/PhoneField';
import { cityOptions } from '../config/cityTranslations';
import { OTP_ENABLED } from '../config/constants';
import { brokers, auth } from '../services';
import { hasToken } from '../services/session';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  InvitationPage — /invitations/:token   (PUBLIC)
 *  ----------------------------------------------------------------
 *  Method D's landing page. The broker sent this URL by hand, so the
 *  visitor arrives with no session, an expired link, or occasionally
 *  someone else's session — all three have to read sensibly.
 *
 *  Three terminal states before the form is ever shown:
 *    404 → the token doesn't exist (mistyped / truncated link)
 *    410 → expired, cancelled, or already accepted
 *    other → transient; offer a retry rather than a dead end
 *
 *  Accepting creates the account, links it to the broker, and starts
 *  the 90-day auto-link window. The response carries a bearer token,
 *  so the visitor is signed in on the spot — services/auth.js installs
 *  the session, replacing any previous one wholesale.
 *
 *  The form mirrors RegisterPage's fields minus the account-type
 *  picker: an invited owner is always an individual, and the BE
 *  decides that, not this form.
 * ============================================================ */
export default function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  // 'loading' | 'valid' | 'gone' | 'missing' | 'error'
  const [state, setState] = useState('loading');
  const [invitation, setInvitation] = useState(null);
  const [lookupError, setLookupError] = useState('');

  const [form, setForm] = useState({
    name: '',
    city: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Read once on mount: a session that gets replaced by accepting
  // shouldn't make the warning disappear mid-flow.
  const [wasSignedIn] = useState(() => hasToken());

  const load = useCallback(() => {
    setState('loading');
    brokers.invitations.show(token).then((res) => {
      if (res.valid) {
        setInvitation(res.invitation);
        // Prefill whatever the broker already knew about the invitee.
        setForm((prev) => ({
          ...prev,
          name: res.invitation?.invitee_name || '',
          email: res.invitation?.invitee_email || '',
          phone: localPhone(res.invitation?.invitee_phone),
        }));
        setState('valid');
        return;
      }
      setLookupError(res.message || '');
      setState(res.reason === 'error' ? 'error' : res.reason);
    });
  }, [token]);

  useEffect(load, [load]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t('auth.register.errors.nameMissing');
    if (!form.city) e.city = t('auth.register.errors.cityMissing');
    if (!form.phone) e.phone = t('auth.register.errors.phoneMissing');
    if (!form.email.trim()) e.email = t('auth.register.errors.emailMissing');
    if (!form.password || form.password.length < 8) {
      e.password = t('auth.register.errors.passwordShort');
    }
    if (form.password !== form.confirm) {
      e.confirm = t('auth.register.errors.passwordMismatch');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const digits = form.phone.replace(/\D/g, '').replace(/^0+/, '');
      const res = await auth.acceptInvitation(token, {
        name: form.name.trim(),
        city: form.city,
        phone: `+966${digits}`,
        email: form.email.trim(),
        password: form.password,
      });

      // Same conversion event register() fires — acceptInvitation
      // throws on failure, so reaching here means an account exists.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'registration_complete' });

      // The accept response describes the referral, not the phone
      // state, so ask /auth/me for the live verification flag. It
      // rewrites the snapshot the session was seeded with, which is
      // what decides whether the guards let the user into the app.
      let verified = res?.user?.is_phone_verified === true;
      try {
        const me = await auth.me({ force: true });
        verified = me?.is_phone_verified !== false;
      } catch {
        // A failed /me isn't fatal here: the token is installed and
        // the guards will re-resolve on the next navigation.
      }
      navigate(!OTP_ENABLED || verified ? '/dashboard' : '/otp', {
        replace: true,
      });
    } catch (err) {
      // A 410 mid-form means the invitation died between load and
      // submit (cancelled, or accepted on another device) — swap the
      // whole page for the terminal state rather than showing an
      // inline error above a form that can no longer succeed.
      if (err?.status === 410) {
        setLookupError(err.message || '');
        setState('gone');
        return;
      }
      setSubmitError(err.message || t('auth.register.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <AuthShell title={t('invitation.loading')}>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="shimmer"
              style={{ height: 46, width: '100%', borderRadius: 11 }}
            />
          ))}
        </div>
      </AuthShell>
    );
  }

  if (state !== 'valid') {
    const copy =
      state === 'missing'
        ? 'invitation.notFound'
        : state === 'gone'
          ? 'invitation.expired'
          : 'invitation.error';
    return (
      <AuthShell
        title={t(`${copy}.title`)}
        subtitle={t(`${copy}.body`)}
      >
        <div className="flex flex-col gap-4">
          {/* The BE's own wording is often more specific than ours
              (which status killed the token), so keep it visible. */}
          {lookupError && (
            <div
              className="p-3.5 rounded-[11px] flex items-start gap-2.5"
              style={{
                background: 'var(--bg-cream)',
                border: '1px solid var(--border-default)',
                fontSize: 13,
                color: 'var(--text-ink-soft)',
              }}
            >
              <AlertTriangle
                size={16}
                strokeWidth={1.8}
                style={{ color: '#b8862a', flexShrink: 0, marginTop: 1 }}
              />
              {lookupError}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {state === 'error' && (
              <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={load}>
                {t('invitation.error.retry')}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '11px 18px' }}
              onClick={() => navigate('/')}
            >
              {t('invitation.home')}
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  const broker = invitation?.broker;
  const opportunity = invitation?.opportunity;

  return (
    <AuthShell
      kicker={t('invitation.kicker')}
      title={t('invitation.title', { name: invitation?.invitee_name || '' })}
      subtitle={t('invitation.subtitle', { broker: broker?.name || '' })}
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* What the invitee is being invited TO — the broker's name and
            the opportunity they registered. */}
        <div
          className="p-4 rounded-[12px] flex flex-col gap-2.5"
          style={{
            background: 'rgba(19,109,74,0.06)',
            border: '1px solid rgba(19,109,74,0.18)',
          }}
        >
          <SummaryRow
            icon={Handshake}
            label={t('invitation.brokerLabel')}
            value={broker?.name}
          />
          {opportunity?.title && (
            <SummaryRow
              label={t('invitation.opportunityLabel')}
              value={opportunity.title}
            />
          )}
          <SummaryRow
            label={t('invitation.feeLabel')}
            value={
              opportunity?.fee_percent != null
                ? t('broker.fee.percent', { value: opportunity.fee_percent })
                : t('invitation.feeNotSet')
            }
          />
        </div>

        {/* Accepting installs a new session, so an already-signed-in
            visitor is about to be signed out of the current account. */}
        {wasSignedIn && (
          <div
            className="p-3.5 rounded-[11px] flex items-start gap-2.5"
            style={{
              background: 'rgba(184,134,42,0.10)',
              border: '1px solid rgba(184,134,42,0.22)',
              fontSize: 13,
              color: 'var(--text-ink-soft)',
            }}
          >
            <AlertTriangle
              size={16}
              strokeWidth={1.8}
              style={{ color: '#b8862a', flexShrink: 0, marginTop: 1 }}
            />
            {t('invitation.signedInWarning')}
          </div>
        )}

        {submitError && (
          <div
            className="p-3.5 rounded-[11px]"
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

        <div>
          <div
            className="font-semibold mb-1"
            style={{ fontSize: 14, color: 'var(--text-ink)' }}
          >
            {t('invitation.formTitle')}
          </div>
          <p className="m-0" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {t('invitation.formHint')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Field
            label={t('auth.register.name')}
            icon={User}
            placeholder={t('auth.register.namePlaceholder')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
          />
          <SelectField
            label={t('auth.register.city')}
            icon={MapPin}
            options={cityOptions(lang)}
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            error={errors.city}
            placeholder={t('auth.register.cityPlaceholder')}
          />
        </div>

        <PhoneField
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          error={errors.phone}
          hint={t('auth.register.phoneHint')}
        />

        <Field
          label={t('auth.register.email')}
          icon={Mail}
          type="email"
          placeholder={t('auth.register.emailPlaceholder')}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />

        <div className="grid grid-cols-2 gap-3.5">
          <PasswordField
            label={t('auth.register.password')}
            placeholder={t('auth.register.passwordPlaceholder')}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
          />
          <PasswordField
            label={t('auth.register.passwordConfirm')}
            placeholder={t('auth.register.passwordConfirmPlaceholder')}
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            error={errors.confirm}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || !isValidSaudiPhone(form.phone)}
        >
          {submitting ? t('invitation.submitting') : t('invitation.submit')}
          {!submitting && <ArrowLeft size={17} />}
        </button>

        <p
          className="text-center text-sm m-0 mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('invitation.haveAccount')}{' '}
          <a className="link" onClick={() => navigate('/login')}>
            {t('invitation.signIn')}
          </a>
        </p>
      </form>
    </AuthShell>
  );
}

/* The BE stores the invitee phone in E.164 (+9665XXXXXXXX) but
   PhoneField edits only the local part after the +966 prefix. */
function localPhone(e164) {
  if (!e164) return '';
  const digits = String(e164).replace(/\D/g, '');
  return digits.startsWith('966') ? digits.slice(3) : digits;
}

function SummaryRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="inline-flex items-center gap-1.5"
        style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
      >
        {Icon && <Icon size={13} strokeWidth={1.9} style={{ color: '#136d4a' }} />}
        {label}
      </span>
      <span
        className="font-semibold text-end"
        style={{ fontSize: 13, color: 'var(--text-ink)' }}
      >
        {value}
      </span>
    </div>
  );
}
