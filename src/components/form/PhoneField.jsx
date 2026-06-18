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
  // Saudi numbers go in without the local leading zero (+966 5X…, not 05X…).
  // Warn — don't block — when the user types a leading zero; submission
  // strips it anyway.
  const hasLeadingZero = /^\s*0/.test(value || '');
  return (
    <div className="animate-fade-up">
      <label className="field-label">{label || t('auth.phoneFieldLabel')}</label>
      <div className="flex gap-2">
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
      {hint && !error && !hasLeadingZero && (
        <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}
