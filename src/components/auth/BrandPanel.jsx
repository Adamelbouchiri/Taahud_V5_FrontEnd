import React from 'react';
import Logo from '../Logo';

export default function BrandPanel() {
  return (
    <aside
      className="hidden lg:flex relative overflow-hidden flex-col"
      style={{
        width: '46%',
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #2c2f7c 0%, #1f2258 100%)',
      }}
    >
      {/* Dot grid pattern */}
      <svg
        className="absolute inset-0 opacity-10"
        width="100%"
        height="100%"
        aria-hidden
      >
        <defs>
          <pattern
            id="taahud-dots"
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#taahud-dots)" />
      </svg>

      {/* Faint giant character */}
      <div
        className="animate-float-slow font-display select-none"
        style={{
          position: 'absolute',
          bottom: -140,
          insetInlineStart: -90,
          fontSize: 520,
          lineHeight: 0.7,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.045)',
        }}
      >
        ت
      </div>

      {/* Concentric arcs accent */}
      <svg
        className="absolute opacity-20"
        style={{ top: -80, insetInlineEnd: -80 }}
        width="320"
        height="320"
        viewBox="0 0 320 320"
        aria-hidden
      >
        <circle cx="160" cy="160" r="60" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="160" cy="160" r="100" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="160" cy="160" r="140" fill="none" stroke="#1a8a5d" strokeWidth="1.5" />
      </svg>

      {/* Inner-edge green accent line */}
      <div
        className="absolute top-0 bottom-0 bg-secondary"
        style={{ insetInlineStart: 0, width: 4 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between text-white flex-1 p-14">
        {/* Logo */}
        <Logo height={56} variant="white" />

        {/* Hero */}
        <div className="animate-fade-up">
          <div className="flex items-center gap-3.5 mb-7">
            <div className="bg-secondary-light" style={{ width: 36, height: 2 }} />
            <span
              className="font-medium"
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.22em',
              }}
            >
              منصّة المقاولات والتوريد
            </span>
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(72px, 8vw, 104px)',
              fontWeight: 700,
              lineHeight: 0.95,
              margin: 0,
              marginBottom: 26,
              letterSpacing: '-0.01em',
            }}
          >
            تعاهد
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.75,
              color: 'rgba(255,255,255,0.78)',
              maxWidth: 420,
              margin: 0,
              fontWeight: 300,
            }}
          >
            نلتقي على عهدٍ من الثقة. منصّةٌ تربط العملاء والمطوّرين بمقدّمي
            الخدمات والموردين في رحلة إنجازٍ موثوقة وملتزمة.
          </p>

          {/* Stats */}
          <div className="flex gap-7 mt-10">
            {[
              { n: '٢٤٠٠+', l: 'مقدم خدمة موثوق' },
              { n: '٤٨ مدينة', l: 'تغطية' },
              { n: '٤٫٩', l: 'تقييم العملاء' },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display" style={{ fontSize: 22, fontWeight: 600 }}>
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.55)',
                    marginTop: 4,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-between items-center pt-6"
          style={{
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.5)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span>© ٢٠٢٦ تعاهد</span>
          <div className="flex gap-6">
            <span className="cursor-pointer">الخصوصية</span>
            <span className="cursor-pointer">الشروط</span>
            <span className="cursor-pointer">الدعم</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
