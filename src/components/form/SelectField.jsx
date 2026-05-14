import React from 'react';

export default function SelectField({
  label,
  icon: Icon,
  options = [],
  error,
  placeholder = 'اختر...',
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
        <select className={`field ${error ? 'error' : ''}`} {...props}>
          <option value="">{placeholder}</option>
          {options.map((opt) =>
            typeof opt === 'string' ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          )}
        </select>
      </div>
      {error && <p className="field-err">{error}</p>}
    </div>
  );
}
