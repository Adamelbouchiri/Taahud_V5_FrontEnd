import React, { useState } from 'react';
import {
  HardHat,
  Truck,
  Building2,
  Handshake,
  Gem,
  Building,
  BarChart3,
  ScanSearch,
  FileSignature,
  Paperclip,
  Bot,
  ClipboardList,
  ShoppingCart,
  CreditCard,
  ScrollText,
  Boxes,
  TrendingUp,
  Star,
  ClipboardCheck,
  Ruler,
  Target,
  Crown,
  Lock,
  Wallet,
  PieChart,
  ShieldCheck,
  LineChart,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

/* ============================================================
 *  Services — three-tab layout
 *  ----------------------------------------------------------------
 *  Audience tabs (contractors / suppliers / developers), each
 *  with a 9-card grid. Titles, descriptions, and tab labels live
 *  in the i18n dictionary at `landing.services.*`; only icons,
 *  accents, and optional badges are configured here.
 * ============================================================ */

const AUDIENCES = [
  {
    id: 'contractors',
    icon: HardHat,
    cards: [
      { key: 'hub', icon: Building, accent: '#136d4a' },
      { key: 'private', icon: Gem, accent: '#3a3d99', badge: 'exclusive', badgeTone: 'gold' },
      { key: 'solidarity', icon: Handshake, accent: '#c9a35a' },
      { key: 'contractGen', icon: FileSignature, accent: '#0f1147', badge: 'new', badgeTone: 'green' },
      { key: 'contractCheck', icon: ScanSearch, accent: '#3a3d99' },
      { key: 'analyzer', icon: BarChart3, accent: '#136d4a' },
      { key: 'tracker', icon: ClipboardList, accent: '#0f1147' },
      { key: 'ai', icon: Bot, accent: '#c9a35a' },
      { key: 'docs', icon: Paperclip, accent: '#3a3d99' },
    ],
  },
  {
    id: 'suppliers',
    icon: Truck,
    cards: [
      { key: 'market', icon: ShoppingCart, accent: '#136d4a' },
      { key: 'rfq', icon: ClipboardCheck, accent: '#c9a35a', badge: 'new', badgeTone: 'green' },
      { key: 'demand', icon: TrendingUp, accent: '#3a3d99' },
      { key: 'delivery', icon: Truck, accent: '#c9a35a' },
      { key: 'payment', icon: CreditCard, accent: '#136d4a' },
      { key: 'contracts', icon: ScrollText, accent: '#0f1147' },
      { key: 'reputation', icon: Star, accent: '#c9a35a' },
      { key: 'inventory', icon: Boxes, accent: '#3a3d99' },
      { key: 'aiSales', icon: Bot, accent: '#136d4a' },
    ],
  },
  {
    id: 'developers',
    icon: Building2,
    cards: [
      { key: 'network', icon: Crown, accent: '#0f1147' },
      { key: 'tenders', icon: Target, accent: '#c9a35a', badge: 'vip', badgeTone: 'sand' },
      { key: 'portfolio', icon: Ruler, accent: '#136d4a' },
      { key: 'escrow', icon: Lock, accent: '#3a3d99' },
      { key: 'financing', icon: Wallet, accent: '#c9a35a' },
      { key: 'analytics', icon: PieChart, accent: '#0f1147' },
      { key: 'qualify', icon: ShieldCheck, accent: '#136d4a' },
      { key: 'investorReports', icon: LineChart, accent: '#3a3d99' },
      { key: 'ai', icon: Bot, accent: '#c9a35a' },
    ],
  },
];

const BADGE_TONES = {
  gold: { bg: 'rgba(201,163,90,0.14)', color: '#a17827', border: 'rgba(201,163,90,0.30)' },
  green: { bg: 'rgba(19,109,74,0.10)', color: '#0d5538', border: 'rgba(19,109,74,0.25)' },
  sand: { bg: 'rgba(201,163,90,0.18)', color: '#9a721d', border: 'rgba(201,163,90,0.40)' },
};

export default function Services() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('contractors');
  const active = AUDIENCES.find((a) => a.id === activeId);

  return (
    <section
      id="services"
      className="relative py-24 lg:py-32 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
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
            {t('landing.services.eyebrow')}
          </div>

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
            {t('landing.services.title')}
          </h2>
        </div>

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
                  background: isActive ? '#0f1147' : 'var(--bg-surface)',
                  color: isActive ? 'white' : 'var(--text-ink-soft)',
                  border: `1px solid ${isActive ? '#0f1147' : 'var(--border-default)'}`,
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
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.color = 'var(--text-ink-soft)';
                  }
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
                {t(`landing.services.tabs.${aud.id}`)}
              </button>
            );
          })}
        </div>

        <p
          className="text-center max-w-[680px] mx-auto mb-12 m-0 animate-fade-up"
          style={{
            fontSize: 14.5,
            lineHeight: 1.8,
            color: 'var(--text-muted)',
          }}
          key={active.id}
        >
          {t(`landing.services.audienceDescriptions.${active.id}`)}
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {active.cards.map((card, i) => (
            <ServiceCard
              key={`${active.id}-${card.key}`}
              card={card}
              audienceId={active.id}
              delay={i * 0.04}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ card, audienceId, delay }) {
  const { t } = useTranslation();
  const Icon = card.icon;
  const badgeTone = card.badge ? BADGE_TONES[card.badgeTone] : null;
  const k = `landing.services.cards.${audienceId}.${card.key}`;

  return (
    <article
      className="relative p-7 rounded-[16px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.boxShadow = '0 16px 32px rgba(15,17,71,0.07)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
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
          {t(`landing.services.badges.${card.badge}`)}
        </span>
      )}

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

      <h3
        className="font-display m-0 mb-2"
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--text-ink)',
          lineHeight: 1.3,
        }}
      >
        {t(`${k}.title`)}
      </h3>

      <p
        className="m-0"
        style={{
          fontSize: 13.5,
          lineHeight: 1.75,
          color: 'var(--text-muted)',
        }}
      >
        {t(`${k}.desc`)}
      </p>
    </article>
  );
}
