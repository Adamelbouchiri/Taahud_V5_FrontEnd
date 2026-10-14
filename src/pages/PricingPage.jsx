import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, BadgeCheck, AlertCircle, Gem, Users, ShieldCheck } from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { useTranslation } from '../i18n/LanguageContext';
import { subscriptions } from '../services';
import { hasToken } from '../services/session';
import { snapshotPlanName } from '../utils/subscriptionSnapshot';
import { AUDIENCES, PERIODS, usePlansCatalog, formatPrice } from '../components/landing/plansCatalog';
import { RASD_CTA_ROUTE } from '../config/rasdConstants';
import rasdLogo from '../assets/products/rasd.png';

/* ============================================================
 *  PricingPage — /pricing («الباقات والأسعار»)
 *  ----------------------------------------------------------------
 *  Hero, then the role plans from «باقات تعاهُد»: pick a role, a
 *  tier (Basic / Premium) and a period (monthly / 6-month / yearly
 *  cards), then the tier's features in two panels — description +
 *  highlights, and the services and tools «قريبًا» beside them.
 *
 *  Prices come from the public catalog (GET /plans/catalog — see
 *  plansCatalog.js), with the dictionary as fallback. Feature lists
 *  are the dictionary's (landing.plans.tiers).
 *
 *  `?role=engineering` preselects a role — the landing cards link
 *  here with it. Suppliers aren't open yet: their card and plans
 *  carry «قريبًا» and the choose button is disabled.
 *
 *  Choosing a plan goes to /subscribe for a signed-in user (it owns
 *  checkout and knows their account type) and to /register for a
 *  guest. The add-on cards below (إسناد / تضامن) do the same.
 * ============================================================ */

const ROLE_IDS = AUDIENCES.map((a) => a.id);
const TIERS = ['basic', 'premium'];
const GROUPS = ['highlights', 'services', 'tools'];
// Roles shown with their plans but not open for subscription yet.
const SOON_ROLES = ['supplier'];
const RASD_POINTS = ['planning', 'roles', 'contacts'];
// Monthly list prices, shown until the catalog's `addons` land.
const ADDON_FALLBACK_PRICES = { isnad_addon: 999, solidarity_addon: 799 };

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang, dir } = useTranslation();
  const catalog = usePlansCatalog(lang);
  const status = useSubscriptionStatus();

  const initialRole = searchParams.get('role');
  const [role, setRole] = useState(ROLE_IDS.includes(initialRole) ? initialRole : 'contractor');
  const [tier, setTier] = useState('basic');
  const [period, setPeriod] = useState('1');

  const signedIn = hasToken();
  const start = () => navigate(signedIn ? '/subscribe' : '/register');
  const roleSoon = SOON_ROLES.includes(role);

  return (
    <>
      <Navbar />
      <main className="pricing-page" style={{ paddingTop: 116 }}>
        {/* ---------- Hero ---------- */}
        <section className="pr-hero">
          <div className="pr-wrap text-center">
            <span className="pr-badge">
              <i />
              {t('landing.plans.eyebrow')}
            </span>
            <h1 className="font-display">{t('landing.plans.title')}</h1>
            <p>{t('landing.plans.subtitle')}</p>
          </div>
        </section>

        {/* ---------- Role plans ---------- */}
        <section className="pr-picker">
          <div className="pr-wrap">
            <SubscriptionStatusCard status={status} lang={lang} t={t} onNavigate={navigate} />

            <div className="pr-roles" role="radiogroup" aria-label={t('landing.plans.eyebrow')}>
              {AUDIENCES.map((aud) => {
                const Icon = aud.icon;
                return (
                  <button
                    key={aud.id}
                    type="button"
                    role="radio"
                    aria-checked={role === aud.id}
                    className="pr-role"
                    onClick={() => setRole(aud.id)}
                  >
                    <span className="pr-role-ic">
                      <Icon size={28} strokeWidth={1.6} />
                    </span>
                    <b>
                      {t(`landing.plans.audiences.${aud.id}`)}
                      {SOON_ROLES.includes(aud.id) && <span className="pr-soon">{t('pricing.soon')}</span>}
                    </b>
                    <span className="from">{t('landing.plans.startsFrom')}</span>
                    <strong className="font-display">{catalog.startsFrom(aud.id)}</strong>
                    <small>{t('landing.plans.perMonth')}</small>
                  </button>
                );
              })}
            </div>

            <div className="pr-tierbar">
              <div className="pr-tierseg" role="radiogroup">
                {TIERS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={tier === k}
                    onClick={() => setTier(k)}
                  >
                    {t(`landing.plans.${k}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pr-durs" role="radiogroup">
              {PERIODS.map((per) => {
                const saving = catalog.savingsFor(role, tier, per);
                return (
                  <button
                    key={per}
                    type="button"
                    role="radio"
                    aria-checked={period === per}
                    className="pr-du"
                    onClick={() => setPeriod(per)}
                  >
                    <span className="m">{t(`landing.plans.periodLabels.${per}`)}</span>
                    <strong className="font-display">{catalog.priceFor(role, tier, per)}</strong>
                    <small>
                      {per === '1' ? t('landing.plans.perMonth') : t('landing.plans.periodTotal')}
                    </small>
                    {saving && <span className="sv">{t('landing.plans.saveX', { value: saving })}</span>}
                  </button>
                );
              })}
            </div>

            <FeaturePanels role={role} tier={tier} catalog={catalog} t={t} soon={roleSoon} />

            {roleSoon ? (
              <button type="button" className="pr-pchoose" disabled>
                {t('pricing.soon')}
              </button>
            ) : (
              <button type="button" className="pr-pchoose" onClick={start}>
                {t(tier === 'premium' ? 'landing.plans.choosePremium' : 'landing.plans.chooseBasic')}{' '}
                {dir === 'rtl' ? '←' : '→'}
              </button>
            )}

            <p className="pr-note">
              {t('pricing.priceNote')}
              <br />
              {t('landing.plans.bottomNote')}
            </p>
          </div>
        </section>

        <AddonsSection catalog={catalog} lang={lang} t={t} onNavigate={navigate} onStart={start} />
      </main>
      <Footer />

      <style>{PRICING_CSS}</style>
    </>
  );
}

/* The chosen tier's features in two panels: its description and
   «أبرز المزايا» with checks, then everything else — services and
   the «قريبًا» tools — as a dotted list. Premium lists only what it
   adds over Basic, under a «كل ما في بيسك» note. */
function FeaturePanels({ role, tier, catalog, t, soon }) {
  const groups = catalog.groupsFor(role, tier);
  const rest = GROUPS.slice(1).filter((g) => groups[g]?.length);
  const item = (it) => (typeof it === 'string' ? { text: it, soon: false } : it);

  return (
    <div className={`pr-fp ${tier}`}>
      <article className="pr-fpanel">
        <span className="pr-fp-tag">{t(`landing.plans.${tier}`)}</span>
        {soon && <span className="pr-soon">{t('pricing.soon')}</span>}
        <p className="pr-fp-desc">{t(`landing.plans.tiers.${role}.${tier}.description`)}</p>
        {tier === 'premium' && (
          <p className="pr-incl">
            <Check size={15} strokeWidth={2.4} aria-hidden />
            {t('pricing.includesBasic')}
          </p>
        )}
        <h4 className="pr-fp-label">{t('pricing.groups.highlights')}</h4>
        <ul className="pr-fp-checks">
          {(groups.highlights || []).map(item).map((f) => (
            <li key={f.text} className={f.soon ? 'is-soon' : undefined}>
              <span className="ck">
                <Check size={12} strokeWidth={2.6} />
              </span>
              <span>
                {f.text}
                {f.soon && <span className="pr-soon">{t('pricing.soon')}</span>}
              </span>
            </li>
          ))}
        </ul>
      </article>

      {rest.length > 0 && (
        <article className="pr-fpanel">
          <h4 className="pr-fp-label">{t('landing.plans.allFeatures')}</h4>
          <div className="pr-fp-scroll">
            {rest.map((g) => (
              <div key={g} className="pr-group">
                <h4>
                  {t(`pricing.groups.${g}`)}
                  {g === 'tools' && <span className="pr-soon">{t('pricing.soon')}</span>}
                </h4>
                <ul>
                  {groups[g].map(item).map((f) => {
                    const soon = g === 'tools' || f.soon;
                    return (
                      <li key={f.text} className={soon ? 'is-soon' : undefined}>
                        {f.text}
                        {soon && g !== 'tools' && <span className="pr-soon">{t('pricing.soon')}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}

/* «إضافات وخدمات مستقلة»: رصد (priced by quote, leads to the landing
   callback form), ساحة إسناد (an add-on to a plan) and تضامن (bought
   on its own), then the refund guarantee. Add-on prices come from the
   catalog's `addons`, with the list prices as fallback. */
function AddonsSection({ catalog, lang, t, onNavigate, onStart }) {
  const price = (code) => formatPrice(catalog.addon(code)?.price ?? ADDON_FALLBACK_PRICES[code], lang);
  const cards = [
    {
      key: 'isnad',
      icon: Gem,
      title: t('pricing.arenas.rows.isnad.title'),
      desc: t('pricing.addons.isnadDesc'),
      price: price('isnad_addon'),
      cta: t('pricing.arenas.rows.isnad.cta'),
    },
    {
      key: 'solidarity',
      icon: Users,
      title: t('pricing.products.rows.solidarity.title'),
      desc: t('pricing.addons.solidarityDesc'),
      price: price('solidarity_addon'),
      cta: t('pricing.products.rows.solidarity.cta'),
    },
  ];

  return (
    <section className="pr-addons">
      <div className="pr-wrap">
        <div className="text-center">
          <h2 className="font-display">{t('pricing.addons.title')}</h2>
          <p>{t('pricing.addons.subtitle')}</p>
        </div>

        <div className="pr-ad-grid">
          <article className="pr-ad rasd">
            <i className="pr-ad-rings" aria-hidden />
            <div className="pr-ad-head">
              <img src={rasdLogo} alt={t('landing.rasd.logoAlt')} className="pr-ad-logo" />
              <span className="pr-ad-tag">{t('pricing.addons.badges.rasd')}</span>
            </div>
            <h3 className="font-display">{t('pricing.products.rows.rasd.title')}</h3>
            <p className="pr-ad-desc">{t('pricing.addons.rasdDesc')}</p>
            <ul className="pr-ad-points">
              {RASD_POINTS.map((k) => (
                <li key={k}>{t(`pricing.addons.rasdPoints.${k}`)}</li>
              ))}
            </ul>
            <div className="pr-ad-foot">
              <div className="pr-ad-price">
                <strong className="font-display">{t('pricing.products.rows.rasd.price')}</strong>
                <small>{t('pricing.products.rows.rasd.priceNote')}</small>
              </div>
              <button type="button" className="pr-ad-btn" onClick={() => onNavigate(RASD_CTA_ROUTE)}>
                {t('pricing.products.rows.rasd.cta')}
              </button>
            </div>
          </article>

          {cards.map(({ key, icon: Icon, title, desc, price: p, cta }) => (
            <article key={key} className="pr-ad">
              <div className="pr-ad-head">
                <span className="pr-ad-ic">
                  <Icon size={20} strokeWidth={1.7} />
                </span>
                <span className="pr-ad-tag">{t(`pricing.addons.badges.${key}`)}</span>
              </div>
              <h3 className="font-display">{title}</h3>
              <p className="pr-ad-desc">{desc}</p>
              <div className="pr-ad-foot">
                <div className="pr-ad-price">
                  <strong className="font-display">{p}</strong>
                  <small>{t('landing.plans.perMonth')}</small>
                </div>
                <button type="button" className="pr-ad-btn" onClick={onStart}>
                  {cta}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="pr-guarantee">
          <ShieldCheck size={22} strokeWidth={1.8} aria-hidden />
          <p>
            <b>{t('pricing.guarantee.label')}</b> {t('pricing.guarantee.body')}{' '}
            <Link to="/refund-policy">{t('pricing.guarantee.link')}</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}

const PRICING_CSS = `
  .pricing-page { background: var(--bg-canvas); }
  .pr-wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
  @media (min-width: 1024px) { .pr-wrap { padding: 0 48px; } }

  /* Hero */
  .pr-hero { position: relative; padding: 72px 0 48px; overflow: hidden; isolation: isolate; }
  .pr-hero::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image:
      linear-gradient(to right, rgba(15,17,71,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(15,17,71,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    -webkit-mask-image: radial-gradient(ellipse 70% 80% at 50% 30%, #000 30%, transparent 80%);
    mask-image: radial-gradient(ellipse 70% 80% at 50% 30%, #000 30%, transparent 80%);
  }
  .pr-badge {
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
  .pr-badge i { width: 7px; height: 7px; border-radius: 50%; background: #136d4a; box-shadow: 0 0 0 4px rgba(19,109,74,.15); }
  .pr-hero h1 {
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 700;
    line-height: 1.3;
    margin: 20px 0 0;
    color: var(--text-brand-deep);
  }
  .pr-hero p { max-width: 62ch; margin: 18px auto 0; font-size: 17px; line-height: 1.9; color: var(--text-muted); }

  /* Role picker */
  .pr-picker { padding: 24px 0 80px; }
  .pr-roles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-bottom: 36px; }
  .pr-role {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 30px 20px;
    background: var(--bg-surface);
    border: 1.5px solid var(--border-default);
    border-radius: 20px;
    text-align: center;
    transition: border-color .15s, box-shadow .15s;
  }
  .pr-role:hover { border-color: var(--border-strong); }
  .pr-role[aria-checked="true"] { border: 2px solid var(--bg-ink-deep); box-shadow: 0 14px 30px -18px rgba(44,47,124,.45); }
  .pr-role:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 3px; }
  .pr-role-ic {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    background: var(--bg-cream);
    color: var(--text-brand);
    display: grid;
    place-items: center;
    margin-bottom: 14px;
  }
  .pr-role[aria-checked="true"] .pr-role-ic { background: rgba(44,47,124,.10); }
  .pr-role b { font-size: 19px; font-weight: 700; color: var(--text-ink); }
  .pr-role .from { font-size: 14px; color: var(--text-muted); margin-top: 8px; }
  .pr-role strong { font-size: 40px; font-weight: 700; line-height: 1.1; color: var(--text-ink); }
  .pr-role small { font-size: 13px; color: var(--text-muted); }

  /* Basic / Premium toggle */
  .pr-tierbar { display: flex; justify-content: center; margin-bottom: 36px; }
  .pr-tierseg {
    display: inline-flex;
    gap: 4px;
    padding: 5px;
    border: 1px solid var(--border-default);
    border-radius: 14px;
    background: var(--bg-surface);
  }
  .pr-tierseg button {
    border: 0;
    background: none;
    min-width: 120px;
    height: 44px;
    border-radius: 10px;
    font: inherit;
    font-weight: 700;
    font-size: 17px;
    color: var(--text-muted);
    cursor: pointer;
    transition: background .15s, color .15s;
  }
  .pr-tierseg button[aria-checked="true"] { background: var(--bg-ink-deep); color: #fff; }
  .pr-tierseg button:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 2px; }

  /* Duration cards */
  .pr-durs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1000px; margin: 0 auto 28px; }
  .pr-du {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 2px;
    padding: 22px;
    text-align: center;
    background: var(--bg-surface);
    border: 1.5px solid var(--border-default);
    border-radius: 18px;
    transition: border-color .15s;
  }
  .pr-du:hover { border-color: var(--border-strong); }
  .pr-du[aria-checked="true"] { border: 2px solid var(--bg-ink-deep); }
  .pr-du:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 3px; }
  .pr-du .m { font-size: 15px; color: var(--text-muted); }
  .pr-du[aria-checked="true"] .m { color: var(--text-brand); font-weight: 700; }
  .pr-du strong { font-size: 30px; font-weight: 700; line-height: 1.2; color: var(--text-ink); }
  .pr-du small { font-size: 13px; color: var(--text-muted); }
  .pr-du .sv { margin-top: 8px; font-size: 13px; font-weight: 700; color: #2f6b4a; background: rgba(47,107,74,.10); border-radius: 999px; padding: 2px 12px; }

  /* Feature panels */
  .pr-fp { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 1000px; margin: 0 auto 20px; align-items: start; }
  .pr-fpanel {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 18px;
    padding: 22px 24px;
    box-shadow: var(--shadow-card);
  }
  .pr-fp-tag {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
    border-radius: 999px;
    padding: 3px 10px;
    background: rgba(44,47,124,.10);
    color: #2c2f7c;
  }
  .pr-fp.premium .pr-fp-tag { background: rgba(184,134,42,.10); color: #b8862a; }
  .pr-fp-desc {
    margin: 0 0 18px;
    padding: 12px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.75;
    color: var(--text-ink-soft);
    background: var(--bg-canvas);
    border: 1px solid var(--border-soft);
  }
  .pr-fp-label {
    margin: 0 0 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .pr-fp-checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .pr-fp-checks li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.55; color: var(--text-ink-soft); }
  .pr-fp-checks .ck {
    flex: none;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    border-radius: 6px;
    background: rgba(44,47,124,.10);
    color: #2c2f7c;
  }
  .pr-fp.premium .pr-fp-checks .ck { background: rgba(184,134,42,.10); color: #b8862a; }
  .pr-fp-checks li.is-soon { color: var(--text-muted); }
  .pr-fp-checks li.is-soon .ck { background: var(--bg-canvas); color: var(--text-muted); }
  .pr-fp-scroll { max-height: 440px; overflow-y: auto; padding-inline-end: 4px; }
  .pr-fp-scroll .pr-group:first-child { margin-top: 0; }

  .pr-pchoose {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    max-width: 1000px;
    height: 60px;
    margin: 0 auto;
    border: 0;
    border-radius: 12px;
    background: var(--bg-ink-deep);
    color: #fff;
    font: inherit;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s;
  }
  .pr-pchoose:hover { background: var(--bg-ink-deep-hover); }
  .pr-pchoose:disabled { cursor: not-allowed; background: var(--bg-canvas); color: var(--text-muted); border: 1px dashed var(--border-strong); }
  .pr-incl {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 18px;
    padding: 10px 14px;
    border: 1px dashed rgba(167,127,51,.6);
    border-radius: 12px;
    background: rgba(167,127,51,.07);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-ink);
  }
  .pr-incl svg { color: #a77f33; flex: none; }
  .pr-group { margin-top: 20px; }
  .pr-group h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-brand-deep);
  }
  .pr-group h4::after { content: ""; flex: 1; height: 1px; background: var(--border-default); }
  .pr-group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
  .pr-group li { position: relative; padding-inline-start: 16px; font-size: 14px; line-height: 1.7; color: var(--text-ink-soft); }
  .pr-group li::before {
    content: "";
    position: absolute;
    inset-inline-start: 0;
    top: 9px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--bg-ink-deep);
  }
  .pr-fp.premium .pr-group li::before { background: #b8862a; }
  .pr-group li.is-soon { color: var(--text-muted); }
  .pr-group li.is-soon::before { background: var(--border-strong); }
  .pr-soon {
    display: inline-block;
    margin-inline-start: 8px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.6;
    color: #8e6a26;
    background: rgba(167,127,51,.14);
    border-radius: 999px;
    padding: 0 9px;
    vertical-align: middle;
  }
  .pr-group h4 .pr-soon { margin-inline-start: 0; }
  .pr-note { text-align: center; color: var(--text-muted); font-size: 14px; line-height: 1.9; margin: 20px 0 0; }

  /* Add-ons & standalone services */
  .pr-addons { padding: 16px 0 96px; }
  .pr-addons h2 { font-size: clamp(26px, 3vw, 38px); font-weight: 700; line-height: 1.35; margin: 0; color: var(--text-brand-deep); }
  .pr-addons h2 + p { margin: 12px auto 0; max-width: 70ch; font-size: 15.5px; line-height: 1.85; color: var(--text-muted); }
  .pr-ad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1000px; margin: 36px auto 20px; }
  .pr-ad {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 26px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 20px;
  }
  .pr-ad.rasd {
    border-color: rgba(184,134,42,.45);
    border-inline-start: 3px solid #b8862a;
    box-shadow: 0 18px 36px -24px rgba(138,109,47,.55);
  }
  .pr-ad-rings {
    position: absolute;
    width: 260px;
    height: 260px;
    top: -110px;
    inset-inline-end: -90px;
    border-radius: 50%;
    background: repeating-radial-gradient(circle, rgba(184,134,42,.16) 0 1px, transparent 1px 22px);
    pointer-events: none;
  }
  .pr-ad > :not(.pr-ad-rings) { position: relative; }
  .pr-ad-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  .pr-ad-logo { height: 40px; width: auto; }
  .pr-ad-ic {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--bg-cream);
    color: #a77f33;
  }
  .pr-ad-tag {
    font-size: 11.5px;
    font-weight: 700;
    line-height: 1.6;
    padding: 3px 12px;
    border-radius: 999px;
    background: rgba(167,127,51,.12);
    color: #8e6a26;
    white-space: nowrap;
  }
  .pr-ad.rasd .pr-ad-tag { background: #a77f33; color: #fff; }
  .pr-ad h3 { margin: 0 0 10px; font-size: 21px; font-weight: 700; color: var(--text-ink); }
  .pr-ad.rasd h3 { color: var(--text-brand-deep); }
  .pr-ad-desc { margin: 0 0 18px; font-size: 14px; line-height: 1.95; color: var(--text-muted); }
  .pr-ad-points { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 8px; }
  .pr-ad-points li { position: relative; padding-inline-start: 16px; font-size: 13px; line-height: 1.7; color: var(--text-ink-soft); }
  .pr-ad-points li::before {
    content: "";
    position: absolute;
    inset-inline-start: 0;
    top: 8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #a77f33;
  }
  .pr-ad-foot {
    margin-top: auto;
    padding-top: 18px;
    border-top: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .pr-ad-price { display: grid; gap: 2px; }
  .pr-ad-price strong { font-size: 30px; font-weight: 700; line-height: 1.15; color: var(--text-brand-deep); }
  .pr-ad.rasd .pr-ad-price strong { font-size: 20px; color: #a77f33; }
  .pr-ad-price small { font-size: 12px; line-height: 1.6; color: var(--text-muted); }
  .pr-ad-btn {
    flex: none;
    border: 0;
    border-radius: 10px;
    padding: 11px 18px;
    background: var(--bg-ink-deep);
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s;
  }
  .pr-ad-btn:hover { background: var(--bg-ink-deep-hover); }
  .pr-ad.rasd .pr-ad-btn { background: #a77f33; }
  .pr-ad.rasd .pr-ad-btn:hover { background: #8a6d2f; }
  .pr-ad-btn:focus-visible { outline: 2px solid var(--bg-ink-deep); outline-offset: 2px; }
  .pr-guarantee {
    display: flex;
    align-items: center;
    gap: 14px;
    max-width: 1000px;
    margin: 0 auto;
    padding: 22px 26px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 18px;
  }
  .pr-guarantee svg { flex: none; color: #136d4a; }
  .pr-guarantee p { margin: 0; font-size: 14px; line-height: 1.8; color: var(--text-ink-soft); }
  .pr-guarantee b { color: var(--text-ink); }
  .pr-guarantee a { color: var(--text-brand); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }

  @media (max-width: 900px) {
    .pr-roles { grid-template-columns: repeat(2, 1fr); }
    .pr-ad-grid { grid-template-columns: 1fr; max-width: 560px; }
    .pr-fp { grid-template-columns: 1fr; }
    .pr-fp-scroll { max-height: none; overflow: visible; }
  }
  @media (max-width: 560px) {
    .pr-roles { gap: 12px; }
    .pr-role { padding: 22px 14px; }
    .pr-role strong { font-size: 32px; }
    .pr-durs { grid-template-columns: 1fr; gap: 12px; }
    .pr-tierseg button { min-width: 0; padding: 0 22px; }
    .pr-fpanel { padding: 18px; }
    .pr-pchoose { height: 54px; font-size: 16px; }
    .pr-ad { padding: 20px; }
    .pr-guarantee { align-items: flex-start; padding: 18px; }
  }
`;

/* /subscriptions/me for a signed-in visitor; null for guests (who
   never hit the API) and on failure. */
function useSubscriptionStatus() {
  const signedIn = typeof window !== 'undefined' && hasToken();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    subscriptions
      .getStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // signedIn is read from storage and stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}

/* Signed-in visitors see where they stand above the picker: an active
   plan (with a link to manage it) or an expired trial. Guests and
   users mid-trial see nothing. */
function SubscriptionStatusCard({ status, lang, t, onNavigate }) {
  if (!status) return null;

  const baseSub = (status.active_subscriptions || []).find((s) => !s.plan?.is_addon);

  if (baseSub) {
    // The name the user subscribed under (snapshot), not the current plan.
    const planName = snapshotPlanName(baseSub, lang);
    const date = formatPlanDate(baseSub.current_period_ends_at, lang);
    return (
      <StatusBanner
        tone="success"
        icon={BadgeCheck}
        title={t('subscribe.page.activeBanner.title')}
        body={t('subscribe.page.activeBanner.body', { name: planName, date })}
        actionLabel={t('subscribe.page.activeBanner.manage')}
        onAction={() => onNavigate('/subscribe')}
      />
    );
  }

  if (status.on_trial) return null;

  if (!status.has_access) {
    return (
      <StatusBanner
        tone="danger"
        icon={AlertCircle}
        body={t('subscribe.page.trial.expired')}
        actionLabel={t('subscribe.profile.noAccess.cta')}
        onAction={() => onNavigate('/subscribe')}
      />
    );
  }

  return null;
}

function StatusBanner({ tone, icon: Icon, title, body, actionLabel, onAction }) {
  const p =
    tone === 'success'
      ? { bg: 'rgba(19,109,74,0.06)', border: 'rgba(19,109,74,0.22)', color: '#0d5538' }
      : { bg: 'rgba(185,28,28,0.06)', border: 'rgba(185,28,28,0.22)', color: '#b91c1c' };

  return (
    <div
      className="max-w-[1000px] mx-auto mb-8 rounded-[14px] flex items-start gap-3"
      style={{ background: p.bg, border: `1px solid ${p.border}`, padding: '14px 18px' }}
    >
      <Icon size={20} strokeWidth={1.9} style={{ color: p.color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-display font-bold mb-0.5" style={{ fontSize: 14, color: 'var(--text-ink)' }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-ink-soft)', lineHeight: 1.6 }}>{body}</div>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="font-semibold flex-shrink-0"
          style={{
            fontSize: 12.5,
            padding: '7px 12px',
            borderRadius: 9,
            border: `1px solid ${p.border}`,
            color: p.color,
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function formatPlanDate(d, lang) {
  if (!d) return '';
  try {
    const locale = lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'ar-SA';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(
      new Date(d)
    );
  } catch {
    return d;
  }
}
