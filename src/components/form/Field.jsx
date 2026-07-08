import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';

export default function Field({
  label,
  icon: Icon,
  type = 'text',
  error,
  hint,
  ...props
}) {
  const { dir } = useTranslation();
  return (
    <div className="animate-fade-up">
      <label className="field-label">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute top-1/2 -translate-y-1/2 end-[14px] text-muted pointer-events-none flex">
            <Icon size={17} strokeWidth={1.7} />
          </div>
        )}
        <input
          type={type}
          // Bind the writing direction to the app's: browsers render
          // email/tel/number/url inputs LTR by default, which in an RTL layout
          // pushes the text under the icon (which sits at the inline-end).
          dir={dir}
          className={`field ${error ? 'error' : ''} ${!Icon ? 'field-no-icon' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}
