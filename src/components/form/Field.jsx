import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import FieldLabel from './FieldLabel';

export default function Field({
  label,
  icon: Icon,
  type = 'text',
  error,
  hint,
  // Three-state marker (see FieldLabel). Pulled out of `props` on
  // purpose so it never lands on the <input> as the native `required`
  // attribute — validation here is ours, not the browser's.
  required,
  ...props
}) {
  const { dir } = useTranslation();
  return (
    <div className="animate-fade-up">
      <FieldLabel label={label} required={required} />
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
