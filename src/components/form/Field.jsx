import React from 'react';

export default function Field({
  label,
  icon: Icon,
  type = 'text',
  error,
  hint,
  ...props
}) {
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
          className={`field ${error ? 'error' : ''} ${!Icon ? 'field-no-icon' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}
