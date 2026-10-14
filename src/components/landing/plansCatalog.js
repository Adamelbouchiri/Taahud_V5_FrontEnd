import { useEffect, useMemo, useState } from 'react';
import { HardHat, Building2, Compass, Truck } from 'lucide-react';
import { subscriptions } from '../../services';
import arDict from '../../i18n/dictionaries/ar';
import enDict from '../../i18n/dictionaries/en';
import zhDict from '../../i18n/dictionaries/zh';
import urDict from '../../i18n/dictionaries/ur';

/* ============================================================
 *  plansCatalog — the public pricing catalog, shared by the
 *  landing «باقة مناسبة لكل دور» strip and the /pricing page.
 *  ----------------------------------------------------------------
 *  Live data comes from GET /plans/catalog (public, no auth):
 *
 *    account_types: [{ account_type, currency, starts_from,
 *                      plans: [{ tier, billing_interval_months,
 *                                price, savings_percent,
 *                                features_localized, … }] }]
 *    addons:        [{ code, price, name_*, description_*, … }]
 *
 *  Until it lands — or if it fails — every price falls back to
 *  landing.plans.tiers.* so the page renders instantly and then
 *  upgrades to live prices. Features are always the dictionary's
 *  grouped copy (groupsFor), never the catalog's.
 *
 *  Gotcha: the contractor tier is served as account_type
 *  "entrepreneur", but the UI audience id is "contractor" — each
 *  catalog entry is registered under both keys.
 * ============================================================ */

const DICTS = { ar: arDict, en: enDict, zh: zhDict, ur: urDict };

export const AUDIENCES = [
  { id: 'contractor', icon: HardHat },
  { id: 'engineering', icon: Compass },
  { id: 'developer', icon: Building2 },
  { id: 'supplier', icon: Truck },
];

export const PERIODS = ['1', '6', '12'];

// account_type (from the API/user) → landing dictionary audience key.
export const AUDIENCE_BY_ACCOUNT_TYPE = {
  entrepreneur: 'contractor',
  contractor: 'contractor',
  engineering: 'engineering',
  developer: 'developer',
  supplier: 'supplier',
};

// The catalog only localizes `features_localized` in ar/en. Collapse
// the four UI languages onto those two: RTL (ar, ur) → ar, LTR → en.
function catalogLangFor(lang) {
  return lang === 'ar' || lang === 'ur' ? 'ar' : 'en';
}

/* GET /plans/catalog. Re-fetches only when the ar/en split flips; the
   service caches per language, so toggling back is served from memory. */
function useCatalog(apiLang) {
  const [state, setState] = useState({ loading: true, catalog: null, error: false });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    subscriptions
      .getCatalog({ lang: apiLang })
      .then((catalog) => {
        if (!cancelled) setState({ loading: false, catalog, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, catalog: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [apiLang]);

  return state;
}

/**
 * Everything the pricing UI asks of the catalog, with dictionary
 * fallbacks baked in. All prices come back formatted for display.
 */
export function usePlansCatalog(lang) {
  const { catalog, loading } = useCatalog(catalogLangFor(lang));
  const dict = DICTS[lang] || DICTS.ar;

  const typeMap = useMemo(() => {
    const m = new Map();
    for (const at of catalog?.account_types || []) {
      m.set(at.account_type, at);
      const uiAudience = AUDIENCE_BY_ACCOUNT_TYPE[at.account_type];
      if (uiAudience && !m.has(uiAudience)) m.set(uiAudience, at);
    }
    return m;
  }, [catalog]);

  const dictTier = (aud, tier) => dict?.landing?.plans?.tiers?.[aud]?.[tier] || null;

  // The live plan for audience / tier / period (null if absent). The
  // catalog serves the interval as a number; periods here are strings.
  const livePlan = (aud, tier, per) => {
    const entry = typeMap.get(aud);
    if (!entry) return null;
    return (
      (entry.plans || []).find(
        (p) => p.tier === tier && String(p.billing_interval_months) === String(per)
      ) || null
    );
  };

  const priceFor = (aud, tier, per) => {
    const p = livePlan(aud, tier, per);
    if (p) return formatPrice(p.price, lang);
    return dictTier(aud, tier)?.prices?.[per] || '—';
  };

  // A role's headline: its cheapest 1-month price.
  const startsFrom = (aud) => {
    const entry = typeMap.get(aud);
    if (entry && entry.starts_from != null) return formatPrice(entry.starts_from, lang);
    return priceFor(aud, 'basic', '1');
  };

  // Savings % vs the same tier's 1-month rate, or null. Server-computed
  // when live; derived from the dictionary prices otherwise.
  const savingsFor = (aud, tier, per) => {
    const p = livePlan(aud, tier, per);
    if (p && typeof p.savings_percent === 'number') {
      return p.savings_percent > 0 ? String(p.savings_percent) : null;
    }
    const num = (v) => parseFloat(String(v).replace(/[^\d.]/g, ''));
    const m = num(dictTier(aud, tier)?.prices?.['1']);
    const pr = num(dictTier(aud, tier)?.prices?.[per]);
    const months = parseInt(per, 10);
    if (m > 0 && pr > 0 && months > 1) {
      const pct = ((m * months - pr) / (m * months)) * 100;
      if (pct > 0) return pct.toFixed(1);
    }
    return null;
  };

  // The tier's features, grouped as in «باقات تعاهُد» (highlights /
  // services / tools). This is marketing copy, so it comes from the
  // dictionary, not the catalog's feature slugs. A language without
  // its own groups (ur, zh) shows the English ones.
  const groupsFor = (aud, tier) =>
    dictTier(aud, tier)?.groups || DICTS.en.landing.plans.tiers?.[aud]?.[tier]?.groups || {};

  const addon = (code) => (catalog?.addons || []).find((a) => a.code === code) || null;

  return {
    loading,
    livePlan,
    priceFor,
    startsFrom,
    savingsFor,
    groupsFor,
    addon,
  };
}

/** A tier entry's features as one flat list of available items (the
    «قريبًا» ones left out) — for places that show a plain list. Falls
    back to the older flat `features` array where a dictionary still
    has one. */
export function tierFeatureList(entry) {
  if (!entry) return [];
  if (!entry.groups) return entry.features || [];
  // `tools` is left out with the rest: that whole group is «قريبًا».
  return ['highlights', 'services']
    .flatMap((g) => entry.groups[g] || [])
    .filter((item) => typeof item === 'string');
}

export function formatPrice(price, lang) {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (n == null || Number.isNaN(n)) return String(price ?? '');
  const locale = lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'ar-SA';
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}
