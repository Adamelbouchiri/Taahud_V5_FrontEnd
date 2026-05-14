import React from 'react';
import { Phone } from 'lucide-react';

export default function PhoneField({
  label = 'رقم الهاتف',
  value,
  onChange,
  error,
  hint,
  countryCode = '٩٦٦+',
  placeholder = '5X XXX XXXX',
}) {
  return (
    <div className="animate-fade-up">
      <label className="field-label">{label}</label>
      <div className="flex gap-2">
        <span className="phone-cc">{countryCode}</span>
        <div className="relative flex-1">
          <div className="absolute top-1/2 -translate-y-1/2 end-[14px] text-muted pointer-events-none flex">
            <Phone size={17} strokeWidth={1.7} />
          </div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`field ${error ? 'error' : ''}`}
          />
        </div>
      </div>
      {error && <p className="field-err">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}
