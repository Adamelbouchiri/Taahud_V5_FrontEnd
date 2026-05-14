import React from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Percent,
  Sparkles,
  Clock,
} from 'lucide-react';

/* ============================================================
 *  UpcomingFeatures — coming-soon teasers above the footer
 *  ----------------------------------------------------------------
 *  Two large cards on a light band that breaks up the contrast
 *  between the dark CtaBanner and the footer.
 *
 *  - Taahud Academy (أكاديمية تعاهد): training and certifications
 *    for contractors, engineers, suppliers, developers.
 *  - Affiliate marketing (التسويق بالعمولة): partners earn a
 *    percentage on every deal they refer through the platform.
 *
 *  Both buttons are intentionally disabled — clicking them does
 *  nothing yet. The "قريباً" pill on each card is the visual
 *  hint that they aren't live.
 * ============================================================ */

const FEATURES = [
  {
    id: 'academy',
    label: 'أكاديمية تعاهد',
    eyebrow: 'تعليم وتأهيل',
    desc:
      'دورات متخصّصة وشهادات معتمدة في إدارة المشاريع، العقود، الجودة، والسلامة — يقدّمها خبراء القطاع لرفع كفاءة المقاولين والمكاتب الهندسية والموردين.',
    icon: GraduationCap,
    accent: '#2c2f7c',
    accentSoft: 'rgba(44,47,124,0.10)',
    cta: 'اكتشف الأكاديمية',
  },
  {
    id: 'affiliate',
    label: 'التسويق بالعمولة',
    eyebrow: 'برنامج الشركاء',
    desc:
      'برنامج شراكة يكافئك بنسبة من قيمة كل صفقة تأتي عبر دعوتك — أدوات تسويقيّة جاهزة، روابط تتبّع، ولوحة عمولات شفّافة في حسابك.',
    icon: Percent,
    accent: '#b8862a',
    accentSoft: 'rgba(184,134,42,0.12)',
    cta: 'انضم للبرنامج',
  },
];

export default function UpcomingFeatures() {
  return (
    <section
      id="upcoming"
      className="relative py-24 lg:py-28 scroll-mt-20"
      style={{ background: '#fafaf6' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header — centered, matches Hero/Arenas eyebrow pattern */}
        <div className="text-center max-w-[680px] mx-auto mb-12 lg:mb-14">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'white',
              border: '1px solid #e5e3dc',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: '#3a3a52',
            }}
          >
            <Sparkles size={12} strokeWidth={2} />
            قريباً على تعاهد
          </div>
          <h2
            className="font-display m-0 mb-3 animate-fade-up"
            style={{
              fontSize: 'clamp(28px, 3.8vw, 42px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: '#0f1147',
            }}
          >
            ميزات جديدة قيد التطوير
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{ fontSize: 14.5, lineHeight: 1.75, color: '#5a5b78' }}
          >
            نعمل على توسيع تعاهد بميزات تُكمل تجربتك — تابعونا للإطلاق.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={i * 0.06} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, delay }) {
  const Icon = feature.icon;

  return (
    <article
      className="relative flex flex-col rounded-[18px] p-8 lg:p-10 transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'white',
        border: '1px solid #e8e6dd',
        animationDelay: `${delay}s`,
        boxShadow: '0 4px 14px rgba(15,17,71,0.04)',
      }}
    >
      {/* "قريباً" pill — top start corner */}
      <span
        className="absolute inline-flex items-center gap-1 font-bold rounded-full"
        style={{
          top: 18,
          insetInlineStart: 18,
          background: 'rgba(184,134,42,0.12)',
          color: '#8a6a1f',
          border: '1px solid rgba(184,134,42,0.25)',
          fontSize: 10.5,
          padding: '3px 9px',
          letterSpacing: '0.04em',
        }}
      >
        <Clock size={11} strokeWidth={2.2} />
        قريباً
      </span>

      {/* Icon tile */}
      <div
        className="flex items-center justify-center mb-6"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: feature.accentSoft,
          color: feature.accent,
          alignSelf: 'flex-end',
        }}
      >
        <Icon size={26} strokeWidth={1.7} />
      </div>

      {/* Eyebrow */}
      <div
        className="font-semibold uppercase mb-2 text-right"
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          color: feature.accent,
        }}
      >
        {feature.eyebrow}
      </div>

      {/* Title */}
      <h3
        className="font-display m-0 mb-3 text-right"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#0f1147',
          lineHeight: 1.25,
        }}
      >
        {feature.label}
      </h3>

      {/* Description */}
      <p
        className="m-0 mb-7 text-right"
        style={{
          fontSize: 14,
          lineHeight: 1.85,
          color: '#5a5b78',
        }}
      >
        {feature.desc}
      </p>

      {/* CTA — disabled, visually muted to read as "not active yet" */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-auto inline-flex items-center justify-center gap-2 self-start font-semibold rounded-[12px] transition-colors"
        style={{
          padding: '11px 18px',
          fontSize: 13.5,
          background: feature.accentSoft,
          color: feature.accent,
          border: `1px solid ${feature.accent}33`,
          cursor: 'not-allowed',
          fontFamily: 'inherit',
          opacity: 0.95,
        }}
      >
        {feature.cta}
        <ArrowLeft size={14} strokeWidth={2} />
      </button>
    </article>
  );
}
