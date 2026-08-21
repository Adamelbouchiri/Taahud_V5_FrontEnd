import React from 'react';
import FieldLabel from './FieldLabel';

export default function TextareaField({
  label,
  error,
  hint,
  rows = 4,
  // See Field.jsx — kept off the <textarea> so the browser doesn't
  // start enforcing it alongside our own validation.
  required,
  ...props
}) {
  return (
    <div className="animate-fade-up">
      <FieldLabel label={label} required={required} />
      <textarea
        rows={rows}
        className={`field field-no-icon ${error ? 'error' : ''}`}
        style={{ resize: 'vertical', minHeight: rows * 22 }}
        {...props}
      />
      {error && <p className="field-err">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}
