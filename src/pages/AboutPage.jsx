import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, CalendarDays, ShieldCheck, Gem } from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { useTranslation } from '../i18n/LanguageContext';
import { ROLES } from '../components/landing/landingRoles';
import heroLight from '../assets/about/hero-light.svg';
import heroDark from '../assets/about/hero-dark.svg';
import rasdLogo from '../assets/products/rasd.png';
import solidarityLogo from '../assets/products/solidarity.png';
import storeLogo from '../assets/products/store.png';
import academyLogo from '../assets/products/academy.png';
import sbcLogo from '../assets/authorities/saudi-business-center.png';
import saipLogo from '../assets/authorities/saip.png';
import cstLogo from '../assets/authorities/cst.png';

/* ============================================================
 *  AboutPage — /about («من نحن»)
 *  ----------------------------------------------------------------
 *    1. Hero          — headline + three facts over the animated
 *                       blueprint art (light / dark variants)
 *    2. Why we started — the story + a before/after table
 *    3. What we offer  — three pillars
 *    4. Who it's for   — the five roles + Taahud products
 *    5. Vision 2030    — four impact cards + a «not a government
 *                        body» note
 *    6. Licensed       — the three authorities
 *
 *  Text lives in about.*; roles reuse landingRoles.js for their
 *  icons so the page and the landing cards never drift apart.
 * ============================================================ */

const BEFORE_AFTER = ['opportunities', 'contracts', 'payments', 'tracking'];
const PILLARS = ['assignment', 'contracts', 'rasd'];
const WHO_ORDER = ['contractors', 'developers', 'individuals', 'suppliers', 'brokers'];
const VISION = ['digital', 'sme', 'spending', 'data'];

const PRODUCTS = [
  { key: 'rasd', logo: rasdLogo, to: '/#rasd' },
  { key: 'solidarity', logo: solidarityLogo, to: '/pricing' },
  // No logo for إسناد yet — an icon, as in the design.
  { key: 'isnad', icon: Gem, to: '/pricing' },
  { key: 'store', logo: storeLogo, soon: true },
  { key: 'academy', logo: academyLogo, soon: true },
];

const AUTHORITIES = [
  { key: 'sbc', logo: sbcLogo },
  { key: 'saip', logo: saipLogo },
  { key: 'cst', logo: cstLogo },
];

export default function AboutPage() {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();
  const rtl = dir === 'rtl';
  const roleIcon = Object.fromEntries(ROLES.map((r) => [r.key, r.icon]));

  return (
    <>
      <Navbar />
      <main className="about-page" style={{ paddingTop: 116 }}>
        {/* ---------- 1 · Hero ---------- */}
        <section className="ab-hero">
          <div className="ab-bgwrap" aria-hidden>
            <img className="ab-bg ab-light" src={heroLight} alt="" />
            <img className="ab-bg ab-dark" src={heroDark} alt="" />
            <img className="ab-bg2 ab-light" src={heroLight} alt="" />
            <img className="ab-bg2 ab-dark" src={heroDark} alt="" />
          </div>
          <div className="ab-wrap ab-hero-in">
            <div className="ab-hero-txt">
              <span className="ab-badge">
                <i />
                {t('about.hero.badge')}
              </span>
              <h1 className="font-display">
                {t('about.hero.title')}
                <span className="ab-gold">{t('about.hero.titleGold')}</span>
              </h1>
              <div className="ab-facts">
                <div className="ab-f">
                  <span className="ab-f-ic">
                    <Home size={19} strokeWidth={1.7} />
                  </span>
                  <b dir="ltr" className="font-display">
                    2,500<i>+</i>
                  </b>
                  <span className="ab-f-t">{t('about.hero.facts.projects')}</span>
                </div>
                <div className="ab-f">
                  <span className="ab-f-ic">
                    <CalendarDays size={19} strokeWidth={1.7} />
                  </span>
                  <b dir="ltr" className="font-display">
                    2025
                  </b>
                  <span className="ab-f-t">{t('about.hero.facts.launched')}</span>
                </div>
                <div className="ab-f ab-f-wide">
                  <span className="ab-f-ic gold">
                    <ShieldCheck size={19} strokeWidth={1.7} />
                  </span>
                  <b className="font-display sm">{t('about.hero.facts.licensed')}</b>
                  <span className="ab-f-t">{t('about.hero.facts.company')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 2 · Why we started ---------- */}
        <section className="ab-sec">
          <div className="ab-wrap ab-why">
            <div className="ab-why-txt">
              <span className="ab-k">{t('about.why.eyebrow')}</span>
              <h2 className="font-display">{t('about.why.title')}</h2>
              <p>{t('about.why.p1')}</p>
              <p>
                {t('about.why.p2Before')} <b>{t('about.why.p2Strong')}</b> {t('about.why.p2After')}
              </p>
            </div>
            <div className="ab-ba">
              <div className="ab-ba-hd">
                <span>{t('about.why.before')}</span>
                <span className="on">{t('about.why.after')}</span>
              </div>
              {BEFORE_AFTER.map((k) => (
                <div key={k} className="ab-ba-row">
                  <span className="b">{t(`about.why.rows.${k}.before`)}</span>
                  <span className="a">{t(`about.why.rows.${k}.after`)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 3 · What we offer ---------- */}
        <section className="ab-sec ab-alt">
          <div className="ab-wrap">
            <SectionHead t={t} k="offer" />
            <div className="ab-pil">
              {PILLARS.map((k, i) => (
                <article key={k}>
                  <span className="ab-n">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{t(`about.offer.items.${k}.title`)}</h3>
                  <p>{t(`about.offer.items.${k}.body`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 4 · Who it's for ---------- */}
        <section className="ab-sec">
          <div className="ab-wrap">
            <SectionHead t={t} k="who" />
            <div className="ab-who">
              {WHO_ORDER.map((k) => {
                const Icon = roleIcon[k];
                return (
                  <article key={k}>
                    <span className="ab-w-ic">
                      <Icon size={20} strokeWidth={1.6} />
                    </span>
                    <h4>{t(`about.who.items.${k}.title`)}</h4>
                    <p>{t(`about.who.items.${k}.body`)}</p>
                  </article>
                );
              })}
            </div>

            <div className="ab-prod">
              <span className="ab-k">{t('about.who.productsEyebrow')}</span>
              <p className="ab-prod-sub">{t('about.who.productsSubtitle')}</p>
              <div className="ab-prods">
                {PRODUCTS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`ab-pr${p.soon ? ' is-soon' : ''}`}
                    onClick={p.soon ? undefined : () => navigate(p.to)}
                    aria-disabled={p.soon || undefined}
                  >
                    {p.logo ? (
                      <img src={p.logo} alt="" />
                    ) : (
                      <span className="ab-pr-ic">
                        <p.icon size={18} strokeWidth={1.6} />
                      </span>
                    )}
                    <span className="ab-pr-title">
                      <b>{t(`about.who.products.${p.key}.title`)}</b>
                      {p.soon && <em className="ab-soon">{t('landing.roles.badges.soon')}</em>}
                    </span>
                    <span className="ab-pr-d">{t(`about.who.products.${p.key}.body`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 5 · Vision 2030 ---------- */}
        <section className="ab-sec ab-v30">
          <div className="ab-wrap">
            <SectionHead t={t} k="vision" />
            <div className="ab-v30-grid">
              {VISION.map((k, i) => (
                <article key={k}>
                  <span className="ab-n">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{t(`about.vision.items.${k}.title`)}</h3>
                  <p>{t(`about.vision.items.${k}.body`)}</p>
                </article>
              ))}
            </div>
            <p className="ab-v30-note">{t('about.vision.note')}</p>
          </div>
        </section>

        {/* ---------- 6 · Licensed ---------- */}
        <section className="ab-sec ab-alt">
          <div className="ab-wrap">
            <SectionHead t={t} k="trust" />
            <div className="ab-trust">
              {AUTHORITIES.map((a) => (
                <article key={a.key}>
                  <span className="ab-t-logo">
                    <img src={a.logo} alt="" />
                  </span>
                  <b>{t(`about.trust.items.${a.key}.title`)}</b>
                  <span>{t(`about.trust.items.${a.key}.body`)}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <style>{`
        .about-page { background: var(--bg-canvas); }
        .ab-wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
        @media (min-width: 1024px) { .ab-wrap { padding: 0 48px; } }

        /* ---- Hero ---- */
        .ab-hero { position: relative; overflow: hidden; isolation: isolate; }
        .ab-bgwrap { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
        /* The art sits on the side away from the text: left in RTL,
           right in LTR. */
        .ab-bgwrap .ab-bg {
          position: absolute;
          top: 0;
          bottom: 0;
          inset-inline-end: 0;
          width: 52%;
          height: 100%;
          max-width: none;
          object-fit: cover;
          object-position: ${rtl ? '76%' : '24%'} center;
          ${rtl ? '' : 'transform: scaleX(-1);'}
        }
        .ab-bgwrap::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(to ${rtl ? 'right' : 'left'}, transparent 0%, transparent 34%,
              color-mix(in srgb, var(--bg-canvas) 88%, transparent) 56%,
              color-mix(in srgb, var(--bg-canvas) 96%, transparent) 76%, var(--bg-canvas) 100%),
            linear-gradient(to top, var(--bg-canvas) 0%, transparent 10%),
            linear-gradient(to bottom, var(--bg-canvas) 0%, transparent 7%);
        }
        /* The same lines, faint and blurred, carried behind the text. */
        .ab-bg2 {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          object-fit: cover;
          object-position: 34% center;
          opacity: .22;
          filter: blur(3px) saturate(.85);
          -webkit-mask-image:
            linear-gradient(to ${rtl ? 'right' : 'left'}, transparent 0%, transparent 30%, rgba(0,0,0,.55) 52%, rgba(0,0,0,.9) 72%, #000 100%),
            linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-image:
            linear-gradient(to ${rtl ? 'right' : 'left'}, transparent 0%, transparent 30%, rgba(0,0,0,.55) 52%, rgba(0,0,0,.9) 72%, #000 100%),
            linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
          mask-composite: intersect;
          pointer-events: none;
        }
        .ab-dark { display: none; }
        html.dark .ab-light { display: none; }
        html.dark .ab-dark { display: block; }
        html.dark .ab-bg2 { opacity: .3; filter: blur(3.5px) saturate(.9); }

        .ab-hero-in { position: relative; z-index: 3; padding-top: 72px; padding-bottom: 96px; }
        .ab-hero-txt { max-width: 540px; text-align: start; }
        .ab-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-ink-soft);
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 999px;
          padding: 6px 14px;
        }
        .ab-badge i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #136d4a;
          box-shadow: 0 0 0 4px rgba(19,109,74,.15);
        }
        .ab-hero h1 {
          font-weight: 700;
          font-size: clamp(32px, 4.2vw, 56px);
          line-height: 1.34;
          margin: 16px 0 0;
          color: var(--text-brand-deep);
        }
        .ab-gold { display: block; color: #c9a35a; }

        .ab-facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 34px; }
        .ab-f {
          display: grid;
          grid-template-columns: 38px 1fr;
          grid-template-rows: auto auto;
          column-gap: 12px;
          row-gap: 2px;
          align-items: center;
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: 14px 16px;
          background: color-mix(in srgb, var(--bg-surface) 86%, transparent);
          backdrop-filter: blur(10px);
          transition: border-color .18s, transform .18s;
        }
        .ab-f:hover { border-color: var(--bg-ink-deep); transform: translateY(-2px); }
        .ab-f-wide { grid-column: 1 / -1; }
        .ab-f-ic {
          grid-row: 1 / 3;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: rgba(44,47,124,.08);
          color: var(--text-brand);
        }
        .ab-f-ic.gold { background: rgba(167,127,51,.12); color: #a77f33; }
        .ab-f b {
          display: flex;
          align-items: baseline;
          justify-content: flex-start;
          gap: 1px;
          font-weight: 700;
          font-size: 23px;
          color: var(--text-brand);
          line-height: 1.15;
        }
        [dir="rtl"] .ab-f b[dir="ltr"] { justify-content: flex-end; }
        .ab-f b.sm { font-size: 17px; }
        .ab-f b i { font-style: normal; font-size: .6em; color: #a77f33; font-weight: 800; }
        .ab-f-t { font-size: 12px; color: var(--text-muted); line-height: 1.6; }

        /* ---- Shared section bits ---- */
        .ab-sec { padding: 72px 0; }
        .ab-alt { background: var(--bg-surface); }
        .ab-k {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #a77f33;
          letter-spacing: .06em;
          margin-bottom: 10px;
        }
        .ab-head { max-width: 720px; margin: 0 auto 34px; text-align: center; }
        .ab-head h2, .ab-why-txt h2 {
          font-weight: 700;
          line-height: 1.45;
          color: var(--text-ink);
        }
        .ab-head h2 { font-size: clamp(25px, 3vw, 36px); margin: 0 0 10px; }
        .ab-head p { font-size: 15px; line-height: 1.95; color: var(--text-muted); margin: 0; }
        .ab-n {
          display: inline-block;
          font-size: 12px;
          font-weight: 800;
          color: #a77f33;
          letter-spacing: .12em;
          margin-bottom: 12px;
        }

        /* ---- Why ---- */
        .ab-why { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: start; }
        .ab-why-txt h2 { font-size: clamp(24px, 2.8vw, 34px); margin: 0 0 16px; }
        .ab-why-txt p { font-size: 15px; line-height: 2; color: var(--text-muted); margin: 0 0 14px; }
        .ab-why-txt p b { color: var(--text-ink); font-weight: 700; }
        .ab-ba { border: 1px solid var(--border-default); border-radius: 18px; overflow: hidden; background: var(--bg-surface); }
        .ab-ba-hd { display: grid; grid-template-columns: 1fr 1fr; font-size: 12px; font-weight: 800; }
        .ab-ba-hd span { padding: 12px 16px; text-align: center; color: var(--text-muted); background: var(--bg-surface-soft); }
        .ab-ba-hd .on { background: var(--bg-ink-deep); color: #fff; }
        .ab-ba-row { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border-default); }
        .ab-ba-row span { padding: 15px 16px; font-size: 13.5px; line-height: 1.8; }
        .ab-ba-row .b { color: var(--text-muted); border-inline-end: 1px solid var(--border-default); }
        .ab-ba-row .a { color: var(--text-ink); font-weight: 600; }

        /* ---- Pillars / vision cards ---- */
        .ab-pil { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .ab-pil article, .ab-v30-grid article {
          border: 1px solid var(--border-default);
          border-radius: 18px;
          padding: 28px 26px 26px;
          background: var(--bg-canvas);
          transition: transform .18s, box-shadow .18s, border-color .18s;
        }
        .ab-pil article:hover {
          transform: translateY(-3px);
          border-color: var(--bg-ink-deep);
          box-shadow: 0 16px 38px -26px rgba(0,20,128,.4);
        }
        .ab-pil h3, .ab-v30-grid h3 { font-weight: 700; line-height: 1.5; color: var(--text-ink); }
        .ab-pil h3 { font-size: 20px; margin: 0 0 10px; }
        .ab-pil p { font-size: 14px; line-height: 1.95; color: var(--text-muted); margin: 0; }

        /* ---- Who ---- */
        .ab-who { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; align-items: stretch; }
        .ab-who article {
          display: flex;
          flex-direction: column;
          gap: 9px;
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: 22px 18px 20px;
          background: var(--bg-surface);
          transition: transform .18s, border-color .18s, box-shadow .18s;
        }
        .ab-who article:hover {
          transform: translateY(-3px);
          border-color: var(--bg-ink-deep);
          box-shadow: 0 16px 34px -26px rgba(0,20,128,.45);
        }
        .ab-w-ic {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(44,47,124,.08);
          color: var(--text-brand);
          transition: background .18s, color .18s;
        }
        .ab-who article:hover .ab-w-ic { background: var(--bg-ink-deep); color: #fff; }
        .ab-who h4 { font-size: 14.5px; font-weight: 700; margin: 0; line-height: 1.55; min-height: 2.9em; color: var(--text-ink); }
        .ab-who p { font-size: 13px; line-height: 1.85; color: var(--text-muted); margin: 0; }

        .ab-prod { margin-top: 34px; padding-top: 28px; border-top: 1px solid var(--border-default); text-align: center; }
        .ab-prod-sub { font-size: 13.5px; color: var(--text-muted); margin: 0 auto 20px; max-width: 620px; line-height: 1.85; }
        .ab-prods { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .ab-pr {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          text-align: center;
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: 20px 14px 18px;
          background: var(--bg-surface);
          transition: transform .18s, border-color .18s, box-shadow .18s;
        }
        .ab-pr:hover { transform: translateY(-3px); border-color: #a77f33; box-shadow: 0 14px 32px -24px rgba(167,127,51,.6); }
        .ab-pr:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 2px; }
        .ab-pr img { height: 34px; width: auto; max-width: 100px; object-fit: contain; margin-bottom: 4px; background: #fff; border-radius: 6px; padding: 2px 4px; }
        .ab-pr-ic {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: rgba(44,47,124,.08);
          color: var(--text-brand);
          margin-bottom: 4px;
        }
        .ab-pr-title { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; }
        .ab-pr b { font-size: 14px; font-weight: 700; color: var(--text-ink); line-height: 1.5; }
        .ab-pr-d { font-size: 12px; color: var(--text-muted); line-height: 1.7; }
        .ab-pr.is-soon { opacity: .72; cursor: default; }
        .ab-pr.is-soon:hover { transform: none; box-shadow: none; border-color: var(--border-default); }
        .ab-soon {
          font-style: normal;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 999px;
          background: rgba(184,134,42,0.14);
          color: #b8862a;
        }

        /* ---- Vision 2030 ---- */
        .ab-v30 { position: relative; overflow: hidden; }
        .ab-v30::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .5;
          background-image:
            linear-gradient(rgba(0,20,128,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,20,128,.04) 1px, transparent 1px);
          background-size: 40px 40px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 0%, #000, transparent 72%);
          mask-image: radial-gradient(ellipse at 50% 0%, #000, transparent 72%);
        }
        .ab-v30 > * { position: relative; }
        .ab-v30-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .ab-v30-grid article { padding: 24px 24px 22px; border-radius: 16px; background: var(--bg-surface); }
        .ab-v30-grid article:hover { border-color: #a77f33; transform: translateY(-2px); }
        .ab-v30-grid h3 { font-size: 18px; margin: 0 0 9px; }
        .ab-v30-grid p { font-size: 13.5px; line-height: 1.95; color: var(--text-muted); margin: 0; }
        .ab-v30-note { text-align: center; font-size: 12px; color: var(--text-muted); opacity: .85; margin: 22px 0 0; line-height: 1.8; }

        /* ---- Licensed ---- */
        .ab-trust { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .ab-trust article {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: 24px 20px;
          background: var(--bg-canvas);
        }
        .ab-t-logo {
          display: grid;
          place-items: center;
          height: 56px;
          padding: 6px 12px;
          border-radius: 12px;
          background: #fff;
          margin-bottom: 4px;
        }
        .ab-t-logo img { max-height: 44px; width: auto; object-fit: contain; }
        .ab-trust b { font-size: 14.5px; font-weight: 700; line-height: 1.6; color: var(--text-ink); }
        .ab-trust span:last-child { font-size: 12.5px; color: var(--text-muted); }

        /* ---- Responsive ---- */
        @media (max-width: 1180px) {
          .ab-who { grid-template-columns: repeat(3, 1fr); }
          .ab-who h4 { min-height: 0; }
        }
        @media (max-width: 1080px) { .ab-prods { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 980px) {
          .ab-bgwrap .ab-bg { width: 100%; opacity: .35; }
          .ab-hero-txt { max-width: none; }
          .ab-hero-in { padding-top: 56px; padding-bottom: 56px; }
          .ab-why { grid-template-columns: 1fr; gap: 30px; }
          .ab-pil, .ab-trust { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 860px) {
          .ab-bg2 { display: none; }
          .ab-v30-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) { .ab-who { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) {
          .ab-prods { grid-template-columns: 1fr 1fr; }
          .ab-pil, .ab-trust { grid-template-columns: 1fr; }
          .ab-sec { padding: 50px 0; }
        }
        @media (max-width: 620px) {
          .ab-facts { grid-template-columns: 1fr; }
          .ab-f-wide { grid-column: auto; }
        }
        @media (max-width: 520px) { .ab-who { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}

function SectionHead({ t, k }) {
  return (
    <div className="ab-head">
      <span className="ab-k">{t(`about.${k}.eyebrow`)}</span>
      <h2 className="font-display">{t(`about.${k}.title`)}</h2>
      <p>{t(`about.${k}.subtitle`)}</p>
    </div>
  );
}
