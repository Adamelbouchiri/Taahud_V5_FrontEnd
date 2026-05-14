import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Compass } from 'lucide-react';

/* ============================================================
 *  Hero — landing page first viewport
 *  ----------------------------------------------------------------
 *  Centered layout (per screenshots):
 *    - Pill: "منصة سعودية مرخصة" with green dot
 *    - Massive two-line serif headline, second line in gold
 *    - Subtitle paragraph
 *    - Two CTAs side by side
 *    - Stats strip (24/7 / 92% / +450 / +1200) baked into the
 *      same viewport — no separate stats section
 *
 *  Background: faint perpendicular grid lines for the technical /
 *  blueprint feel.
 * ============================================================ */

const STATS = [
  { value: '24/7', label: 'دعم متواصل' },
  { value: '92%', label: 'رضا المستخدمين' },
  { value: '+450', label: 'مشروع نشط' },
  { value: '+1200', label: 'مقاول مسجّل' },
];

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#fafaf6' }}
    >
      {/* Faint grid background — fades out near edges via radial mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(15,17,71,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15,17,71,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          // Fade the grid out near the section edges so the lines feel
          // like they're emanating from the center rather than tiling
          // edge-to-edge. Both prefixed and standard properties for
          // wider browser support.
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
          maskImage:
            'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
        }}
      />

      {/* Soft radial spotlight under the headline */}
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background:
            'radial-gradient(ellipse, rgba(19,109,74,0.06), transparent 70%)',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 pt-[120px] lg:pt-[160px] pb-14 lg:pb-20">
        <div className="text-center max-w-[820px] mx-auto">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'white',
              border: '1px solid #e5e3dc',
              fontSize: 12,
              fontWeight: 600,
              color: '#3a3a52',
              boxShadow: '0 2px 8px rgba(15,17,41,0.04)',
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: '#136d4a',
                boxShadow: '0 0 0 3px rgba(19,109,74,0.15)',
              }}
            />
            منصة سعودية مرخّصة
          </div>

          {/* Headline */}
          <h1
            className="font-display m-0 mb-6 animate-fade-up"
            style={{
              fontSize: 'clamp(40px, 6.4vw, 84px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#0f1147',
            }}
          >
            مشاريع أكثر.
            <br />
            <span style={{ color: '#c9a35a' }}>مشاكل أقل.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="m-0 mb-9 animate-fade-up max-w-[640px] mx-auto"
            style={{
              fontSize: 'clamp(15px, 1.4vw, 17.5px)',
              lineHeight: 1.75,
              color: '#5a5b78',
            }}
          >
            منصة تعاهُد تربط المقاولين والموردين والمطوّرين العقاريين في سوق
            رقمي ذكي — كل ما تحتاجه لإدارة مشاريعك في مكان واحد.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-14 lg:mb-16 animate-fade-up">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
              style={{
                fontSize: 14.5,
                padding: '13px 24px',
                background: '#0f1147',
                color: 'white',
                border: '1px solid #0f1147',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(15,17,71,0.20)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1a1d5e';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0f1147';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Sparkles size={15} strokeWidth={2} />
              ابدأ مجاناً الآن
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('services');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
              style={{
                fontSize: 14.5,
                padding: '13px 24px',
                background: 'white',
                color: '#3a3a52',
                border: '1px solid #d8d6cd',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0f1147';
                e.currentTarget.style.color = '#0f1147';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d8d6cd';
                e.currentTarget.style.color = '#3a3a52';
              }}
            >
              <Compass size={15} strokeWidth={1.8} />
              استكشف الخدمات
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-12 max-w-[800px] mx-auto animate-fade-up">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="font-display"
                  style={{
                    fontSize: 'clamp(28px, 3.4vw, 40px)',
                    fontWeight: 700,
                    color: '#0f1147',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-2"
                  style={{
                    fontSize: 12.5,
                    color: '#7a7a8c',
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
