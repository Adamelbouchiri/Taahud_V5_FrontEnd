import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTES = [
  { path: '/', label: 'Landing' },
  { path: '/login', label: 'دخول' },
  { path: '/register', label: 'تسجيل' },
  { path: '/dashboard', label: 'لوحة' },
  { path: '/projects', label: 'تصفّح' },
  { path: '/projects/new', label: '+ مشروع' },
  { path: '/projects/101', label: 'تفاصيل' },
  { path: '/projects/101/apply', label: 'تقديم' },
];

export default function DevNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-4 z-50 flex gap-1.5 p-1.5 bg-white border border-app-border rounded-full"
      style={{
        insetInlineStart: 16,
        boxShadow: '0 8px 24px rgba(15,17,41,0.08)',
      }}
    >
      {ROUTES.map((r) => {
        const active = location.pathname === r.path;
        return (
          <button
            key={r.path}
            onClick={() => navigate(r.path)}
            className={`text-xs font-semibold cursor-pointer transition-all rounded-full px-3 py-1.5 ${
              active ? 'bg-primary text-white' : 'bg-transparent text-muted hover:text-primary'
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
