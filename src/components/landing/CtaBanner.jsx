import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

/* ============================================================
 *  CtaBanner — final dark CTA block before the footer
 *  ----------------------------------------------------------------
 *  Full-width dark navy section with the same faint grid that
 *  appears in the hero. Pill chip "انضم اليوم", big white serif
 *  headline, subtitle, two buttons: white-filled register +
 *  gold-filled contact-us with a small dot.
 * ============================================================ */

export default function CtaBanner() {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden py-24 lg:py-28"
      style={{ background: '#0f1147' }}
    >
      {/* Faint grid background — fades out near edges via radial mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          // Same radial mask as Hero — keeps the grid centered and
          // soft instead of tiling all the way to the edges.
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
          maskImage:
            'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
        }}
      />

      {/* Soft top glow */}
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background:
            'radial-gradient(ellipse, rgba(201,163,90,0.12), transparent 70%)',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 text-center">
        {/* Eyebrow pill */}
        <div
          className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full animate-fade-up"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.75)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          انضم اليوم
        </div>

        {/* Headline */}
        <h2
          className="font-display m-0 mb-4 animate-fade-up"
          style={{
            fontSize: 'clamp(32px, 5vw, 60px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'white',
          }}
        >
          مشاريع أكثر تنتظرك
        </h2>

        {/* Subtitle */}
        <p
          className="m-0 mb-9 mx-auto max-w-[600px] animate-fade-up"
          style={{
            fontSize: 'clamp(14px, 1.3vw, 16.5px)',
            lineHeight: 1.75,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          سجّل الآن مجاناً — وابدأ في الاستفادة من كل خدمات تعاهُد خلال دقائق.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap animate-fade-up">
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
            style={{
              fontSize: 14.5,
              padding: '13px 26px',
              background: 'white',
              color: '#0f1147',
              border: '1px solid white',
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(0,0,0,0.20)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.28)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.20)';
            }}
          >
            <Sparkles size={15} strokeWidth={2} />
            سجّل الآن مجاناً
          </button>

          <a
            href="https://wa.me/966537372053"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all"
            style={{
              fontSize: 14.5,
              padding: '13px 26px',
              background: '#c9a35a',
              color: '#1a1306',
              border: '1px solid #c9a35a',
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: '0 10px 24px rgba(201,163,90,0.28)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#d4ad65';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#c9a35a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: '#1a1306',
              }}
            />
            تواصل معنا
          </a>
        </div>
      </div>
    </section>
  );
}
