import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, AlertTriangle, FileText, ShieldCheck, RefreshCw, Cookie } from 'lucide-react';
import Navbar from '../landing/Navbar';
import Footer from '../landing/Footer';
import { useTranslation } from '../../i18n/LanguageContext';
import { CANONICAL_LANG } from '../../legal/content';

/* ============================================================
 *  LegalLayout
 *  ----------------------------------------------------------------
 *  Shared shell for the four legal pages (terms / privacy /
 *  refund / cookies). Renders:
 *
 *    • Landing Navbar + Footer for visual continuity
 *    • Translation disclaimer banner when active lang !== Arabic
 *    • Page header with title + last-updated chip
 *    • Sidebar with sibling-policy nav (sticky on lg+)
 *    • Article body: sections → paragraphs / bullets / subsections
 *    • Closing acknowledgement card
 *
 *  RTL behavior — the back arrow flips with `dir`, and section
 *  text alignment inherits from <html dir>.
 * ============================================================ */

const POLICY_LINKS = [
  { to: '/terms', key: 'terms', icon: FileText },
  { to: '/privacy', key: 'privacy', icon: ShieldCheck },
  { to: '/refund-policy', key: 'refund', icon: RefreshCw },
  { to: '/cookies-policy', key: 'cookies', icon: Cookie },
];

export default function LegalLayout({ content, pageKey }) {
  const navigate = useNavigate();
  const { t, lang, dir } = useTranslation();
  const isCanonical = lang === CANONICAL_LANG;

  // Scroll to top whenever the user navigates between policies.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pageKey]);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <>
      <Navbar />

      <main
        className="pt-[120px] pb-20"
        style={{ background: 'var(--bg-canvas)', color: 'var(--text-ink)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          {/* Back to home */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-[13.5px] font-medium mb-6 transition-colors"
            style={{ color: 'var(--text-ink-soft)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-ink-soft)')}
          >
            <BackIcon size={16} strokeWidth={1.9} />
            {t('legal.chrome.backHome')}
          </button>

          {/* Header */}
          <header className="mb-8">
            <h1
              className="font-display font-bold m-0"
              style={{
                fontSize: 'clamp(28px, 4.2vw, 44px)',
                lineHeight: 1.2,
                color: 'var(--text-ink)',
              }}
            >
              {content.title}
            </h1>
            <div
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'var(--bg-cream)',
                color: 'var(--text-ink-soft)',
                fontSize: 12.5,
                border: '1px solid var(--border-default)',
              }}
            >
              <Clock size={13} strokeWidth={1.9} />
              <span>
                {t('legal.chrome.lastUpdated')}: {content.lastUpdated}
              </span>
            </div>
          </header>

          {/* Translation disclaimer (non-Arabic only) */}
          {!isCanonical && (
            <div
              className="flex items-start gap-3 p-4 rounded-[12px] mb-8"
              style={{
                background: 'rgba(184, 134, 42, 0.08)',
                border: '1px solid rgba(184, 134, 42, 0.30)',
                color: 'var(--text-ink-soft)',
              }}
            >
              <AlertTriangle
                size={18}
                strokeWidth={2}
                style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: 2 }}
              />
              <p className="m-0 text-[13.5px] leading-relaxed">
                {t('legal.chrome.translationDisclaimer')}
              </p>
            </div>
          )}

          {/* Body grid: sidebar nav + article */}
          <div className="grid lg:grid-cols-[240px_1fr] gap-10">
            <aside className="hidden lg:block">
              <nav
                className="sticky top-[120px] p-2 rounded-[14px]"
                style={{
                  background: 'rgb(var(--rgb-surface) / 0.6)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {POLICY_LINKS.map((l) => {
                  const Icon = l.icon;
                  return (
                    <NavLink
                      key={l.key}
                      to={l.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium transition-all ${
                          isActive ? 'font-semibold' : ''
                        }`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-ink-soft)',
                        background: isActive ? 'var(--bg-cream)' : 'transparent',
                        textDecoration: 'none',
                      })}
                    >
                      <Icon size={15} strokeWidth={1.9} />
                      {t(`legal.nav.${l.key}`)}
                    </NavLink>
                  );
                })}
              </nav>
            </aside>

            <article
              className="prose-legal"
              style={{ color: 'var(--text-ink-soft)', maxWidth: '70ch' }}
            >
              {content.intro?.map((para, i) => (
                <p
                  key={`intro-${i}`}
                  className="m-0 mb-4 leading-[1.95] text-[15px]"
                  style={{ color: 'var(--text-ink-soft)' }}
                >
                  {para}
                </p>
              ))}

              {content.sections.map((section, i) => (
                <Section key={i} section={section} />
              ))}

              {content.closing && (
                <div
                  className="mt-8 p-5 rounded-[14px]"
                  style={{
                    background: 'rgba(44, 47, 124, 0.06)',
                    border: '1px solid rgba(44, 47, 124, 0.20)',
                  }}
                >
                  <p
                    className="m-0 text-[14px] leading-[1.85] font-medium"
                    style={{ color: 'var(--text-ink)' }}
                  >
                    {content.closing}
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Section({ section }) {
  return (
    <section className="mt-9">
      <h2
        className="font-display font-bold m-0 mb-3"
        style={{
          fontSize: 19,
          lineHeight: 1.4,
          color: 'var(--text-ink)',
        }}
      >
        {section.heading}
      </h2>

      {section.paragraphs?.map((p, i) => (
        <p
          key={`p-${i}`}
          className="m-0 mb-3 leading-[1.9] text-[14.5px]"
          style={{ color: 'var(--text-ink-soft)' }}
        >
          {p}
        </p>
      ))}

      {section.bullets && (
        <ul
          className="m-0 mb-3 ps-5 list-disc space-y-1.5 leading-[1.85] text-[14.5px]"
          style={{ color: 'var(--text-ink-soft)' }}
        >
          {section.bullets.map((b, i) => (
            <li key={`b-${i}`}>{b}</li>
          ))}
        </ul>
      )}

      {section.subsections?.map((sub, i) => (
        <div key={`sub-${i}`} className="mt-4 ps-4 border-s-2" style={{ borderColor: 'var(--border-default)' }}>
          <h3
            className="font-display font-semibold m-0 mb-2"
            style={{
              fontSize: 15.5,
              lineHeight: 1.45,
              color: 'var(--text-ink)',
            }}
          >
            {sub.heading}
          </h3>
          {sub.paragraphs?.map((p, j) => (
            <p
              key={`subp-${j}`}
              className="m-0 mb-2 leading-[1.9] text-[14px]"
              style={{ color: 'var(--text-ink-soft)' }}
            >
              {p}
            </p>
          ))}
          {sub.bullets && (
            <ul
              className="m-0 mb-2 ps-5 list-disc space-y-1.5 leading-[1.85] text-[14px]"
              style={{ color: 'var(--text-ink-soft)' }}
            >
              {sub.bullets.map((b, j) => (
                <li key={`subb-${j}`}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {section.closing && (
        <p
          className="m-0 mt-3 leading-[1.9] text-[14.5px] italic"
          style={{ color: 'var(--text-muted)' }}
        >
          {section.closing}
        </p>
      )}
    </section>
  );
}
