import React, { useState } from 'react';
import {
  Calculator,
  Zap,
  Lock,
  FileText,
  BarChart3,
  PackageCheck,
  Award,
  PenLine,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  PlatformFeatures — "أبرز الميزات" carousel
 *  ----------------------------------------------------------------
 *  Nine capability cards shown three-at-a-time in a paged
 *  carousel (prev / next + dots). Sits under Testimonials on the
 *  landing page. Content lives in i18n under landing.features.*;
 *  only the icons + accent colors are wired here.
 *
 *  The header is start-aligned (right in RTL, left in LTR) to
 *  mirror the reference design.
 * ============================================================ */

const ACCENTS = [
  { c: '#136d4a', s: 'rgba(19,109,74,0.10)' },
  { c: '#b8862a', s: 'rgba(184,134,42,0.12)' },
  { c: '#2c2f7c', s: 'rgba(44,47,124,0.10)' },
];

// Order matches the reference slides (three per page).
const FEATURES = [
  { key: 'calculator', icon: Calculator },
  { key: 'assistant', icon: Zap },
  { key: 'escrow', icon: Lock },
  { key: 'contracts', icon: FileText },
  { key: 'dashboards', icon: BarChart3 },
  { key: 'approval', icon: PackageCheck },
  { key: 'trust', icon: Award },
  { key: 'signature', icon: PenLine },
  { key: 'suppliers', icon: Globe },
];

const PAGE_SIZE = 3;

export default function PlatformFeatures() {
  const { t, dir } = useTranslation();
  const [page, setPage] = useState(0);

  const pages = Math.ceil(FEATURES.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visible = FEATURES.slice(start, start + PAGE_SIZE);

  const go = (delta) => setPage((p) => (p + delta + pages) % pages);

  // Chevrons flip with reading direction so "next" always points
  // "forward" for the reader.
  const NextChevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const PrevChevron = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <section
      id="features"
      className="relative py-24 lg:py-28 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header — start-aligned */}
        <div className="max-w-[820px] mb-12 lg:mb-14 text-start">
          <div
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-ink-soft)',
            }}
          >
            {t('landing.features.eyebrow')}
          </div>
          <h2
            className="font-display m-0 mb-4 animate-fade-up"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 38px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              color: 'var(--text-brand-deep)',
            }}
          >
            {t('landing.features.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 14.5,
              lineHeight: 1.85,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Cards — re-keyed on page so they re-animate on change */}
        <div
          key={page}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {visible.map((f, i) => (
            <FeatureCard
              key={f.key}
              feature={f}
              accent={ACCENTS[(start + i) % ACCENTS.length]}
              delay={i * 0.05}
              t={t}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <NavButton
            variant="ghost"
            onClick={() => go(-1)}
            label={t('landing.features.prev')}
            Chevron={PrevChevron}
            iconFirst
          />

          <div className="flex items-center gap-2">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}`}
                onClick={() => setPage(i)}
                style={{
                  height: 8,
                  width: i === page ? 26 : 8,
                  borderRadius: 999,
                  border: 0,
                  cursor: 'pointer',
                  padding: 0,
                  background:
                    i === page ? '#14164d' : 'var(--border-strong)',
                  transition: 'width 0.25s ease, background 0.25s ease',
                }}
              />
            ))}
          </div>

          <NavButton
            variant="solid"
            onClick={() => go(1)}
            label={t('landing.features.next')}
            Chevron={NextChevron}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, accent, delay, t }) {
  const Icon = feature.icon;
  const k = `landing.features.items.${feature.key}`;
  return (
    <article
      className="flex items-start gap-4 rounded-[16px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: '20px 20px',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="min-w-0 flex-1">
        <h3
          className="font-display m-0 mb-1.5"
          style={{
            fontSize: 15.5,
            fontWeight: 700,
            color: 'var(--text-brand-deep)',
            lineHeight: 1.35,
          }}
        >
          {t(`${k}.title`)}
        </h3>
        <p
          className="m-0"
          style={{
            fontSize: 12.5,
            lineHeight: 1.7,
            color: 'var(--text-muted)',
          }}
        >
          {t(`${k}.desc`)}
        </p>
      </div>
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: accent.s,
          color: accent.c,
        }}
      >
        <Icon size={20} strokeWidth={1.85} />
      </div>
    </article>
  );
}

function NavButton({ variant, onClick, label, Chevron, iconFirst }) {
  const solid = variant === 'solid';
  const chevron = <Chevron size={15} strokeWidth={2.2} />;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 font-semibold transition-all"
      style={{
        fontSize: 13,
        padding: '9px 16px',
        borderRadius: 10,
        cursor: 'pointer',
        background: solid ? '#14164d' : 'var(--bg-surface)',
        color: solid ? 'white' : 'var(--text-ink-soft)',
        border: `1px solid ${solid ? '#14164d' : 'var(--border-default)'}`,
        boxShadow: solid ? '0 6px 14px rgba(20,22,77,0.20)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (solid) e.currentTarget.style.background = '#1d1f63';
        else {
          e.currentTarget.style.borderColor = 'var(--border-strong)';
          e.currentTarget.style.background = 'var(--bg-cream)';
        }
      }}
      onMouseLeave={(e) => {
        if (solid) e.currentTarget.style.background = '#14164d';
        else {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.background = 'var(--bg-surface)';
        }
      }}
    >
      {iconFirst ? (
        <>
          {chevron}
          {label}
        </>
      ) : (
        <>
          {label}
          {chevron}
        </>
      )}
    </button>
  );
}
