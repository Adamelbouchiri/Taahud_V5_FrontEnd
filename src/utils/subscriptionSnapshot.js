/* ============================================================
 *  Subscription price/name snapshots
 *  ----------------------------------------------------------------
 *  Every subscription now carries snapshot fields that freeze the
 *  plan's price + name AT SUBSCRIPTION TIME (see
 *  PRICE_SNAPSHOT_INTEGRATION.md):
 *
 *    price_snapshot        decimal string, e.g. "799.00"
 *    currency_snapshot     e.g. "SAR"
 *    plan_name_ar_snapshot / plan_name_en_snapshot   (may be null)
 *
 *  The snapshot is immutable — repricing/renaming a plan never
 *  updates it. So:
 *
 *    - snapshot fields  → what the user was actually charged / saw
 *                         (receipts, history, admin audit)
 *    - sub.plan.*       → current values (upgrade quotes, marketing)
 *
 *  Every accessor here falls back to the live plan, then a generic
 *  default, so a null snapshot (legacy rows, deleted plans) never
 *  breaks the UI.
 * ============================================================ */

/* Current plan name in the active language (the same ar/en pick the
   rest of the app uses). Used as the fallback when no snapshot name. */
function livePlanName(plan, lang) {
  if (!plan) return '';
  if ((lang === 'ar' || lang === 'ur') && plan.name_ar) return plan.name_ar;
  if (plan.name_en) return plan.name_en;
  return plan.name_ar || plan.code || '';
}

/* The historical plan name the user subscribed under. Prefers the
   snapshot in the active language, then the other snapshot language,
   then the live plan name. RTL langs (ar, ur) map to the Arabic
   snapshot; everyone else to English. */
export function snapshotPlanName(sub, lang) {
  if (!sub) return '';
  const preferAr = lang === 'ar' || lang === 'ur';
  const arSnap = sub.plan_name_ar_snapshot;
  const enSnap = sub.plan_name_en_snapshot;
  const chosen = preferAr ? arSnap || enSnap : enSnap || arSnap;
  return chosen || livePlanName(sub.plan, lang) || '';
}

/* Numeric price the user was charged (snapshot), falling back to the
   current plan price. `price_snapshot` arrives as a decimal string. */
export function snapshotPrice(sub) {
  return toNumber(sub?.price_snapshot) ?? currentPlanPrice(sub);
}

/* Numeric current plan price (for "vs current" comparisons/quotes). */
export function currentPlanPrice(sub) {
  return toNumber(sub?.plan?.price);
}

/* Currency at subscription time (SAR-only today, but honour the field). */
export function snapshotCurrency(sub) {
  return sub?.currency_snapshot || sub?.plan?.currency || 'SAR';
}

/* True only when BOTH a snapshot price and a current price exist and
   they differ by more than a cent — i.e. the plan was repriced after
   this subscription started. */
export function priceChanged(sub) {
  const snap = toNumber(sub?.price_snapshot);
  const cur = toNumber(sub?.plan?.price);
  if (snap == null || cur == null) return false;
  return Math.abs(snap - cur) > 0.01;
}

/* Admin-granted / comped subscription (provider "manual", price 0.00). */
export function isComped(sub) {
  return sub?.provider === 'manual';
}

function toNumber(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isNaN(n) ? null : n;
}
