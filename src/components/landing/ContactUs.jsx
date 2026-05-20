import React from 'react';
import { MessageCircle, LifeBuoy, Phone } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  SALES_WHATSAPP_URL,
  SUPPORT_EMAIL,
  SALES_PHONE_E164,
} from '../../config/constants';

/* ============================================================
 *  ContactUs — "تواصل معنا" section
 *  ----------------------------------------------------------------
 *  Four contact-method cards (WhatsApp / general email / support
 *  email / phone). Each card carries its own scheme:
 *    - WhatsApp opens SALES_WHATSAPP_URL in a new tab.
 *    - Email cards use mailto: with the corresponding inbox.
 *    - Phone uses tel:.
 *
 *  Content lives in i18n at landing.contact.*; only the icon,
 *  accent color, and href builder are wired here.
 * ============================================================ */

const METHODS = [
  {
    key: 'whatsapp',
    icon: MessageCircle,
    accent: '#136d4a',
    accentSoft: 'rgba(19,109,74,0.10)',
    href: SALES_WHATSAPP_URL,
    external: true,
  },
  {
    key: 'support',
    icon: LifeBuoy,
    accent: '#3a3d99',
    accentSoft: 'rgba(58,61,153,0.10)',
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    key: 'phone',
    icon: Phone,
    accent: '#b8862a',
    accentSoft: 'rgba(184,134,42,0.12)',
    href: `tel:${SALES_PHONE_E164}`,
  },
];

export default function ContactUs() {
  const { t } = useTranslation();
  return (
    <section
      id="contact"
      className="relative py-24 lg:py-28 scroll-mt-20"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="text-center max-w-[760px] mx-auto mb-12 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full animate-fade-up"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-ink-soft)',
            }}
          >
            {t('landing.contact.eyebrow')}
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
            {t('landing.contact.title')}
          </h2>
          <p
            className="m-0 animate-fade-up"
            style={{
              fontSize: 14.5,
              lineHeight: 1.85,
              color: 'var(--text-muted)',
            }}
          >
            {t('landing.contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 max-w-[1100px] mx-auto">
          {METHODS.map((m, i) => (
            <MethodCard key={m.key} method={m} delay={i * 0.06} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MethodCard({ method, delay, t }) {
  const Icon = method.icon;
  const k = `landing.contact.methods.${method.key}`;
  return (
    <a
      href={method.href}
      {...(method.external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      className="flex flex-col rounded-[18px] transition-all animate-fade-up hover:-translate-y-1"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        padding: '26px 24px',
        animationDelay: `${delay}s`,
        boxShadow: 'var(--shadow-card)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: method.accentSoft,
          color: method.accent,
          alignSelf: 'flex-start',
        }}
      >
        <Icon size={22} strokeWidth={1.85} />
      </div>
      <h3
        className="font-display m-0 mb-1.5"
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--text-ink)',
          lineHeight: 1.35,
        }}
      >
        {t(`${k}.title`)}
      </h3>
      <div
        className="font-semibold mb-2"
        style={{
          fontSize: 14,
          color: method.accent,
          direction: 'ltr',
          display: 'inline-block',
          unicodeBidi: 'isolate',
        }}
      >
        {t(`${k}.value`)}
      </div>
      <p
        className="m-0 mb-4"
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: 'var(--text-muted)',
        }}
      >
        {t(`${k}.desc`)}
      </p>
      <span
        className="font-semibold mt-auto"
        style={{
          fontSize: 13,
          color: method.accent,
        }}
      >
        {t(`${k}.action`)} →
      </span>
    </a>
  );
}
