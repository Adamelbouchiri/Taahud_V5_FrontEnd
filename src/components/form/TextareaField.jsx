import React from 'react';

export default function TextareaField({
  label,
  error,
  hint,
  rows = 4,
  ...props
}) {
  return (
    <div className="animate-fade-up">
      <label className="field-label">{label}</label>
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
