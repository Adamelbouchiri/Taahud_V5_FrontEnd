import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mail, Globe, MapPin, Instagram } from 'lucide-react';
import Logo from '../Logo';

/* ============================================================
 *  Footer — landing page footer
 *  ----------------------------------------------------------------
 *  Dark navy/black background, four columns:
 *    1. Brand block (logo + tagline + social icons)
 *    2. المنصة         — section nav (services / arenas / etc.)
 *    3. للمستخدمين      — user-type entry points
 *    4. تواصل معنا      — contact info (whatsapp / email / web / city)
 *
 *  Bottom bar shows the copyright line.
 * ============================================================ */

const NAV_PLATFORM = [
  { label: 'الخدمات', href: '#services' },
  { label: 'الساحات', href: '#arenas' },
  { label: 'الإشادات', href: '#testimonials' },
  { label: 'الباقات', href: '#plans' },
];

export default function Footer() {
  const navigate = useNavigate();

  const goLogin = () => navigate('/login');
  const goRegister = () => navigate('/register');

  return (
    <footer
      className="relative"
      style={{ background: '#080927', color: 'rgba(255,255,255,0.78)' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* === Column 1: Brand ===
              First in DOM order so RTL flow places it on the right. */}
          <div>
            <div className="mb-5">
              <Logo height={56} variant="white" />
            </div>
            <p
              className="m-0 mb-6"
              style={{
                fontSize: 13,
                lineHeight: 1.85,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              منصة سعودية رائدة تربط المقاولين والموردين والمطوّرين العقاريين —
              بناء قطاع مقاولات أكثر شفافية وكفاءة.
            </p>
            <div className="flex items-center gap-2.5">
              <SocialBtn href="https://instagram.com/taahud_sa" Icon={Instagram} label="Instagram" />
              <SocialBtn href="https://wa.me/966537372053" Icon={MessageCircle} label="WhatsApp" />
            </div>
          </div>

          {/* === Column 2: Platform === */}
          <FooterColumn title="المنصة">
            {NAV_PLATFORM.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </FooterColumn>

          {/* === Column 3: For users === */}
          <FooterColumn title="للمستخدمين">
            <FooterLink onClick={goRegister}>للمقاولين</FooterLink>
            <FooterLink onClick={goRegister}>للموردين</FooterLink>
            <FooterLink onClick={goRegister}>للمطوّرين</FooterLink>
            <FooterLink onClick={goLogin}>تسجيل الدخول</FooterLink>
          </FooterColumn>

          {/* === Column 4: Contact === */}
          <FooterColumn title="تواصل معنا">
            <ContactRow Icon={MessageCircle}>
              <span style={{ direction: 'ltr', display: 'inline-block' }}>
                واتساب: 0537372053
              </span>
            </ContactRow>
            <ContactRow Icon={Mail}>
              <a
                href="mailto:hello@taahud.sa"
                className="hover:text-white transition-colors"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                hello@taahud.sa
              </a>
            </ContactRow>
            <ContactRow Icon={Globe}>
              <a
                href="https://taahud.sa"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                taahud.sa
              </a>
            </ContactRow>
            <ContactRow Icon={MapPin}>الرياض، السعودية</ContactRow>
          </FooterColumn>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-6 text-center">
          <p
            className="m-0"
            style={{
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.7,
            }}
          >
            © 2026 <strong style={{ color: 'rgba(255,255,255,0.85)' }}>تعاهُد</strong>{' '}
            — جميع الحقوق محفوظة. مشاريع أكثر، مشاكل أقل.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function FooterColumn({ title, children }) {
  return (
    <div>
      <h3
        className="font-display font-bold m-0 mb-4"
        style={{
          fontSize: 14,
          color: 'white',
          letterSpacing: '0.01em',
        }}
      >
        {title}
      </h3>
      <ul className="m-0 p-0 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, onClick, children }) {
  const className = 'list-none transition-colors';
  const style = {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    lineHeight: 1.5,
  };

  return (
    <li>
      {href ? (
        <a
          href={href}
          className={className}
          style={{ ...style, textDecoration: 'none', display: 'block' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
          }
        >
          {children}
        </a>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className={`${className} bg-transparent border-0 p-0 text-right w-full`}
          style={{ ...style, fontFamily: 'inherit' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
          }
        >
          {children}
        </button>
      )}
    </li>
  );
}

function ContactRow({ Icon, children }) {
  return (
    <li
      className="list-none flex items-start gap-2.5"
      style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.6,
      }}
    >
      <Icon
        size={14}
        strokeWidth={1.7}
        style={{
          color: 'rgba(255,255,255,0.45)',
          flexShrink: 0,
          marginTop: 3,
        }}
      />
      <span>{children}</span>
    </li>
  );
}

function SocialBtn({ href, Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center transition-all"
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.75)',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(201,163,90,0.18)';
        e.currentTarget.style.borderColor = 'rgba(201,163,90,0.40)';
        e.currentTarget.style.color = '#c9a35a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
      }}
    >
      <Icon size={16} strokeWidth={1.8} />
    </a>
  );
}
