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
import { useTranslation } from '../../i18n/LanguageContext';

import arenaImg from '../../assets/arenas/arena.png';
import privateImg from '../../assets/arenas/private.png';
import publicImg from '../../assets/arenas/public.png';
import storeImg from '../../assets/arenas/store.png';
import isnadImg from '../../assets/arenas/isnad.png';
import solidarityImg from '../../assets/arenas/solidarity.png';

const ARENA_IMAGES = {
  arena: arenaImg,
  private: privateImg,
  public: publicImg,
  store: storeImg,
  isnad: isnadImg,
  solidarity: solidarityImg,
};

/* ============================================================
 *  Arenas — six pools, six showcase cards
 *  ----------------------------------------------------------------
 *  Each card is a vertical stack: header (name + role icon +
 *  audience pill), preview (sample project styled like
 *  FeaturedProjects, tinted by arena), and footer link.
 *
 *  All copy comes from i18n; only the visual identity (icons,
 *  band colors, arena image, CTA route) lives in this file.
 *  Add a language by translating the `landing.arenasSection.cards.*`
 *  subtree — no code change needed.
 * ============================================================ */

const ARENAS = [
  {
    id: 'arena',
    headIcon: Target,
    headIconColor: '#2c2f7c',
    href: '/projects/arena',
    preview: {
      bandBg: '#d4ecda',
      badgeTone: 'gold',
      typeColor: '#0d5538',
      price: '22M',
      metaIcons: [MapPin, Ruler],
      metaKeys: ['previewCity', 'previewArea'],
    },
  },
  {
    id: 'private',
    headIcon: Crown,
    headIconColor: '#a17827',
    audienceTone: 'gold',
    href: '/projects/private',
    preview: {
      bandBg: '#e9e6fb',
      badgeTone: 'gold',
      typeColor: '#3a3d99',
      price: '850K',
      metaIcons: [MapPin, Calendar],
      metaKeys: ['previewCity', 'previewDuration'],
    },
  },
  {
    id: 'public',
    headIcon: Globe,
    headIconColor: '#136d4a',
    href: '/projects/public',
    preview: {
      bandBg: '#d4ecda',
      badgeTone: 'gold',
      typeColor: '#0d5538',
      price: '15M',
      metaIcons: [MapPin, Calendar],
      metaKeys: ['previewCity', 'previewDuration'],
    },
  },
  {
    id: 'store',
    headIcon: ShoppingCart,
    headIconColor: '#a17827',
    href: '/store',
    preview: {
      bandBg: '#fbeec1',
      badgeTone: 'sand',
      badgeLeadingStar: false,
      typeColor: '#7a5a14',
      price: '3,180',
      priceUnitKey: 'priceUnit',
      metaIcons: [MapPin, Building],
      metaKeys: ['previewCity', 'previewSupplier'],
    },
  },
  {
    id: 'isnad',
    headIcon: Briefcase,
    headIconColor: '#a17827',
    audienceTone: 'gold',
    href: '/projects/isnad',
    preview: {
      bandBg: '#fbeec1',
      badgeTone: 'gold',
      typeColor: '#7a5a14',
      price: '28M',
      metaIcons: [MapPin, TrendingUp],
      metaKeys: ['previewCity', 'previewProgress'],
    },
  },
  {
    id: 'solidarity',
    headIcon: Handshake,
    headIconColor: '#b8276a',
    href: '/projects/solidarity',
    preview: {
      bandBg: '#f8dde5',
      badgeTone: 'gold',
      typeColor: '#b8276a',
      price: '18M',
      metaIcons: [MapPin, Users],
      metaKeys: ['previewCity', 'previewPartners'],
    },
  },
];

export default function Arenas() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section
      id="arenas"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-start mb-12 lg:mb-14">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-ink-soft)',
            }}
          >
            {t('landing.arenasSection.eyebrow')}
          </div>
          <h2
            className="font-display m-0 mb-3 animate-fade-up"
            style={{
              fontSize: 'clamp(28px, 3.8vw, 42px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--text-ink)',
            }}
          >
            {t('landing.arenasSection.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--text-muted)' }}
          >
            {t('landing.arenasSection.subtitle')}
          </p>
          <p
            className="m-0 mt-1.5 animate-fade-up"
            style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}
          >
            {t('landing.arenasSection.sampleNote')}
          </p>
        </div>

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
 *  ArenaCard
 * ============================================================ */
function ArenaCard({ arena, delay, onBottomLink }) {
  const { t } = useTranslation();
  const HeadIcon = arena.headIcon;
  const audienceStyles = audiencePill(arena.audienceTone);
  const k = `landing.arenasSection.cards.${arena.id}`;

  return (
    <article
      className="flex flex-col rounded-[18px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="inline-flex items-center gap-2">
          <span
            className="font-display font-bold"
            style={{ fontSize: 15.5, color: 'var(--text-ink)' }}
          >
            {t(`${k}.label`)}
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
          {t(`${k}.audience`)}
        </span>
      </div>

      <PreviewCard arena={arena} kBase={k} t={t} />

      <button
        type="button"
        onClick={onBottomLink}
        className="inline-flex items-center justify-center gap-1.5 font-semibold transition-colors"
        style={{
          padding: '14px 16px',
          fontSize: 12.5,
          color: 'var(--text-brand)',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border-soft)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--bg-canvas)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        {t(`${k}.bottom`)}
        <ArrowLeft size={13} strokeWidth={2} />
      </button>
    </article>
  );
}

function PreviewCard({ arena, kBase, t }) {
  const { preview } = arena;
  const badgeStyles = badgePill(preview.badgeTone);
  const imgSrc = ARENA_IMAGES[arena.id];

  return (
    <div
      className="mx-4 mb-4 rounded-[14px] overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{ background: preview.bandBg, height: 130 }}
      >
        {imgSrc && (
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

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
          {preview.badgeLeadingStar !== false && (
            <Star size={10} strokeWidth={2.2} fill="currentColor" />
          )}
          {t(`${kBase}.previewBadge`)}
        </span>
      </div>

      <div className="px-4 pt-3.5 pb-4">
        <div
          className="flex items-center gap-1.5 mb-1.5"
          style={{ fontSize: 11.5, fontWeight: 600 }}
        >
          <span style={{ color: preview.typeColor }}>
            {t(`${kBase}.previewType`)}
          </span>
          <span
            aria-hidden
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#cbcec9',
            }}
          />
          <span style={{ color: '#136d4a' }}>
            {t(`${kBase}.previewStatus`)}
          </span>
        </div>

        <h4
          className="font-display m-0 mb-2"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-ink)',
            lineHeight: 1.35,
          }}
        >
          {t(`${kBase}.previewTitle`)}
        </h4>

        <div
          className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mb-3"
          style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
        >
          {preview.metaIcons.map((Icon, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <Icon size={11} strokeWidth={1.8} />
              {t(`${kBase}.${preview.metaKeys[i]}`)}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[9px] font-semibold transition-all"
            style={{
              fontSize: 11.5,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-ink-soft)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f1147';
              e.currentTarget.style.color = '#0f1147';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-ink-soft)';
            }}
          >
            {t(`${kBase}.cta`)}
            <ArrowLeft size={11} strokeWidth={2} />
          </button>

          <div
            className="font-display font-bold inline-flex items-baseline gap-1"
            style={{ fontSize: 17, color: 'var(--text-ink)', lineHeight: 1 }}
          >
            {preview.price}
            <span
              style={{
                fontSize: 10.5,
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {preview.priceUnitKey
                ? t(`${kBase}.${preview.priceUnitKey}`)
                : t('common.currency')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function audiencePill(tone) {
  if (tone === 'gold') {
    return {
      background: 'rgba(184,134,42,0.12)',
      color: '#8a6a1f',
      border: '1px solid rgba(184,134,42,0.25)',
    };
  }
  return {
    background: 'var(--bg-surface)',
    color: 'var(--text-ink-soft)',
    border: '1px solid var(--border-default)',
  };
}

function badgePill(tone) {
  if (tone === 'sand') return { background: '#a17827', color: 'white' };
  return { background: '#8a6a1f', color: 'white' };
}
