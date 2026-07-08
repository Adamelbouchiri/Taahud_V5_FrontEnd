import React from 'react';
import { Phone } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

// A well-formed Saudi mobile (the local part after the +966 prefix):
// exactly 9 digits starting with 5, with no leading zero. Used to gate
// the login/register submit buttons.
export function isValidSaudiPhone(value) {
  const digits = (value || '').replace(/\D/g, '');
  return /^5\d{8}$/.test(digits);
}

export default function PhoneField({
  label,
  value,
  onChange,
  error,
  hint,
  countryCode,
  placeholder,
}) {
  const { t } = useTranslation();
  // Saudi numbers go in without the local leading zero (+966 5X…, not 05X…)
  // and the local part always starts with 5. Warn — don't block — when the
  // first digit is wrong: a leading zero gets stripped on submit, any other
  // non-5 start just isn't a valid Saudi mobile.
  const raw = value || '';
  const digits = raw.replace(/\D/g, '');
  const firstDigit = digits[0];
  const hasLeadingZero = firstDigit === '0';
  const hasInvalidStart = !!firstDigit && firstDigit !== '5' && !hasLeadingZero;
  // Anything that isn't a digit or a formatting space (letters, +, -, #, …)
  // doesn't belong in the number — warn so a stray symbol isn't silently
  // stripped on submit.
  const hasSymbols = /[^\d\s]/.test(raw);
  return (
    <div className="animate-fade-up">
      <label className="field-label">{label || t('auth.phoneFieldLabel')}</label>
      {/* Force the whole phone row LTR so the +966 country code always sits on
          the left of the input (it's the first flex child, which would flip to
          the right in the RTL/Arabic layout) and the digits read left-to-right,
          matching international phone-number convention. */}
      <div className="flex gap-2" dir="ltr">
        <span className="phone-cc">
          {countryCode || t('auth.phoneCountryCode')}
        </span>
        <div className="relative flex-1">
          <div className="absolute top-1/2 -translate-y-1/2 end-[14px] text-muted pointer-events-none flex">
            <Phone size={17} strokeWidth={1.7} />
          </div>
          <input
            type="tel"
            inputMode="numeric"
            // Numbers read left-to-right, so keep the input LTR too. This also
            // pins the icon's inline-end (end-[14px]) and the field's 44px
            // padding-inline gap to the right — the same side — so the digits
            // never run under the icon.
            dir="ltr"
            placeholder={placeholder || t('auth.phonePlaceholder')}
            value={value}
            onChange={onChange}
            className={`field ${error ? 'error' : ''}`}
          />
        </div>
      </div>
      {error && <p className="field-err">{error}</p>}
      {!error && hasLeadingZero && (
        <p
          className="field-hint"
          style={{ color: 'var(--accent-gold)', fontWeight: 600 }}
        >
          {t('auth.phoneLeadingZeroWarning')}
        </p>
      )}
      {!error && hasInvalidStart && (
        <p
          className="field-hint"
          style={{ color: 'var(--accent-gold)', fontWeight: 600 }}
        >
          {t('auth.phoneMustStartWithFive')}
        </p>
      )}
      {!error && !hasLeadingZero && !hasInvalidStart && hasSymbols && (
        <p
          className="field-hint"
          style={{ color: 'var(--accent-gold)', fontWeight: 600 }}
        >
          {t('auth.phoneDigitsOnly')}
        </p>
      )}
      {hint && !error && !hasLeadingZero && !hasInvalidStart && !hasSymbols && (
        <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}
