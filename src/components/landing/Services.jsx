import React, { useState } from 'react';
import {
  // Tab pills
  HardHat,
  Truck,
  Building2,
  // Service icons (contractors)
  Handshake,
  Gem,
  Building,
  BarChart3,
  ScanSearch,
  FileSignature,
  Paperclip,
  Bot,
  ClipboardList,
  // Service icons (suppliers)
  ShoppingCart,
  CreditCard,
  ScrollText,
  Boxes,
  TrendingUp,
  Star,
  ClipboardCheck,
  Sparkles,
  // Service icons (developers)
  Ruler,
  Target,
  Crown,
  Lock,
  Wallet,
  PieChart,
  ShieldCheck,
  LineChart,
} from 'lucide-react';

/* ============================================================
 *  Services — three-tab layout
 *  ----------------------------------------------------------------
 *  Three audiences (contractors / suppliers / developers), each
 *  with their own grid of service cards. Tab pill switcher at the
 *  top — clicking changes which grid renders.
 *
 *  Cards may carry an optional badge: حصري (gold), جديد (green),
 *  VIP (sand). Position is the top start corner of the card.
 *
 *  Card content lives in the AUDIENCES array below — change copy
 *  or add cards there without touching layout.
 * ============================================================ */

const AUDIENCES = [
  {
    id: 'contractors',
    label: 'مقدّمي الخدمات (المقاولين)',
    icon: HardHat,
    description:
      'للمقاولين والشركات التي تنفّذ المشاريع — نمنحك الأدوات لتفوز بمشاريع أكثر، وتُديرها باحتراف، وتحلّ مشاكلك القانونية والمالية في ثوانٍ.',
    cards: [
      {
        title: 'ساحة المشاريع المتاحة',
        desc: 'جميع المشاريع من اعتماد وفرصة ومقاول والقطاع الخاص في مكان واحد — مع تنبيهات فورية للفرص المناسبة لتصنيفك.',
        icon: Building,
        accent: '#136d4a',
      },
      {
        title: 'الساحة الخاصة',
        desc: 'مشاريع منتقاة من شركاء استراتيجيين كبار — متاحة فقط لمشتركي باقة إسناد، بحجوم وقيم تنافسية.',
        icon: Gem,
        accent: '#3a3d99',
        badge: { label: 'حصري', tone: 'gold' },
      },
      {
        title: 'ساحة التضامن',
        desc: 'تضامن مع مقاولين آخرين لتنفيذ مشاريع تتجاوز قدرتك الفردية — اطرح فرصتك أو تضامن مع آخرين.',
        icon: Handshake,
        accent: '#c9a35a',
      },
      {
        title: 'مولّد العقود الذكي',
        desc: 'قوالب عقود معتمدة قانونياً — تخصيص ذكي بالـ AI + توقيع إلكتروني عبر نفاذ في أقل من 5 دقائق.',
        icon: FileSignature,
        accent: '#0f1147',
        badge: { label: 'جديد', tone: 'green' },
      },
      {
        title: 'مدقق العقود',
        desc: 'ارفع عقدك واحصل على تحليل ذكي للبنود الخطرة، الغرامات غير العادلة، والثغرات التي قد تكلّفك مالاً.',
        icon: ScanSearch,
        accent: '#3a3d99',
      },
      {
        title: 'محلل المشاريع',
        desc: 'احسب ربحية المشروع قبل التقديم — تكاليف، هامش ربح، تدفق نقدي، وتقييم المخاطر بثوانٍ.',
        icon: BarChart3,
        accent: '#136d4a',
      },
      {
        title: 'متابع المشاريع',
        desc: 'تتبّع مراحل التنفيذ، الدفعات، والمستلمات لكل مشروع — مع تنبيهات للتأخيرات والأحداث المهمة.',
        icon: ClipboardList,
        accent: '#0f1147',
      },
      {
        title: 'مساعد AI متخصص',
        desc: 'مساعد ذكي يفهم قطاع المقاولات السعودي — اسأل عن العقود، الأنظمة، التسعير، والقضايا القانونية.',
        icon: Bot,
        accent: '#c9a35a',
      },
      {
        title: 'إدارة المستندات',
        desc: 'احفظ كل مستندات مشاريعك — عقود، مخططات، تقارير استلام، فواتير — في خزانة سحابية آمنة.',
        icon: Paperclip,
        accent: '#3a3d99',
      },
    ],
  },
  {
    id: 'suppliers',
    label: 'الموردين',
    icon: Truck,
    description:
      'لموردي مواد البناء والمعدات — منصة تعاهُد توصلك مباشرة بآلاف المقاولين والمشاريع النشطة، وتساعدك في إدارة طلباتك بكفاءة.',
    cards: [
      {
        title: 'سوق التوريد المباشر',
        desc: 'اعرض منتجاتك ومعداتك أمام المقاولين النشطين — طلبات مباشرة بدون وسطاء، مع نظام تقييم وتصنيف.',
        icon: ShoppingCart,
        accent: '#136d4a',
      },
      {
        title: 'طلبات العروض (RFQ)',
        desc: 'احصل على إشعارات فورية بطلبات الأسعار من المقاولين حسب تخصصك — قدّم عرضك في دقائق.',
        icon: ClipboardCheck,
        accent: '#c9a35a',
        badge: { label: 'جديد', tone: 'green' },
      },
      {
        title: 'تحليل الطلب السوقي',
        desc: 'رؤية شاملة لاتجاهات السوق — أكثر المواد طلباً، المناطق النشطة، والأسعار التنافسية.',
        icon: TrendingUp,
        accent: '#3a3d99',
      },
      {
        title: 'إدارة التوصيل',
        desc: 'جدولة التوصيلات، تتبّع الشحنات، وإصدار إشعارات تسليم تلقائية للمقاولين.',
        icon: Truck,
        accent: '#c9a35a',
      },
      {
        title: 'الدفع المضمون',
        desc: 'نظام دفع آمن مع ضمانات — احصل على مستحقاتك في الوقت المحدد بدون تأخيرات أو نزاعات.',
        icon: CreditCard,
        accent: '#136d4a',
      },
      {
        title: 'عقود التوريد الذكية',
        desc: 'قوالب عقود توريد معتمدة — تشمل بنود الجودة، التسليم، الدفع، وحماية حقوقك القانونية.',
        icon: ScrollText,
        accent: '#0f1147',
      },
      {
        title: 'سمعتك الرقمية',
        desc: 'بناء سمعة قوية من خلال تقييمات المقاولين — كل تسليم ناجح يزيد من ظهورك ومبيعاتك.',
        icon: Star,
        accent: '#c9a35a',
      },
      {
        title: 'إدارة المخزون',
        desc: 'تحكّم بمخزونك، تحديثات الأسعار، عروض خاصة — كل ذلك من لوحة تحكم بسيطة.',
        icon: Boxes,
        accent: '#3a3d99',
      },
      {
        title: 'مساعد المبيعات AI',
        desc: 'يحلّل عملاءك ويقترح أفضل الفرص، يجاوب الاستفسارات، ويساعدك في إعداد عروض تنافسية.',
        icon: Bot,
        accent: '#136d4a',
      },
    ],
  },
  {
    id: 'developers',
    label: 'المطوّرين العقاريين',
    icon: Building2,
    description:
      'للمطوّرين العقاريين الذين يبنون المستقبل — تعاهُد تمنحك الأدوات للعثور على أفضل المقاولين، إدارة المشاريع الكبرى، والوصول للتمويل بسهولة.',
    cards: [
      {
        title: 'شبكة المقاولين المعتمدين',
        desc: 'قاعدة بيانات لأكثر من 1200 مقاول معتمد — مع تصنيفات، خبرات سابقة، وتقييمات حقيقية من العملاء.',
        icon: Crown,
        accent: '#0f1147',
      },
      {
        title: 'مناقصات حصرية',
        desc: 'اطرح مشاريعك بسرية تامة على نخبة من المقاولين المختارين — استلم عروضاً مدروسة في وقت قياسي.',
        icon: Target,
        accent: '#c9a35a',
        badge: { label: 'VIP', tone: 'sand' },
      },
      {
        title: 'إدارة محفظة المشاريع',
        desc: 'رؤية موحّدة لجميع مشاريعك التطويرية — تقدّم العمل، الميزانيات، الجداول الزمنية، والمخاطر.',
        icon: Ruler,
        accent: '#136d4a',
      },
      {
        title: 'Escrow وضمانات الدفع',
        desc: 'نظام دفع آمن بضمانات بنكية — حماية كاملة لاستثماراتك مع آلية دفع مرتبطة بمراحل الإنجاز.',
        icon: Lock,
        accent: '#3a3d99',
      },
      {
        title: 'بوابة التمويل',
        desc: 'روابط مباشرة مع البنوك والممولين السعوديين — احصل على عروض تمويل لمشاريعك بشروط تنافسية.',
        icon: Wallet,
        accent: '#c9a35a',
      },
      {
        title: 'تحليلات التطوير العقاري',
        desc: 'بيانات السوق، الأسعار التاريخية، توقعات الجدوى الاقتصادية — كل ما تحتاجه لقرارات استثمارية ذكية.',
        icon: PieChart,
        accent: '#0f1147',
      },
      {
        title: 'تأهيل المقاولين',
        desc: 'نظام تأهيل آلي للمقاولين — التحقق من السجلات التجارية، التصنيفات، والمشاريع السابقة قبل التعاقد.',
        icon: ShieldCheck,
        accent: '#136d4a',
      },
      {
        title: 'تقارير المستثمرين',
        desc: 'تقارير مالية وتشغيلية احترافية لمستثمريك — تُصدر تلقائياً بصورة شهرية أو ربعية.',
        icon: LineChart,
        accent: '#3a3d99',
      },
      {
        title: 'مستشار التطوير AI',
        desc: 'مساعد ذكي يحلّل دراسات الجدوى، يقترح المواقع المثالية، ويساعدك في اتخاذ قرارات استثمارية مدروسة.',
        icon: Bot,
        accent: '#c9a35a',
      },
    ],
  },
];

const BADGE_TONES = {
  gold: { bg: 'rgba(201,163,90,0.14)', color: '#a17827', border: 'rgba(201,163,90,0.30)' },
  green: { bg: 'rgba(19,109,74,0.10)', color: '#0d5538', border: 'rgba(19,109,74,0.25)' },
  sand: { bg: 'rgba(201,163,90,0.18)', color: '#9a721d', border: 'rgba(201,163,90,0.40)' },
};

export default function Services() {
  const [activeId, setActiveId] = useState('contractors');
  const active = AUDIENCES.find((a) => a.id === activeId);

  return (
    <section
      id="services"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: '#fafaf6' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Eyebrow + headline */}
        <div className="text-center max-w-[680px] mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'rgba(58,61,153,0.08)',
              color: '#1f2258',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            خدمات متخصصة
          </div>

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
            منصة واحدة. ثلاثة أنواع من المستخدمين.
          </h2>
        </div>

        {/* Tab pills */}
        <div className="flex justify-center gap-2.5 mb-7 flex-wrap">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            const isActive = activeId === aud.id;
            return (
              <button
                key={aud.id}
                type="button"
                onClick={() => setActiveId(aud.id)}
                className="inline-flex items-center gap-2 rounded-[12px] font-semibold transition-all whitespace-nowrap"
                style={{
                  fontSize: 13.5,
                  padding: '11px 20px',
                  background: isActive ? '#0f1147' : 'white',
                  color: isActive ? 'white' : '#3a3a52',
                  border: `1px solid ${isActive ? '#0f1147' : '#e5e3dc'}`,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 8px 18px rgba(15,17,71,0.20)' : 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#0f1147';
                    e.currentTarget.style.color = '#0f1147';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#e5e3dc';
                    e.currentTarget.style.color = '#3a3a52';
                  }
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
                {aud.label}
              </button>
            );
          })}
        </div>

        {/* Audience description */}
        <p
          className="text-center max-w-[680px] mx-auto mb-12 m-0 animate-fade-up"
          style={{
            fontSize: 14.5,
            lineHeight: 1.8,
            color: '#5a5b78',
          }}
          key={active.id}
        >
          {active.description}
        </p>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {active.cards.map((card, i) => (
            <ServiceCard
              key={`${active.id}-${i}`}
              card={card}
              delay={i * 0.04}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ card, delay }) {
  const Icon = card.icon;
  const badgeTone = card.badge ? BADGE_TONES[card.badge.tone] : null;

  return (
    <article
      className="relative p-7 rounded-[16px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'white',
        border: '1px solid #e8e6dd',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#cfcdc4';
        e.currentTarget.style.boxShadow = '0 16px 32px rgba(15,17,71,0.07)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e8e6dd';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Badge — sits in the top-start corner per RTL */}
      {card.badge && (
        <span
          className="absolute font-bold"
          style={{
            top: 12,
            insetInlineStart: 12,
            background: badgeTone.bg,
            color: badgeTone.color,
            border: `1px solid ${badgeTone.border}`,
            fontSize: 10.5,
            padding: '3px 9px',
            borderRadius: 999,
            letterSpacing: '0.03em',
          }}
        >
          {card.badge.label}
        </span>
      )}

      {/* Icon tile */}
      <div
        className="flex items-center justify-center mb-6"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${card.accent}14`,
          color: card.accent,
        }}
      >
        <Icon size={22} strokeWidth={1.7} />
      </div>

      {/* Title */}
      <h3
        className="font-display m-0 mb-2"
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#0f1147',
          lineHeight: 1.3,
        }}
      >
        {card.title}
      </h3>

      {/* Description */}
      <p
        className="m-0"
        style={{
          fontSize: 13.5,
          lineHeight: 1.75,
          color: '#5a5b78',
        }}
      >
        {card.desc}
      </p>
    </article>
  );
}
