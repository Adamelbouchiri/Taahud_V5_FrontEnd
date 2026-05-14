import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LayoutDashboard, Wrench } from 'lucide-react';
import Logo from './Logo';

/* ============================================================
 *  SupplierComingSoon
 *  ----------------------------------------------------------------
 *  Friendly "we're working on it" view for suppliers who hit any
 *  project-related page. Suppliers don't get the projects flow in
 *  V5 — that ships later with their own dedicated supplier flow
 *  (storefront, product listings, order management, etc.).
 *
 *  This component renders as either:
 *    - A standalone full page (default — used for /projects routes
 *      that live outside the dashboard layout)
 *    - An inline section (when `embedded` is true — used inside
 *      the dashboard home for suppliers)
 * ============================================================ */
export default function SupplierComingSoon({ embedded = false }) {
  const navigate = useNavigate();

  const content = (
    <div className="max-w-2xl mx-auto text-center animate-fade-up">
      <div
        className="mx-auto mb-6 flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(44,47,124,0.08)',
          color: '#2c2f7c',
        }}
      >
        <Package size={36} strokeWidth={1.7} />
      </div>

      <h1
        className="font-display text-ink m-0 mb-3"
        style={{
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
        }}
      >
        تجربة المورّدين قيد التطوير
      </h1>
      <p
        className="text-ink-soft m-0 mb-2"
        style={{ fontSize: 15.5, lineHeight: 1.7 }}
      >
        نعمل حالياً على تجهيز تجربة مخصّصة للمورّدين على المنصّة.
      </p>
      <p
        className="text-muted m-0 mb-8 inline-flex items-center gap-2"
        style={{ fontSize: 13 }}
      >
        <Wrench size={14} strokeWidth={1.7} />
        ستشمل عرض المنتجات في المتجر العام، إدارة المخزون، وطلبات التوريد.
      </p>

      <div
        className="p-6 rounded-[16px] mb-8 text-right"
        style={{
          background: 'white',
          border: '1px solid #e5e3dc',
        }}
      >
        <h3
          className="font-display text-ink m-0 mb-3"
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          ما يمكنك فعله الآن
        </h3>
        <ul className="m-0 p-0 space-y-3">
          <Bullet>تحديث ملفّك الشخصي وبيانات شركتك.</Bullet>
          <Bullet>إكمال التحقّق من رقم هاتفك.</Bullet>
          <Bullet>سنُعلمك بمجرّد جاهزية تجربة المورّدين.</Bullet>
        </ul>
      </div>

      {!embedded && (
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-white font-semibold transition-all"
          style={{
            fontSize: 14,
            background: '#2c2f7c',
            border: '1px solid #2c2f7c',
            cursor: 'pointer',
            boxShadow: '0 6px 14px rgba(44,47,124,0.22)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1f2258';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2c2f7c';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <LayoutDashboard size={15} strokeWidth={1.8} />
          العودة إلى لوحة التحكّم
        </button>
      )}
    </div>
  );

  if (embedded) {
    return <div className="py-12">{content}</div>;
  }

  // Standalone page — needs its own topbar since it's outside the
  // dashboard layout.
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      <header
        className="sticky top-0 z-30 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label="الرئيسية"
          >
            <Logo height={68} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 13,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cfcdc4';
              e.currentTarget.style.background = '#fafaf6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.background = 'white';
            }}
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
            لوحة التحكّم
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center px-6 py-12">{content}</main>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li
      className="list-none flex items-start gap-2.5"
      style={{ fontSize: 13.5, color: '#3a3a52', lineHeight: 1.65 }}
    >
      <span
        className="flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(19,109,74,0.1)',
          color: '#136d4a',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
