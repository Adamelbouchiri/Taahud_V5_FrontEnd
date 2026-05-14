import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ label, error, hint, ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="animate-fade-up">
      <label className="field-label">{label}</label>
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 end-[14px] text-muted pointer-events-none flex">
          <Lock size={17} strokeWidth={1.7} />
        </div>
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          className="absolute top-1/2 -translate-y-1/2 start-[12px] text-muted bg-transparent border-0 cursor-pointer p-1 flex hover:text-primary transition-colors"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
        <input
          type={show ? 'text' : 'password'}
          className={`field ${error ? 'error' : ''}`}
          style={{ paddingLeft: 44 }}
          {...props}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}
