import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  Check,
  BellRing,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  CreditCard,
  Tag,
  Wrench,
  HardHat,
  PackageOpen,
} from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { useTranslation } from '../i18n/LanguageContext';

/* ============================================================
 *  StorePage — public coming-soon screen at /store.
 *
 *  Single entry point used from the landing navbar, the user
 *  dashboard sidebar, and the admin dashboard sidebar. The page
 *  is publicly accessible (no auth gate) because guests should
 *  be able to land here from the marketing nav. The "back"
 *  button is context-aware: if the user navigated from inside
 *  the app, it pops one step; otherwise it returns to /.
 *
 *  Visual language mirrors the existing ComingSoonPage variants
 *  but ships a store-themed mock (categories rail + supplier
 *  tiles) instead of the analytics/messages mocks used in the
 *  dashboard placeholder.
 * ============================================================ */

const ACCENT = '#136d4a';
const ACCENT_SOFT = 'rgba(19,109,74,0.10)';

const FEATURE_ICONS = [ShieldCheck, Tag, Truck, CreditCard];

export default function StorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, dir } = useTranslation();
  const [notified, setNotified] = useState(false);

  // Smooth-scroll the user to the top when they arrive — coming
  // from a long dashboard page their scroll position would
  // otherwise carry over and hide the hero.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  // If we arrived with a history entry from this SPA, go back
  // one step. The state flag is set when one of our nav links
  // pushes here; otherwise default to the landing page so guests
  // get a sensible destination.
  const cameFromApp = !!location.state?.from;
  const handleBack = () => {
    if (cameFromApp) navigate(-1);
    else navigate('/');
  };

  // The set of features the BE/marketing copy promises at launch.
  // Keep keys aligned with i18n entries store.features.{0..3}.
  const featureKeys = [0, 1, 2, 3];

  // Category teaser — array provided by the dictionary so each
  // language can write its own labels in natural script.
  const categories = t('store.teaser.categoryItems');
  const categoryArray = Array.isArray(categories) ? categories : [];
  // Icons rotated through the category list; purely decorative.
  const CATEGORY_ICONS = [Wrench, PackageOpen, HardHat, ShoppingBag];

  return (
    <>
      <Navbar />

      <main
        className="pt-[120px] pb-20"
        style={{ background: 'var(--bg-canvas)', color: 'var(--text-ink)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          {/* Back */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-[13.5px] font-medium mb-6 transition-colors"
            style={{ color: 'var(--text-ink-soft)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--accent-primary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--text-ink-soft)')
            }
          >
            <BackIcon size={15} />
            {cameFromApp ? t('store.back') : t('store.backHome')}
          </button>

          {/* ===== Hero ===== */}
          <section
            className="grid gap-8 lg:gap-12 lg:grid-cols-[1.05fr_1fr] items-center mb-12"
          >
            <div className="animate-fade-up">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                style={{
                  background: ACCENT_SOFT,
                  color: ACCENT,
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                <Sparkles size={12} strokeWidth={2} />
                {t('store.eyebrow')} · {t('store.pill')}
              </div>

              <h1
                className="font-display m-0 mb-4"
                style={{
                  fontSize: 'clamp(28px, 4vw, 44px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                  color: 'var(--text-ink)',
                }}
              >
                {t('store.title')}
              </h1>
              <p
                className="m-0 mb-3"
                style={{
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: 'var(--text-ink-soft)',
                  maxWidth: 560,
                }}
              >
                {t('store.subtitle')}
              </p>
              <p
                className="m-0 mb-7"
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.7,
                  color: 'var(--text-muted)',
                  maxWidth: 560,
                }}
              >
                {t('store.description')}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setNotified(true)}
                  disabled={notified}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] text-white font-semibold transition-all"
                  style={{
                    fontSize: 13.5,
                    background: notified ? '#0d5538' : ACCENT,
                    border: `1px solid ${notified ? '#0d5538' : ACCENT}`,
                    cursor: notified ? 'default' : 'pointer',
                    boxShadow: notified
                      ? '0 6px 14px rgba(19,109,74,0.30)'
                      : '0 6px 14px rgba(19,109,74,0.30)',
                    opacity: notified ? 0.95 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (notified) return;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {notified ? (
                    <>
                      <Check size={15} strokeWidth={2.2} />
                      {t('store.notifyDone')}
                    </>
                  ) : (
                    <>
                      <BellRing size={15} strokeWidth={1.9} />
                      {t('store.notify')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] font-semibold transition-all"
                  style={{
                    fontSize: 13.5,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-ink-soft)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.background = 'var(--bg-cream)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                >
                  <BackIcon size={14} strokeWidth={1.9} />
                  {cameFromApp
                    ? t('store.backDashboard')
                    : t('store.backHome')}
                </button>
              </div>
            </div>

            {/* ===== Hero mock ===== */}
            <StoreMock categories={categoryArray} icons={CATEGORY_ICONS} t={t} />
          </section>

          {/* ===== Feature grid ===== */}
          <div
            className="grid gap-4 sm:grid-cols-2 mb-10 animate-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            {featureKeys.map((i) => {
              const Icon = FEATURE_ICONS[i] || ShieldCheck;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 14,
                    padding: '18px 20px',
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: ACCENT_SOFT,
                      color: ACCENT,
                    }}
                  >
                    <Icon size={16} strokeWidth={1.9} />
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: 'var(--text-ink-soft)',
                      fontWeight: 500,
                    }}
                  >
                    {t(`store.features.${i}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}


/* ============================================================
 *  StoreMock — decorative shop-window preview.
 *  ----------------------------------------------------------------
 *  Renders a category rail + a 4-tile supplier grid, all built
 *  with theme tokens so dark mode flips correctly. No real data
 *  involved — the entire surface is a placeholder.
 * ============================================================ */
function StoreMock({ categories, icons, t }) {
  return (
    <div
      className="relative overflow-hidden animate-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 22,
        padding: 22,
        boxShadow: 'var(--shadow-elevated)',
        animationDelay: '0.05s',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: ACCENT_SOFT,
              color: ACCENT,
            }}
          >
            <ShoppingBag size={16} strokeWidth={1.9} />
          </span>
          <span
            style={{
              height: 10,
              width: 110,
              background: 'var(--border-default)',
              borderRadius: 5,
            }}
          />
        </div>
        <span
          style={{
            height: 22,
            width: 70,
            borderRadius: 8,
            background: ACCENT_SOFT,
          }}
        />
      </div>

      {/* Category rail */}
      <div
        className="font-semibold uppercase mb-3"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
        }}
      >
        {t('store.teaser.categories')}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat, i) => {
          const Icon = icons[i % icons.length];
          const isActive = i === 0;
          return (
            <div
              key={`${cat}-${i}`}
              className="inline-flex items-center gap-2"
              style={{
                padding: '8px 12px',
                background: isActive ? ACCENT : 'var(--bg-canvas)',
                color: isActive ? 'white' : 'var(--text-ink-soft)',
                border: `1px solid ${isActive ? ACCENT : 'var(--border-default)'}`,
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <Icon size={13} strokeWidth={1.9} />
              {cat}
            </div>
          );
        })}
      </div>

      {/* Supplier tiles */}
      <div
        className="font-semibold uppercase mb-3"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
        }}
      >
        {t('store.teaser.featured')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-soft)',
              borderRadius: 12,
              padding: '14px 14px 16px',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: ACCENT_SOFT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ACCENT,
                }}
              >
                <ShieldCheck size={13} strokeWidth={2} />
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 7px',
                  borderRadius: 999,
                  background: ACCENT_SOFT,
                  color: ACCENT,
                }}
              >
                {t('store.pill')}
              </span>
            </div>
            <div
              style={{
                height: 8,
                width: '78%',
                background: 'var(--border-default)',
                borderRadius: 4,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 8,
                width: '55%',
                background: 'var(--border-soft)',
                borderRadius: 4,
                marginBottom: 12,
              }}
            />
            <div className="flex items-center justify-between">
              <span
                style={{
                  height: 9,
                  width: 50,
                  background: ACCENT,
                  opacity: 0.7,
                  borderRadius: 5,
                }}
              />
              <span
                style={{
                  height: 9,
                  width: 30,
                  background: 'var(--border-default)',
                  borderRadius: 5,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Preview ribbon */}
      <div
        className="absolute"
        style={{
          bottom: 14,
          insetInlineEnd: 14,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '5px 12px',
          borderRadius: 999,
          fontSize: 10.5,
          fontWeight: 700,
          color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-card)',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        {t('store.previewLabel')}
      </div>
    </div>
  );
}
