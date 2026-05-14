import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Gem, HardHat, Compass, Building2, Truck } from 'lucide-react';

/* ============================================================
 *  Plans — pricing
 *  ----------------------------------------------------------------
 *  Three interactive layers (matches the official pricing PDF):
 *
 *    1. Audience tabs — Contractor / Engineering Office /
 *       Real-Estate Developer / Supplier
 *    2. Billing period toggle — 6 months / 12 months (the 12m
 *       option saves ~13% so we surface a "وفّر" badge)
 *    3. Two plan cards — Basic and Premium for the selected
 *       audience+period combo
 *
 *  Premium's feature list is written as "everything in Basic
 *  + these additions" rather than re-listing the basic features.
 *  This matches how the PDF presents it and avoids visual noise.
 *
 *  Below the cards: the إسناد add-on banner — adds 600 ر.س to
 *  unlock the private arena (عهد). Always visible regardless
 *  of which audience tab is selected.
 * ============================================================ */

/* ---- AUDIENCES ---- */
const AUDIENCES = [
  { id: 'contractor', label: 'المقاول', icon: HardHat },
  { id: 'engineering', label: 'المكتب الهندسي', icon: Compass },
  { id: 'developer', label: 'المطور العقاري', icon: Building2 },
  { id: 'supplier', label: 'المورد', icon: Truck },
];

/* ---- BILLING PERIODS ---- */
const PERIODS = [
  { id: '6', label: '٦ شهور', months: 6 },
  { id: '12', label: '١٢ شهر', months: 12, badge: 'وفّر ~١٣٪' },
];

/* ---- PLAN DATA ----
   Each audience has basic + premium tiers. Each tier has prices
   keyed by period id ('6' / '12') and a feature list. */
const PLANS_BY_AUDIENCE = {
  contractor: {
    basic: {
      prices: { '6': '2,499', '12': '3,999' },
      description:
        'باقة مناسبة للمقاول الذي يحتاج الوصول إلى المشاريع، تحليل الفرص، تجهيز العروض، وبناء حضور موثوق داخل تعاهد.',
      features: [
        'لوحة تحكم المقاول',
        'ساحة المشاريع العامة "نمو"',
        'تقديم العروض الفنية والمالية (٣٠ عرض/الشهر)',
        'محلل المشاريع AI (رصيد ٥٠٠)',
        'متابع المشاريع',
        'خدمة إنشاء مراحل المشروع',
        'متابعة المشاريع والإشراف (حتى ٥٠ مشروع)',
        'الوصول للمتجر والعروض',
        'مولد العقود الذكي',
        'مدقق العقود الذكي',
        'إدارة المستندات',
        'حاسبة المواد AI (رصيد ٥٠٠)',
        'الملف التعريفي',
        'رقم تعريفي خاص',
        'شارة موثوقية المقاول',
        'صفحة إدارة العملاء',
        'التقارير',
        'المحفظة',
        'تصدير المستندات (Word / PDF)',
        'خدمة اعتماد المواد قبل التنفيذ',
        'مدير حساب ودعم فني',
        'بوابة الدفع والفواتير',
        'توقيع إلكتروني عبر نفاذ (٥٠ توقيع)',
      ],
    },
    premium: {
      prices: { '6': '4,999', '12': '8,499' },
      description:
        'باقة مخصصة للمقاول الذي يحتاج فرصاً أكبر، تعاوناً مع مقاولين آخرين، وصولاً أوسع للموردين، وأدوات إضافية لإدارة المشاريع والعروض بكفاءة أعلى.',
      features: [
        'ساحة التضامن',
        'الساحة الخاصة عهد "سبيشل" (مشاريع حصرية)',
        'المساعد التنفيذي الخاص AI',
        'الوصول للموردين محلياً ودولياً',
        'حاسبة المشاريع',
        'نماذج جاهزة لتقديم العروض والزيارات الميدانية',
        'نقل وإدارة ١٠ مشاريع داخل تعاهد',
        'كاش باك على مشتريات المواد عبر تعاهد',
        'أولوية دعم ٢٤/٧',
        'ترويج المشروع في الصفحة الأولى (ساحة التضامن)',
        'مركز المعرفة الهندسية',
        'Escrow وضمانات الدفع',
      ],
    },
  },
  engineering: {
    basic: {
      prices: { '6': '2,699', '12': '4,299' },
      description:
        'باقة مناسبة للمكتب الهندسي الذي يحتاج الوصول إلى المشاريع والمناقصات، تحليل الفرص، تجهيز العروض الفنية والمالية، وبناء حضور موثوق داخل تعاهد.',
      features: [
        'لوحة تحكم المكتب الهندسي',
        'ساحة نمو العامة',
        'تقديم العروض الفنية والمالية (٣٠ عرض/الشهر)',
        'مساعد هندسي AI (رصيد ٥٠٠)',
        'خدمة إنشاء مراحل المشروع',
        'مولد العقود الذكي',
        'مدقق العقود الذكي',
        'إدارة المستندات والمخططات',
        'مراجعة واعتماد المخططات',
        'متابعة المشاريع والإشراف (حتى ٥٠ مشروع)',
        'التقارير الهندسية',
        'إدارة الزيارات الميدانية',
        'محلل المشاريع AI (رصيد ٥٠٠)',
        'المحفظة',
        'ملف تعريفي',
        'رقم تعريفي خاص',
        'شارة موثوقية المكتب الهندسي',
        'صفحة إدارة العملاء',
        'أرشفة المشاريع السابقة',
        'الوصول للموردين والمواد',
        'التكامل مع المقاولين والمطورين',
        'تصدير المستندات (Word / PDF)',
        'خدمة اعتماد المواد قبل التنفيذ',
        'مدير حساب ودعم فني',
        'بوابة الدفع والفواتير',
        'توقيع إلكتروني عبر نفاذ (٥٠ توقيع)',
      ],
    },
    premium: {
      prices: { '6': '5,999', '12': '9,999' },
      description:
        'باقة مخصصة للمكتب الهندسي الذي يحتاج فرصاً أكبر وأكثر تخصصاً، تنسيقاً أوسع مع المقاولين والمطورين، وأدوات متقدمة لإدارة الفريق والمشاريع والاعتمادات بكفاءة أعلى.',
      features: [
        'الساحة الخاصة عهد "سبيشل" (مشاريع حصرية)',
        'تقديم العروض الفنية والمالية (غير محدود)',
        'مساعد هندسي AI (غير محدود)',
        'متابعة المشاريع والإشراف (غير محدود)',
        'إدارة المستندات الهندسية (حتى ٥٠ جيجا)',
        'إدارة الاعتمادات الفنية RFIs',
        'نماذج هندسية جاهزة',
        'المناقصات والاستشارات (أولوية في الظهور)',
        'مدير حساب ودعم خاص',
        'شارات الاعتماد والتميز (متعددة)',
        'تحليل المشاريع AI (كامل وغير محدود)',
        'حاسبة الأتعاب الهندسية AI (غير محدود)',
        'أولوية دعم ٢٤/٧',
        'مركز المعرفة الهندسية',
        'Escrow وضمانات الدفع',
      ],
    },
  },
  developer: {
    basic: {
      prices: { '6': '4,499', '12': '7,499' },
      description:
        'باقة مناسبة للمطور العقاري الذي يحتاج إدارة مشاريعه، تنظيم أطراف التنفيذ، متابعة مراحل المشروع، وتوثيق العمليات الأساسية داخل تعاهد.',
      features: [
        'لوحة تحكم خاصة وشاملة',
        'إدارة محفظة المشاريع',
        'تتبع مراحل المشروع',
        'الساحة العقارية الخاصة',
        'وصول للعروض العقارية',
        'وصول أسرع لعروض المتجر',
        'صفحة عملاء المطور',
        'تأهيل المقاولين',
        'مولد العقود الذكي',
        'مدقق العقود الذكي',
        'إدارة المستندات',
        'التقارير',
        'المحفظة',
        'تصدير المستندات (Word / PDF)',
        'الملف التعريفي',
        'رابط واتساب مباشر',
        'مدير حساب ودعم فني',
        'شارة موثوقية المطور العقاري',
        'بوابة الدفع والفواتير',
        'توقيع إلكتروني عبر نفاذ (٥٠ توقيع)',
      ],
    },
    premium: {
      prices: { '6': '9,999', '12': '16,999' },
      description:
        'باقة مخصصة للمطور العقاري الذي يحتاج فرصاً أكثر خصوصية، دعماً ذكياً في قرارات التطوير، ومزايا مالية وتشغيلية تعزز إدارة المشاريع والتعاملات داخل تعاهد.',
      features: [
        'مناقصات حصرية',
        'تحليلات التطوير العقاري AI',
        'مستشار التطوير AI',
        'تقارير المستثمرين',
        'شبكة المقاولين والموردين المعتمدين',
        'أولوية دعم ٢٤/٧',
        'وصول لمكاتب تخليص المعاملات الحكومية',
        'كاش باك للمواد والمدفوعات عبر المنصة',
        'ترويج المشروع في الصفحة الأولى',
        'Escrow وضمانات الدفع',
      ],
    },
  },
  supplier: {
    basic: {
      prices: { '6': '1,999', '12': '3,299' },
      description:
        'باقة مناسبة للمورد الذي يحتاج عرض منتجاته أمام المقاولين والمطورين، استقبال طلبات الأسعار، وبناء سمعة رقمية موثوقة داخل تعاهد.',
      features: [
        'سوق التوريد المباشر (عرض المنتجات والمعدات)',
        'استقبال طلبات العروض RFQ',
        'إدارة المخزون (تحديث الأسعار وحالة التوفر)',
        'عقود التوريد الذكية',
        'السمعة الرقمية (تقييمات العملاء)',
        'خدمة التوصيل الاختيارية',
        'إدارة التوصيل والشحنات',
        'ملف تعريفي',
        'رقم تعريفي خاص',
        'التقارير',
        'المحفظة',
        'إدارة المستندات',
        'تصدير المستندات (Word / PDF)',
        'مدير حساب ودعم فني',
        'شارة موثوقية المورد',
        'بوابة الدفع والفواتير',
        'توقيع إلكتروني عبر نفاذ (٥٠ توقيع)',
      ],
    },
    premium: {
      prices: { '6': '3,999', '12': '6,999' },
      description:
        'باقة مخصصة للمورد الذي يحتاج تحليلاً أعمق للسوق، أدوات ذكاء اصطناعي لرفع المبيعات، ظهوراً أوسع أمام العملاء، وضمانات دفع آمنة على معاملاته.',
      features: [
        'تحليل الطلب السوقي (المواد الأكثر طلباً، المناطق النشطة، الأسعار التنافسية)',
        'مساعد المبيعات AI (تحليل العملاء واقتراح الفرص)',
        'أولوية الظهور في سوق التوريد',
        'تقارير مبيعات وأداء متقدمة',
        'أولوية دعم ٢٤/٧',
        'Escrow وضمانات الدفع',
      ],
    },
  },
};

export default function Plans() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState('contractor');
  const [period, setPeriod] = useState('12');

  const tiers = PLANS_BY_AUDIENCE[audience];

  return (
    <section
      id="plans"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: '#f4f6fc' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Heading */}
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
            الباقات
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
            باقات مصمّمة لكل دور في القطاع
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: '#5a5b78',
            }}
          >
            اختر دورك في القطاع، اختر مدّة الاشتراك، وابدأ بالاستفادة الكاملة من تعاهُد.
          </p>
        </div>

        {/* Audience tabs */}
        <div className="flex justify-center gap-2.5 mb-7 flex-wrap">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            const isActive = audience === aud.id;
            return (
              <button
                key={aud.id}
                type="button"
                onClick={() => setAudience(aud.id)}
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

        {/* Period toggle */}
        <div className="flex justify-center mb-12">
          <div
            className="inline-flex items-center p-1 rounded-[12px]"
            style={{
              background: 'white',
              border: '1px solid #e5e3dc',
            }}
          >
            {PERIODS.map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className="inline-flex items-center gap-2 rounded-[9px] font-semibold transition-all"
                  style={{
                    fontSize: 13,
                    padding: '8px 18px',
                    background: isActive ? '#0f1147' : 'transparent',
                    color: isActive ? 'white' : '#5a5b78',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {p.label}
                  {p.badge && (
                    <span
                      className="rounded-full font-bold"
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        background: isActive
                          ? 'rgba(201,163,90,0.30)'
                          : 'rgba(19,109,74,0.10)',
                        color: isActive ? '#f0c779' : '#0d5538',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {p.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan cards
            DOM order matters in RTL — first card sits on the RIGHT.
            We render Basic first → on the right; Premium second
            → on the left, matching the PDF's natural cheap → expensive
            reading order. */}
        <div className="grid md:grid-cols-2 gap-5 max-w-[920px] mx-auto items-stretch">
          <PlanCard
            tier="basic"
            name="بيسك"
            data={tiers.basic}
            period={period}
            onChoose={() => navigate('/register')}
          />
          <PlanCard
            tier="premium"
            name="بريميوم"
            data={tiers.premium}
            period={period}
            onChoose={() => navigate('/register')}
            featured
            includesBasic
          />
        </div>

        {/* إسناد add-on banner */}
        <div
          className="mt-10 p-6 lg:p-7 rounded-[16px] flex flex-col md:flex-row items-start md:items-center gap-5 animate-fade-up max-w-[920px] mx-auto"
          style={{
            background: '#fbf7ec',
            border: '1px solid #ede4cd',
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(201,163,90,0.18)',
              color: '#a17827',
            }}
          >
            <Gem size={22} strokeWidth={1.7} />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="font-display font-bold mb-1"
              style={{ fontSize: 17, color: '#0f1147' }}
            >
              إضافة إسناد — افتح الساحة الخاصة
            </div>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                lineHeight: 1.7,
                color: '#5a5b78',
              }}
            >
              أضف <strong style={{ color: '#a17827' }}>٦٠٠ ر.س</strong>{' '}
              فقط على باقتك الشهرية لفتح الساحة الخاصة عهد والوصول لمشاريع حصرية
              بقيم تجاوز <strong style={{ color: '#0f1147' }}>١٠٠ مليون ر.س</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 *  PlanCard
 *  ----------------------------------------------------------------
 *  - For Premium, `includesBasic` adds an "كل ميزات بيسك" line at
 *    the top of the feature list since the data only contains the
 *    deltas over Basic.
 *  - The price is taken from data.prices[period] — the parent
 *    rerenders this whole subtree when period changes.
 * ============================================================ */
function PlanCard({ tier, name, data, period, onChoose, featured, includesBasic }) {
  const periodMonths = period === '12' ? '١٢ شهر' : '٦ شهور';

  /* Approximate daily cost — the headline price divided by the
     number of days in the billing period. Helps reframe big
     numbers as something tangible (≈ 23 ر.س / يوم rather than
     8,499 ر.س up front). Rounded to a whole number since this
     is a marketing approximation, not a billable rate. */
  const dailyCost = (() => {
    const totalDays = period === '12' ? 365 : 180;
    const numericPrice = parseInt(data.prices[period].replace(/,/g, ''), 10);
    if (!numericPrice || isNaN(numericPrice)) return null;
    return Math.round(numericPrice / totalDays);
  })();

  return (
    <article
      className="relative p-7 lg:p-8 rounded-[18px] transition-all flex flex-col"
      style={{
        background: 'white',
        border: featured ? '2px solid #0f1147' : '1px solid #e8e6dd',
        boxShadow: featured ? '0 24px 48px rgba(15,17,71,0.10)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!featured) {
          e.currentTarget.style.borderColor = '#cfcdc4';
          e.currentTarget.style.boxShadow = '0 14px 28px rgba(15,17,71,0.06)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!featured) {
          e.currentTarget.style.borderColor = '#e8e6dd';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Featured badge */}
      {featured && (
        <div
          className="absolute font-bold"
          style={{
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f1147',
            color: 'white',
            fontSize: 11,
            padding: '5px 14px',
            borderRadius: 999,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          الأكثر شعبية
        </div>
      )}

      {/* Tier name */}
      <div
        className="font-display font-bold mb-2"
        style={{ fontSize: 16, color: featured ? '#0f1147' : '#7a7a8c' }}
      >
        {name}
      </div>

      {/* Description */}
      <p
        className="m-0 mb-6"
        style={{ fontSize: 13, lineHeight: 1.7, color: '#5a5b78' }}
      >
        {data.description}
      </p>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="font-display"
          style={{
            fontSize: 'clamp(38px, 4vw, 48px)',
            fontWeight: 700,
            color: '#0f1147',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {data.prices[period]}
        </span>
        <span style={{ fontSize: 13, color: '#7a7a8c', fontWeight: 600 }}>
          ر.س
        </span>
      </div>
      <div className="mb-1" style={{ fontSize: 12.5, color: '#9a9aab' }}>
        لمدة {periodMonths}
      </div>

      {/* Approximate daily cost — small, secondary, makes big
          totals feel more accessible. */}
      {dailyCost !== null && (
        <div
          className="mb-6 inline-flex items-center gap-1.5"
          style={{
            fontSize: 12,
            color: '#7a7a8c',
          }}
        >
          <span
            className="rounded-full"
            style={{
              width: 5,
              height: 5,
              background: featured ? '#c9a35a' : '#136d4a',
            }}
          />
          ما يعادل تقريباً <strong style={{ color: '#3a3a52', fontWeight: 700 }}>
            {dailyCost} ر.س
          </strong> / يوم
        </div>
      )}

      {/* Feature list */}
      <ul className="m-0 p-0 mb-7 space-y-2.5 flex-1">
        {includesBasic && (
          <li
            className="list-none flex items-start gap-2"
            style={{
              fontSize: 13,
              color: '#0f1147',
              lineHeight: 1.55,
              fontWeight: 700,
              paddingBottom: 8,
              borderBottom: '1px dashed #e5e3dc',
              marginBottom: 8,
            }}
          >
            <Check
              size={14}
              strokeWidth={2.5}
              style={{
                color: '#0f1147',
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            <span>كل ميزات باقة بيسك</span>
          </li>
        )}
        {data.features.map((f, i) => (
          <li
            key={i}
            className="list-none flex items-start gap-2"
            style={{
              fontSize: 13,
              color: '#3a3a52',
              lineHeight: 1.55,
            }}
          >
            <Check
              size={14}
              strokeWidth={2.5}
              style={{
                color: featured ? '#0f1147' : '#136d4a',
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={onChoose}
        className="w-full font-semibold rounded-[10px] transition-all"
        style={{
          fontSize: 13.5,
          padding: '11px 16px',
          background: featured ? '#0f1147' : 'white',
          color: featured ? 'white' : '#0f1147',
          border: `1px solid ${featured ? '#0f1147' : '#d8d6cd'}`,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (featured) {
            e.currentTarget.style.background = '#1a1d5e';
          } else {
            e.currentTarget.style.borderColor = '#0f1147';
            e.currentTarget.style.background = '#f4f6fc';
          }
        }}
        onMouseLeave={(e) => {
          if (featured) {
            e.currentTarget.style.background = '#0f1147';
          } else {
            e.currentTarget.style.borderColor = '#d8d6cd';
            e.currentTarget.style.background = 'white';
          }
        }}
      >
        ابدأ الآن — {name}
      </button>
    </article>
  );
}
