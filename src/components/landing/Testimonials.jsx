import React from 'react';
import { Star, Quote } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';

const DICTS = { ar: arDict, en: enDict, zh: zhDict };

/* ============================================================
 *  Testimonials — infinite marquee
 *  ----------------------------------------------------------------
 *  25 customer quotes scroll horizontally in a slow loop. Hover
 *  pauses the strip. `prefers-reduced-motion` disables the loop.
 *
 *  Names + companies are proper nouns and stay constant across
 *  languages. Quote bodies come from the active dictionary's
 *  `landing.testimonials.items` array.
 * ============================================================ */

const PEOPLE = [
  { name: 'محمد العربي', company: 'مجموعة معمار للتنفيذ' },
  { name: 'محمد خليل', company: 'روائع الأثاث للديكور' },
  { name: 'أحمد محسن', company: 'شركة غمري للإنشاءات الهجينية' },
  { name: 'حسين عسيري', company: 'وزارة الصحة' },
  { name: 'عبدالعزيز بيانوني', company: 'درف' },
  { name: 'رائد نصار', company: 'تاج ظبي' },
  { name: 'علي الرفاعي', company: 'درة الشاطئ للتطوير العقاري' },
  { name: 'محمد البدوي', company: 'عمار الديار للمصاعد' },
  { name: 'سعود العجيري', company: 'درف' },
  { name: 'حمزة الشعيبي', company: 'الفوم الذكي' },
  { name: 'علاء فتحي', company: 'شركة أجيج لصناعة الصلب ومشتقاته' },
  { name: 'محمد أحمد باحسن', company: 'شركة ركن الدائرة للتجارة' },
  { name: 'سمر أبو الريش', company: 'First Technology' },
  { name: 'محمد صبحي', company: 'فداك للطرق والمقاولات' },
  { name: 'محمد السيف', company: 'درف' },
  { name: 'فيصل التميمي', company: 'شركة متمم' },
  { name: 'محمد الدسوقي', company: 'شركة نال للصناعة المحدودة' },
  { name: 'محمود وهبي', company: 'Albusaili' },
  { name: 'عرفان محمود', company: 'شركات فنادق خارج السعودية' },
  { name: 'رغد فؤاد', company: 'شركة سمة الإبداع الدولية' },
  { name: 'طارق البسام', company: 'درف' },
  { name: 'سلطانة العتيبي', company: 'شركة حديد العبو' },
  { name: 'علي عيسى', company: 'أعمال ترف' },
  { name: 'عبدالله الغامدي', company: 'شركة عليم' },
  { name: 'فهد السنيد', company: 'شركة تجوري العقارية' },
];

const AVATAR_COLORS = ['#14164d', '#136d4a', '#c9a35a'];

function bodiesFor(lang) {
  const dict = DICTS[lang] || DICTS.ar;
  return dict.landing.testimonials.items || DICTS.ar.landing.testimonials.items;
}

export default function Testimonials() {
  const { t, lang } = useTranslation();
  const bodies = bodiesFor(lang);

  const cards = PEOPLE.map((person, i) => ({
    ...person,
    body: bodies[i] || '',
    initial: person.name.trim().charAt(0),
    avatarBg: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));

  return (
    <section
      id="testimonials"
      className="relative py-24 lg:py-32 scroll-mt-20 overflow-x-clip"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 mb-14">
        <div className="text-center max-w-[680px] mx-auto">
          <h2
            className="font-display m-0 mb-4 animate-fade-up"
            style={{
              fontSize: 'clamp(30px, 4vw, 46px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.testimonials.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.testimonials.subtitle')}
          </p>
        </div>
      </div>

      <div
        dir="ltr"
        className="relative"
        style={{
          /* The horizontal mask fades the strip in/out at the
             edges so cards don't pop against a hard line. Vertical
             padding gives the on-hover translateY + drop shadow
             room to render without being clipped by the mask's
             bounding box (the mask area is the element box). */
          paddingTop: 16,
          paddingBottom: 24,
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="testimonials-marquee">
          {[...cards, ...cards].map((c, i) => (
            <TestimonialCard key={i} t={c} />
          ))}
        </div>
      </div>

      <style>{`
        .testimonials-marquee {
          display: flex;
          flex-wrap: nowrap;
          width: max-content;
          direction: ltr;
          animation: testimonials-scroll 90s linear infinite;
          will-change: transform;
        }
        .testimonials-marquee:hover { animation-play-state: paused; }
        .testimonials-marquee > article {
          flex-shrink: 0;
          margin-inline-end: 20px;
        }
        @keyframes testimonials-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonials-marquee { animation: none; }
        }
      `}</style>
    </section>
  );
}

function TestimonialCard({ t }) {
  return (
    <article
      className="flex flex-col flex-shrink-0 transition-all"
      style={{
        width: 360,
        minHeight: 280,
        padding: '26px 26px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.boxShadow = '0 16px 32px rgba(15,17,71,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="#c9a35a" stroke="#c9a35a" />
        ))}
      </div>

      <div className="mb-3">
        <Quote
          size={20}
          strokeWidth={1.5}
          style={{ color: '#c9a35a', transform: 'scaleX(-1)' }}
        />
      </div>

      <p
        className="m-0 mb-6 flex-1"
        style={{
          fontSize: 13.5,
          lineHeight: 1.85,
          color: 'var(--text-ink-soft)',
        }}
      >
        {t.body}
      </p>

      <div
        className="flex items-center gap-3 pt-5"
        style={{ borderTop: '1px solid var(--border-soft)' }}
      >
        <div
          className="flex items-center justify-center font-display font-bold flex-shrink-0"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: t.avatarBg,
            color: 'white',
            fontSize: 16,
          }}
        >
          {t.initial}
        </div>
        <div className="min-w-0">
          <div
            className="font-bold truncate"
            style={{ fontSize: 13.5, color: 'var(--text-ink)' }}
          >
            {t.name}
          </div>
          <div
            className="truncate"
            style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}
          >
            {t.company}
          </div>
        </div>
      </div>
    </article>
  );
}
