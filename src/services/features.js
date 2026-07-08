import http from './http';

/* ============================================================
 *  FEATURES SERVICE — plan feature gating (quotas + access flags).
 *  ----------------------------------------------------------------
 *  Every subscription plan grants a set of FEATURES. Each feature is
 *  one of three types (see FEATURE_GATING_INTEGRATION.md):
 *
 *    boolean   on/off access flag        e.g. arena_ahd_access
 *    counter   monthly quota, resets 1st e.g. submit_offers (30/mo)
 *    lifetime  fixed quota, never resets e.g. external_projects
 *
 *  The backend enforces these; the frontend only surfaces them via
 *  display (usage indicators) and proactive checks (disable a button
 *  before the user hits a 403).
 *
 *  IMPORTANT — family codes, not variants:
 *    Plans store variant codes (submit_offers_30_per_month) but the
 *    API always speaks in FAMILY codes (submit_offers). Always pass a
 *    family code to check() — see FEATURE_FAMILIES below.
 *
 *  Endpoints (all under /api):
 *
 *    GET  /me/features                     full entitlement snapshot
 *    GET  /me/features/check?feature_code  single non-consuming check
 *
 *  Auth: bearer token, auto-attached by http.js.
 * ============================================================ */

/* Known feature family codes. Kept as a reference for callers so the
   magic strings live in one place. Counters reset monthly; lifetime
   quotas never reset; everything else is a boolean access flag. */
export const FEATURE_FAMILIES = {
  // Counters (monthly)
  SUBMIT_OFFERS: 'submit_offers', // bids + partnership offers (shared)
  RFQ: 'rfq',
  AI_PROJECT_ANALYZER: 'ai_project_analyzer',
  AI_MATERIALS_CALCULATOR: 'ai_materials_calculator',
  AI_ENGINEERING_ASSISTANT: 'ai_engineering_assistant',
  AI_EXECUTIVE_ASSISTANT: 'ai_executive_assistant',
  AI_PROJECT_CALCULATOR: 'ai_project_calculator',
  AI_DEVELOPMENT_ADVISOR: 'ai_development_advisor',
  PROJECT_SUPERVISION: 'project_supervision',
  ENGINEERING_FEES_CALCULATOR: 'engineering_fees_calculator',
  // Lifetime quotas
  EXTERNAL_PROJECTS: 'external_projects',
  E_SIGNATURE_NAFATH: 'e_signature_nafath',
  ENGINEERING_DOCUMENTS: 'engineering_documents',
};

/* True when a rejected request is a quota-exhausted / no-feature 403
   rather than a plain authorization failure. Quota errors carry
   `upgrade_required: true` in the body — that's the ONLY reliable
   discriminator (a wrong-arena / own-project 403 does not). Callers
   route these to a subscription upgrade CTA instead of a generic
   "permission denied" message. Pass a normalized error from http.js
   (it exposes `.status` + `.data`). */
export function isQuotaError(err) {
  return err?.status === 403 && err?.data?.upgrade_required === true;
}

/* Normalize a single feature entry (from the /me/features snapshot)
   into the same shape check() returns, so components can treat a
   locally-derived check and a live /check response interchangeably.
   Returns the "no access" shape when the feature is absent from the
   snapshot (the snapshot only lists features the user actually has). */
export function deriveCheck(feature) {
  if (!feature || typeof feature !== 'object') {
    return {
      has_feature: false,
      can_use: false,
      type: null,
      limit: null,
      used: 0,
      remaining: 0,
    };
  }

  if (feature.type === 'boolean') {
    const granted = feature.granted === true;
    return {
      has_feature: granted,
      can_use: granted,
      type: 'boolean',
      limit: null,
      used: 0,
      remaining: null,
      label_ar: feature.label_ar,
      label_en: feature.label_en,
    };
  }

  // counter | lifetime — unlimited when limit is null.
  const unlimited = feature.limit == null;
  const remaining = unlimited ? null : feature.remaining ?? 0;
  return {
    has_feature: true,
    can_use: unlimited || remaining > 0,
    type: feature.type,
    limit: feature.limit,
    used: feature.used ?? 0,
    remaining,
    resets_at: feature.resets_at,
    label_ar: feature.label_ar,
    label_en: feature.label_en,
  };
}

/* Normalize a quota-exhausted 403 body (from a gated write endpoint,
   see isQuotaError) into the same check shape deriveCheck() returns,
   so the upgrade UI can render it uniformly. The 403 body carries
   { feature_code, feature_label_ar, limit, used, remaining,
   upgrade_required }. We infer has_feature from `limit`: an exhausted
   counter carries its cap (limit != null), while a "plan doesn't
   include this" 403 sends limit: null. */
export function quotaErrorToCheck(err) {
  const d = err?.data || {};
  const limit = d.limit ?? null;
  return {
    has_feature: limit !== null,
    can_use: false,
    type: limit !== null ? 'counter' : null,
    limit,
    used: d.used ?? 0,
    remaining: d.remaining ?? 0,
    resets_at: d.resets_at,
    label_ar: d.feature_label_ar,
    label_en: d.feature_label_en,
  };
}

/* ------------------------------------------------------------------
 *  Request dedupe + short-TTL cache for the features snapshot.
 * ------------------------------------------------------------------
 *  useFeatures() is mounted independently by several components on a
 *  single navigation (PlanUsage on the dashboard, the bid/partnership
 *  pages, etc.). Coalesce concurrent callers onto one request and
 *  reuse the result within TTL so we don't fire /me/features per
 *  mount. invalidateFeatures() drops it after a subscription change;
 *  getAll({ force: true }) bypasses it (the hook's refresh()).
 * ------------------------------------------------------------------ */
const FEATURES_TTL_MS = 30_000;
const featuresCache = { value: null, at: 0, inFlight: null };

export function invalidateFeatures() {
  featuresCache.value = null;
  featuresCache.at = 0;
  featuresCache.inFlight = null;
}

export const features = {
  /* ============================================================
   *  GET /me/features
   *  ----------------------------------------------------------------
   *  Full snapshot of the user's entitlements + usage. Returns the
   *  raw envelope { data: { [familyCode]: {...} }, meta: {...} }.
   *
   *    data[code].type          'boolean' | 'counter' | 'lifetime'
   *    data[code].granted       boolean features only
   *    data[code].limit         number | null (null = unlimited)
   *    data[code].used          current usage
   *    data[code].remaining     number | null (null when unlimited)
   *    data[code].resets_at     counters only (ISO, Asia/Riyadh)
   *    data[code].label_ar / label_en
   *    meta.has_active_subscription
   *    meta.is_on_trial
   *
   *  Features change infrequently — deduped + short-TTL cached (see
   *  above) so many hook mounts share one request. Pass
   *  { force: true } to refetch after a subscription change.
   * ============================================================ */
  async getAll({ force = false } = {}) {
    if (!force) {
      if (featuresCache.inFlight) return featuresCache.inFlight;
      if (
        featuresCache.value != null &&
        Date.now() - featuresCache.at < FEATURES_TTL_MS
      ) {
        return featuresCache.value;
      }
    }
    const request = (async () => {
      const res = await http.get('/me/features');
      return {
        data: res?.data && typeof res.data === 'object' ? res.data : {},
        meta: res?.meta ?? {},
      };
    })();
    featuresCache.inFlight = request;
    try {
      const value = await request;
      featuresCache.value = value;
      featuresCache.at = Date.now();
      return value;
    } catch (err) {
      featuresCache.value = null;
      featuresCache.at = 0;
      throw err;
    } finally {
      if (featuresCache.inFlight === request) featuresCache.inFlight = null;
    }
  },

  /* ============================================================
   *  GET /me/features/check?feature_code=X
   *  ----------------------------------------------------------------
   *  Non-consuming "can I use one unit right now?" check. Returns:
   *
   *    { feature_code, feature_label_ar, can_use, has_feature,
   *      limit, used, remaining }
   *
   *  Interpretation:
   *    has_feature=false            → plan doesn't include it (upgrade)
   *    has_feature=true, can_use=false → cap hit (upgrade tier / wait)
   *    can_use=true                 → good to go
   * ============================================================ */
  async check(featureCode) {
    return http.get('/me/features/check', {
      params: { feature_code: featureCode },
    });
  },
};
