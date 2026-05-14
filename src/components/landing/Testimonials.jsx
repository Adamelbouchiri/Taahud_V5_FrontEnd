import React from 'react';
import { Star, Quote } from 'lucide-react';

/* ============================================================
 *  Testimonials — infinite marquee
 *  ----------------------------------------------------------------
 *  All 25 customer testimonials from the official feedback
 *  document scroll horizontally in a slow loop. Hovering on any
 *  card pauses the whole strip so the visitor can read.
 *
 *  How the loop works (no JS animation library):
 *    1. We render the array TWICE inside the moving container.
 *    2. CSS animates `transform: translateX(0%)` to `translateX(-50%)`
 *       linearly. At the -50% mark, the second copy is sitting
 *       exactly where the first copy was at 0%, so the loop
 *       restarts seamlessly — visually it never stops.
 *    3. Hover sets `animation-play-state: paused` on the strip.
 *    4. `prefers-reduced-motion` users get the strip statically
 *       at the start position — no animation at all.
 *
 *  Why fixed-width cards: a marquee NEEDS uniform card widths so
 *  the loop is mathematically clean. With body texts varying
 *  10–30 words, we set width + min-height so cards stay aligned
 *  even when text wraps differently.
 *
 *  Direction note: in this RTL page we want cards to drift toward
 *  the LEFT (away from the reader's start position) — so new
 *  cards keep arriving from the right. That's what
 *  `translateX(-50%)` does in any direction since CSS transforms
 *  use document coordinates, not text direction.
 * ============================================================ */

const TESTIMONIALS = [
  {
    body:
      'منصة تعاهُد ساعدتنا على إدارة المشاريع ومتابعة مراحل التنفيذ من مكان واحد، مع وضوح أكبر في المهام ونسب الإنجاز.',
    name: 'محمد العربي',
    company: 'مجموعة معمار للتنفيذ',
  },
  {
    body:
      'وفّرت لنا تعاهُد بيئة عملية لتنظيم مشاريع الديكور، واستقبال العروض، والتنسيق بين فرق العمل بطريقة أسهل وأكثر احترافية.',
    name: 'محمد خليل',
    company: 'روائع الأثاث للديكور',
  },
  {
    body:
      'تعاهُد تمثل خطوة متقدمة في رقمنة إدارة مشاريع المقاولات، من طرح المشروع وحتى متابعة التنفيذ والتواصل بين الأطراف.',
    name: 'أحمد محسن',
    company: 'شركة غمري للإنشاءات الهجينية',
  },
  {
    body:
      'منصة احترافية تدعم تنظيم المشاريع التشغيلية، وتسهّل متابعة الأعمال، وتوثيق مراحل الإنجاز بمرونة عالية.',
    name: 'حسين عسيري',
    company: 'وزارة الصحة',
  },
  {
    body:
      'تعاهُد من الحلول التقنية التي تمنح فرق العمل وضوحاً أعلى في إدارة المشاريع، ومتابعة الطلبات، وتنظيم التواصل الداخلي.',
    name: 'عبدالعزيز بيانوني',
    company: 'درف',
  },
  {
    body:
      'المنصة اختصرت الكثير من الوقت في متابعة الأعمال اليومية، وسهّلت التواصل بين أصحاب المشاريع ومقدمي الخدمات ضمن مسار واضح.',
    name: 'رائد نصار',
    company: 'تاج ظبي',
  },
  {
    body:
      'تعاهُد تمنح شركات التطوير العقاري رؤية أوضح للمشاريع والعقود ونسب الإنجاز، وتساعد على متابعة التنفيذ بكفاءة أعلى.',
    name: 'علي الرفاعي',
    company: 'درة الشاطئ للتطوير العقاري',
  },
  {
    body:
      'تجربة تشغيل مرنة تساعد على تنظيم الطلبات، وربط فرق العمل، ومتابعة مراحل المشروع ضمن منصة واحدة.',
    name: 'محمد البدوي',
    company: 'عمار الديار للمصاعد',
  },
  {
    body:
      'منصة عملية تقلل العشوائية في إدارة المشاريع، وتدعم متابعة العروض والمهام والإنجازات بطريقة منظمة وواضحة.',
    name: 'سعود العجيري',
    company: 'درف',
  },
  {
    body:
      'أكثر ما يميز تعاهُد سهولة الاستخدام، وتنظيم التواصل، وجمع تفاصيل المشروع بين جميع الأطراف في مكان واحد.',
    name: 'حمزة الشعيبي',
    company: 'الفوم الذكي',
  },
  {
    body:
      'تعاهُد خطوة قوية نحو رقمنة قطاع المقاولات والتوريد، من إدارة الطلبات وحتى التنسيق مع الموردين ومتابعة التنفيذ.',
    name: 'علاء فتحي',
    company: 'شركة أجيج لصناعة الصلب ومشتقاته',
  },
  {
    body:
      'المنصة توفر بيئة منظمة لإدارة المشاريع والعمليات التشغيلية، وتساعد على رفع كفاءة المتابعة واتخاذ القرار.',
    name: 'محمد أحمد باحسن',
    company: 'شركة ركن الدائرة للتجارة',
  },
  {
    body:
      'تعاهُد مثال واضح على توظيف التقنية في تحسين إدارة المشاريع، وتنظيم التواصل، ورفع كفاءة فرق العمل.',
    name: 'سمر أبو الريش',
    company: 'First Technology',
  },
  {
    body:
      'المنصة ساعدتنا على تحسين متابعة الأعمال الميدانية، وتنسيق المهام بين فرق التنفيذ، وتوثيق مراحل المشروع بشكل أفضل.',
    name: 'محمد صبحي',
    company: 'فداك للطرق والمقاولات',
  },
  {
    body:
      'تجربة مميزة ومنصة واعدة تدعم احترافية إدارة المشاريع، من استقبال العروض وحتى متابعة التنفيذ والتشغيل.',
    name: 'محمد السيف',
    company: 'درف',
  },
  {
    body:
      'تعاهُد تمثل نقلة نوعية في إدارة المشاريع، لأنها تجمع العروض، العقود، التواصل، والمتابعة في مسار واحد أكثر شفافية.',
    name: 'فيصل التميمي',
    company: 'شركة متمم',
  },
  {
    body:
      'منصة تضيف قيمة حقيقية للشركات من خلال تنظيم العمليات، ومتابعة المشاريع، وتسهيل التنسيق مع الموردين ومقدمي الخدمات.',
    name: 'محمد الدسوقي',
    company: 'شركة نال للصناعة المحدودة',
  },
  {
    body:
      'تعاهُد وفّرت مركزية للمعلومات وسهّلت الوصول إلى تفاصيل المشروع، مما ساعدنا على متابعة سير العمل بكفاءة أعلى.',
    name: 'محمود وهبي',
    company: 'Albusaili',
  },
  {
    body:
      'المنصة تمتلك إمكانيات قوية تخدم قطاعات متعددة، خصوصاً في إدارة المشاريع، التشغيل، والتنسيق بين فرق العمل والموردين.',
    name: 'عرفان محمود',
    company: 'شركات فنادق خارج السعودية',
  },
  {
    body:
      'تجربة تقنية احترافية تساعد على رفع مستوى التنظيم والتواصل داخل المشاريع، وتسهّل متابعة التفاصيل من بداية المشروع حتى تنفيذه.',
    name: 'رغد فؤاد',
    company: 'شركة سمة الإبداع الدولية',
  },
  {
    body:
      'من أكثر ما يميز تعاهُد وضوح المتابعة، وسهولة إدارة الأعمال اليومية، وتنظيم التواصل بين المستخدمين داخل المنصة.',
    name: 'طارق البسام',
    company: 'درف',
  },
  {
    body:
      'منصة قوية تدعم قطاع المقاولات والتوريد بطريقة حديثة، وتسهّل إدارة الطلبات والعروض ومتابعة مراحل التنفيذ.',
    name: 'سلطانة العتيبي',
    company: 'شركة حديد العبو',
  },
  {
    body:
      'تعاهُد ساعدتنا على جمع تفاصيل المشروع في مكان واحد، وتقليل تشتت التواصل، وتسهيل متابعة المهام والعروض.',
    name: 'علي عيسى',
    company: 'أعمال ترف',
  },
  {
    body:
      'تجربة احترافية تعكس فهماً واضحاً لاحتياجات قطاع المقاولات والتشغيل، خصوصاً في تنظيم المشاريع وربط الأطراف المختلفة.',
    name: 'عبدالله الغامدي',
    company: 'شركة عليم',
  },
  {
    body:
      'المنصة تمنح المطورين العقاريين تحكماً أفضل في متابعة المشاريع، إدارة العقود، قياس نسب الإنجاز، والتواصل مع المقاولين والموردين.',
    name: 'فهد السنيد',
    company: 'شركة تجوري العقارية',
  },
];

// Avatar background colors cycle through three brand tones so the
// strip has visual rhythm without us having to hand-pick per item.
const AVATAR_COLORS = ['#14164d', '#136d4a', '#c9a35a'];

export default function Testimonials() {
  // Compute initial + avatar color once (purely visual).
  const cards = TESTIMONIALS.map((t, i) => ({
    ...t,
    initial: t.name.trim().charAt(0),
    avatarBg: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));

  return (
    <section
      id="testimonials"
      className="relative py-24 lg:py-32 scroll-mt-20 overflow-hidden"
      style={{ background: '#fafaf6' }}
    >
      {/* Heading */}
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 mb-14">
        <div className="text-center max-w-[680px] mx-auto">
          <h2
            className="font-display m-0 mb-4 animate-fade-up"
            style={{
              fontSize: 'clamp(30px, 4vw, 46px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: '#0f1147',
            }}
          >
            يثقون بنا — يوصون بنا
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: '#5a5b78',
            }}
          >
            ما يقوله قادة من القطاع الحكومي والصناعي والمقاولات والاستثمار عن تعاهُد
          </p>
        </div>
      </div>

      {/* Marquee — full bleed, fades at the edges.
          dir="ltr" forces the wrapper out of the page's RTL flow
          so the inner strip aligns to the LEFT edge of the viewport
          (not the right). With the strip extending rightward
          off-screen, translateX(-50%) moves it leftward — meaning
          off-screen cards on the right slide into view, then
          continue leftward and exit on the left. That's the
          expected marquee behavior. */}
      <div
        dir="ltr"
        className="relative"
        style={{
          // Soft horizontal mask so cards drift in/out of view
          // rather than appearing at a hard edge.
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="testimonials-marquee">
          {/* Render the array twice. Animation translates -50% so
              the second copy lands exactly where the first started
              — perfectly seamless loop. */}
          {[...cards, ...cards].map((c, i) => (
            <TestimonialCard key={i} t={c} />
          ))}
        </div>
      </div>

      {/* Component-scoped CSS for the marquee animation. */}
      <style>{`
        .testimonials-marquee {
          display: flex;
          flex-wrap: nowrap;
          width: max-content;
          /* Force LTR on the strip itself so flex items flow
             predictably from left to right in DOM order. Without
             this, an RTL parent inverts the visual order of flex
             children, which breaks the seamless-loop math because
             translateX(-50%) translates physically (always toward
             negative X / visual left) regardless of writing
             direction. The cards' Arabic text is unaffected because
             each card sets its own dir="rtl". */
          direction: ltr;
          animation: testimonials-scroll 90s linear infinite;
          will-change: transform;
        }
        .testimonials-marquee:hover {
          animation-play-state: paused;
        }
        .testimonials-marquee > article {
          flex-shrink: 0;
          /* Spacing between cards as margin on the card itself
             rather than flex 'gap'. This makes the strip's total
             width an exact multiple of (card + margin), so the
             -50% translate lands EXACTLY on the start of the
             duplicate set. With flex 'gap' the math is off by
             half a gap each loop and you see a visible jump. */
          margin-inline-end: 20px;
        }
        @keyframes testimonials-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonials-marquee {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

function TestimonialCard({ t }) {
  return (
    <article
      dir="rtl"
      className="flex flex-col flex-shrink-0 transition-all"
      style={{
        width: 360,
        minHeight: 280,
        padding: '26px 26px',
        background: 'white',
        border: '1px solid #e8e6dd',
        borderRadius: 16,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#cfcdc4';
        e.currentTarget.style.boxShadow = '0 16px 32px rgba(15,17,71,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e8e6dd';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Stars */}
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="#c9a35a" stroke="#c9a35a" />
        ))}
      </div>

      {/* Quote glyph (mirrored so it opens toward the RTL text) */}
      <div className="mb-3">
        <Quote
          size={20}
          strokeWidth={1.5}
          style={{ color: '#c9a35a', transform: 'scaleX(-1)' }}
        />
      </div>

      {/* Body */}
      <p
        className="m-0 mb-6 flex-1"
        style={{
          fontSize: 13.5,
          lineHeight: 1.85,
          color: '#3a3a52',
        }}
      >
        {t.body}
      </p>

      {/* Footer: avatar + name + company */}
      <div
        className="flex items-center gap-3 pt-5"
        style={{ borderTop: '1px solid #efece4' }}
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
            style={{ fontSize: 13.5, color: '#0f1147' }}
          >
            {t.name}
          </div>
          <div
            className="truncate"
            style={{ fontSize: 12, color: '#7a7a8c', marginTop: 2 }}
          >
            {t.company}
          </div>
        </div>
      </div>
    </article>
  );
}
