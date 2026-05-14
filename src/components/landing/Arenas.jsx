import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  Ruler,
  Users,
  Building,
  Target,
  Crown,
  Globe,
  ShoppingCart,
  Briefcase,
  Handshake,
  TrendingUp,
} from 'lucide-react';
import Illustration from './ProjectIllustrations';

/* ============================================================
 *  Arenas — six pools, six showcase cards
 *  ----------------------------------------------------------------
 *  Each card is a vertical stack:
 *    1. Header   — arena name + small role icon on the right
 *                  (RTL), audience pill on the left.
 *    2. Preview  — a single sample project styled like the
 *                  FeaturedProjects cards, tinted by arena.
 *    3. Footer   — a "ادخل/تصفح ساحة X" link to that arena.
 *
 *  Sample data is hardcoded marketing content — these are the
 *  shape of opportunities a visitor would see inside, not live
 *  data. Replace with a real /arenas/highlights endpoint when
 *  the BE ships one.
 * ============================================================ */

const ARENAS = [
  {
    id: 'arena',
    label: 'ساحة أرينا',
    headIcon: Target,
    headIconColor: '#2c2f7c',
    audience: 'للمطورين',
    bottomLabel: 'تصفّح أرينا',
    href: '/projects/arena',
    preview: {
      badge: { label: 'مميز', tone: 'gold' },
      bandBg: '#d4ecda',
      illustration: 'land',
      type: 'تطوير سكني',
      typeColor: '#0d5538',
      status: 'مفتوح',
      title: 'أرض تطوير سكني — الخبر',
      meta: [
        { icon: MapPin, label: 'الخبر' },
        { icon: Ruler, label: '8,400م²' },
      ],
      price: '42M',
      cta: 'عرض',
    },
  },
  {
    id: 'private',
    label: 'ساحة عهد الخاصة',
    headIcon: Crown,
    headIconColor: '#a17827',
    audience: 'حصري',
    audienceTone: 'gold',
    bottomLabel: 'ادخل ساحة عهد',
    href: '/projects/private',
    preview: {
      badge: { label: 'حصري', tone: 'gold' },
      bandBg: '#e9e6fb',
      illustration: 'complex',
      type: 'تجاري فاخر',
      typeColor: '#3a3d99',
      status: 'للأعضاء',
      title: 'مجمع تجاري متكامل — الرياض',
      meta: [
        { icon: MapPin, label: 'الرياض' },
        { icon: Calendar, label: '30 شهر' },
      ],
      price: '62M',
      cta: 'التفاصيل',
    },
  },
  {
    id: 'public',
    label: 'ساحة نمو العامة',
    headIcon: Globe,
    headIconColor: '#136d4a',
    audience: 'للجميع',
    bottomLabel: 'تصفّح جميع المشاريع',
    href: '/projects/public',
    preview: {
      badge: { label: 'مميز', tone: 'gold' },
      bandBg: '#d4ecda',
      illustration: 'highway',
      type: 'بنية تحتية',
      typeColor: '#0d5538',
      status: 'مفتوح',
      title: 'مشروع طرق وتشجير — الدمام',
      meta: [
        { icon: MapPin, label: 'الدمام' },
        { icon: Calendar, label: '12 شهر' },
      ],
      price: '8.2M',
      cta: 'التفاصيل',
    },
  },
  {
    id: 'store',
    label: 'متجر تعاهد',
    headIcon: ShoppingCart,
    headIconColor: '#a17827',
    audience: 'للموردين',
    bottomLabel: 'تصفّح المتجر',
    href: '/store',
    preview: {
      badge: { label: 'خصم 15%', tone: 'sand', leadingStar: false },
      bandBg: '#fbeec1',
      illustration: 'bricks',
      type: 'مواد بناء',
      typeColor: '#7a5a14',
      status: 'متوفر',
      title: 'حديد تسليح 16مم — الدمام',
      meta: [
        { icon: MapPin, label: 'الدمام' },
        { icon: Building, label: 'حديد الراجحي' },
      ],
      price: '3,180',
      priceUnit: 'ر.س / ط',
      cta: 'اطلب',
    },
  },
  {
    id: 'isnad',
    label: 'ساحة إسناد',
    headIcon: Briefcase,
    headIconColor: '#a17827',
    audience: '+100M ر.س',
    audienceTone: 'gold',
    bottomLabel: 'ادخل إسناد',
    href: '/projects/isnad',
    preview: {
      badge: { label: 'ممول', tone: 'gold' },
      bandBg: '#fbeec1',
      illustration: 'bank',
      type: 'تمويل مشروع',
      typeColor: '#7a5a14',
      status: 'مفتوح',
      title: 'شراكة تطوير مجمع طبي — الرياض',
      meta: [
        { icon: MapPin, label: 'الرياض' },
        { icon: TrendingUp, label: '35% إنجاز' },
      ],
      price: '120M',
      cta: 'التفاصيل',
    },
  },
  {
    id: 'solidarity',
    label: 'ساحة التضامن',
    headIcon: Handshake,
    headIconColor: '#b8276a',
    audience: 'للمقاولين',
    bottomLabel: 'ادخل التضامن',
    href: '/projects/solidarity',
    preview: {
      badge: { label: 'تحالف', tone: 'gold' },
      bandBg: '#f8dde5',
      illustration: 'crane',
      type: 'بنية تحتية',
      typeColor: '#b8276a',
      status: 'مفتوح',
      title: 'تحالف تنفيذ طريق — جدة',
      meta: [
        { icon: MapPin, label: 'جدة' },
        { icon: Users, label: '3 مقاولين' },
      ],
      price: '18M',
      cta: 'الانضمام',
    },
  },
];

export default function Arenas() {
  const navigate = useNavigate();

  return (
    <section
      id="arenas"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: '#fafaf6' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header — right-aligned to match the FeaturedProjects layout
            in the same flow. Audience badge appears top-right. */}
        <div className="text-right mb-12 lg:mb-14">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'white',
              border: '1px solid #e5e3dc',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: '#3a3a52',
            }}
          >
            الساحات
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
            لكل دور ساحته
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{ fontSize: 14.5, lineHeight: 1.75, color: '#5a5b78' }}
          >
            6 ساحات متخصّصة — تصفّح نموذجاً من كل ساحة واكتشف ما ينتظرك.
          </p>
        </div>

        {/* Grid — 3 columns on lg, 2 on md, 1 on mobile. */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {ARENAS.map((a, i) => (
            <ArenaCard
              key={a.id}
              arena={a}
              delay={i * 0.05}
              onBottomLink={() => navigate(a.href)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 *  ArenaCard — header + preview + footer link
 * ============================================================ */
function ArenaCard({ arena, delay, onBottomLink }) {
  const HeadIcon = arena.headIcon;
  const audienceStyles = audiencePill(arena.audienceTone);

  return (
    <article
      className="flex flex-col rounded-[18px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'white',
        border: '1px solid #e8e6dd',
        animationDelay: `${delay}s`,
        boxShadow: '0 4px 14px rgba(15,17,71,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="inline-flex items-center gap-2">
          <span
            className="font-display font-bold"
            style={{ fontSize: 15.5, color: '#0f1147' }}
          >
            {arena.label}
          </span>
          <HeadIcon
            size={16}
            strokeWidth={1.9}
            style={{ color: arena.headIconColor, flexShrink: 0 }}
          />
        </div>

        <span
          className="inline-flex items-center rounded-full font-semibold"
          style={{
            ...audienceStyles,
            fontSize: 10.5,
            padding: '3px 9px',
          }}
        >
          {arena.audience}
        </span>
      </div>

      {/* Preview project card — mirrors FeaturedProjects card visual */}
      <PreviewCard preview={arena.preview} />

      {/* Bottom link */}
      <button
        type="button"
        onClick={onBottomLink}
        className="inline-flex items-center justify-center gap-1.5 font-semibold transition-colors"
        style={{
          padding: '14px 16px',
          fontSize: 12.5,
          color: '#2c2f7c',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid #efece4',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {arena.bottomLabel}
        <ArrowLeft size={13} strokeWidth={2} />
      </button>
    </article>
  );
}

function PreviewCard({ preview }) {
  const badgeStyles = badgePill(preview.badge.tone);

  return (
    <div
      className="mx-4 mb-4 rounded-[14px] overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid #efece4',
      }}
    >
      {/* Pastel band with the scene illustration + badge */}
      <div
        className="relative overflow-hidden"
        style={{
          background: preview.bandBg,
          height: 130,
        }}
      >
        <span
          className="absolute inline-flex items-center gap-1 font-bold rounded-full"
          style={{
            top: 10,
            insetInlineStart: 10,
            ...badgeStyles,
            fontSize: 10,
            padding: '3px 8px',
            letterSpacing: '0.02em',
            zIndex: 1,
          }}
        >
          {preview.badge.leadingStar !== false && (
            <Star size={10} strokeWidth={2.2} fill="currentColor" />
          )}
          {preview.badge.label}
        </span>

        <div className="absolute inset-0 flex items-center justify-center">
          <Illustration name={preview.illustration} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4">
        <div
          className="flex items-center gap-1.5 mb-1.5"
          style={{ fontSize: 11.5, fontWeight: 600 }}
        >
          <span style={{ color: preview.typeColor }}>{preview.type}</span>
          <span
            aria-hidden
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#cbcec9',
            }}
          />
          <span style={{ color: '#136d4a' }}>{preview.status}</span>
        </div>

        <h4
          className="font-display m-0 mb-2"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#0f1147',
            lineHeight: 1.35,
          }}
        >
          {preview.title}
        </h4>

        <div
          className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mb-3"
          style={{ fontSize: 11.5, color: '#5a5b78' }}
        >
          {preview.meta.map((m, i) => {
            const Icon = m.icon;
            return (
              <span key={i} className="inline-flex items-center gap-1">
                <Icon size={11} strokeWidth={1.8} />
                {m.label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[9px] font-semibold transition-all"
            style={{
              fontSize: 11.5,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.color = '#3a3a52';
            }}
          >
            {preview.cta}
            <ArrowLeft size={11} strokeWidth={2} />
          </button>

          <div
            className="font-display font-bold inline-flex items-baseline gap-1"
            style={{ fontSize: 17, color: '#0f1147', lineHeight: 1 }}
          >
            {preview.price}
            <span style={{ fontSize: 10.5, color: '#7a7a8c', fontWeight: 600 }}>
              {preview.priceUnit || 'ر.س'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Pill style helpers
 * ============================================================ */
function audiencePill(tone) {
  if (tone === 'gold') {
    return {
      background: 'rgba(184,134,42,0.12)',
      color: '#8a6a1f',
      border: '1px solid rgba(184,134,42,0.25)',
    };
  }
  return {
    background: 'white',
    color: '#3a3a52',
    border: '1px solid #e5e3dc',
  };
}

function badgePill(tone) {
  if (tone === 'sand') {
    return { background: '#a17827', color: 'white' };
  }
  // gold (default)
  return { background: '#8a6a1f', color: 'white' };
}
