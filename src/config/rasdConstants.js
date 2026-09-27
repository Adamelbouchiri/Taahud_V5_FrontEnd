/* ============================================================
 *  RASD (رصد) CONSTANTS — the market-intelligence add-on.
 *  ----------------------------------------------------------------
 *  Mirrors RASD_API_1.md §5. The `value` strings are the BE enum
 *  values — they're what filters send and what responses key on.
 *  Never translate a value, only its label.
 *
 *  Every RASD response ships an Arabic `*_label` beside each value.
 *  We still translate from the VALUE through our own dictionaries:
 *  the platform ships four languages and RASD sends one. The API
 *  label is the fallback when we have no key (and the only source
 *  for free-form text like a city name or an open role's `note`).
 *
 *  This is the opposite direction from the mapping the doc warns
 *  about — we never derive a value from a label, so an edited
 *  Arabic label can't drift a filter.
 * ============================================================ */

/* ---------- Stage — roughly chronological ----------
   Ordered as the project moves, not alphabetically, so a filter
   dropdown and a pipeline view both read correctly. `tendering`
   and `awarded` are the two that matter commercially. */
export const RASD_STAGES = [
  'detected',
  'announced',
  'planning',
  'design',
  'tendering',
  'awarded',
  'under_construction',
  'on_hold',
  'completed',
  'unknown',
];

export const RASD_STAGE_TONE = {
  detected: 'muted',
  announced: 'default',
  planning: 'default',
  design: 'default',
  tendering: 'primary',
  awarded: 'success',
  under_construction: 'primary',
  on_hold: 'warning',
  completed: 'muted',
  unknown: 'muted',
};

/* ---------- Sector ---------- */
export const RASD_SECTORS = [
  'residential',
  'commercial',
  'hospitality',
  'healthcare',
  'education',
  'infrastructure',
  'industrial',
  'mixed_use',
  'other',
];

/* ---------- Party role ----------
   Used three ways: the `parties` on a project (who is already in),
   its `open_roles` (where you can get in), and the `role` filter on
   the company directory.

   `auditor` (v1.2) is the statutory auditor — 680 party rows, second
   only to owner and consultant, and never a buyer for a contractor or
   a supplier. It stays in the directory filter for whoever looks for
   one specifically, but a project's roster folds it away behind
   «show all parties» (RASD_COLLAPSED_ROLES). */
export const RASD_PARTY_ROLES = [
  'owner',
  'developer',
  'main_contractor',
  'subcontractor',
  'consultant',
  'engineering_office',
  'supplier',
  'auditor',
  'other',
];

export const RASD_COLLAPSED_ROLES = ['auditor'];

/* ---------- Company category ----------
   Only three of these were populated before v1.2; all seven are now.
   `unclassified` is mostly audit firms awaiting a later pass — it's
   rendered as «unclassified», never hidden. */
export const RASD_COMPANY_CATEGORIES = [
  'owner_client',
  'developer',
  'general_contractor',
  'specialist_contractor',
  'consultant',
  'materials_supplier',
  'unclassified',
];

/* ---------- Confidence ----------
   `needs_verification` is the default for every collected record, so
   most rows carry it. It means "not yet confirmed", NOT "probably
   wrong" — hence a neutral tone rather than a warning.

   `medium` is the exception worth surfacing: in today's dataset it
   marks exactly the rows whose open roles were INFERRED, and it
   travels with the disclaimer in `notes`. See OpenRolesPanel. */
export const RASD_CONFIDENCE = ['high', 'medium', 'needs_verification'];

export const RASD_CONFIDENCE_TONE = {
  high: 'success',
  medium: 'warning',
  needs_verification: 'default',
};

/* ---------- Contact role category ----------
   `role_category` on a company's contacts (v1.2). May be null — the
   source doesn't classify everyone — and a null row is shown as
   «unclassified», never dropped. */
export const RASD_CONTACT_ROLES = [
  'decision_maker',
  'procurement',
  'business_dev',
  'project_lead',
  'other',
];

/* ---------- Sort ---------- */
export const RASD_SORTS = ['recent', 'value_desc', 'value_asc'];

/* The BE validates per_page as 1–50. 20 is its default; we ask for
   15 to match the rhythm of the other list pages in the app. */
export const RASD_PER_PAGE = 15;

/* ============================================================
 *  Who the module is for.
 *  ----------------------------------------------------------------
 *  RASD is sold to businesses looking for work: contractors,
 *  engineering offices, suppliers, developers, brokers. Individuals
 *  are on the free tier, post one project of their own and have
 *  nothing to do with a market feed — so the module is hidden from
 *  them entirely rather than shown as an upsell they can't take.
 *
 *  This is a PRESENTATION rule, not a security boundary. The real
 *  entitlement is the `rasd.access` middleware, which resolves the
 *  ACCOUNT OWNER's subscription backend-side. Both the sidebar group
 *  and the /rasd routes read this one function so the two can't
 *  drift into a visible-but-unreachable (or worse, the reverse) pair.
 * ============================================================ */
/* How the platform names رصد in the two places that say whether a
   user already has it: the feature snapshot (/me/features) and the
   plans catalog. Both are read by useRasdEnrollment, which only ever
   decides which BUTTON to draw — the gate itself is backend-side.

   رصد is sold as TWO plans, both granting the same `rasd_access`
   feature and differing only in price and prerequisite:
     rasd_addon           standalone            11,999 / 12 months
     rasd_addon_bundled   on top of a base plan  6,999 / 12 months
   Either one means enrolled, so both are matched. */
export const RASD_FEATURE_CODE = 'rasd_access';
export const RASD_PLAN_CODES = ['rasd_addon', 'rasd_addon_bundled'];

export function isRasdPlan(code) {
  return RASD_PLAN_CODES.includes(code);
}

/* ============================================================
 *  Selling رصد — by conversation, not by checkout.
 *  ----------------------------------------------------------------
 *  رصد isn't bought with a card yet. Every "get رصد" affordance in
 *  the app therefore lands on the same place: the رصد section on the
 *  landing page, whose form puts the lead in front of a human.
 *
 *  Two consequences, and both are the point of this constant:
 *
 *    1. ONE destination. The dashboard banner, the broker workspace,
 *       the 403 screen and the two plan cards all route here, so
 *       switching them to a real checkout later is one edit.
 *    2. NO PRICE. A price on a card whose button doesn't charge it is
 *       a quote we haven't made — isRasdPlan() suppresses the figure
 *       on both plan cards, and the copy blocks describe what you get
 *       and who it's for instead of what it costs.
 *
 *  The landing page scrolls to `#rasd` on mount and on hash change,
 *  so this works from anywhere in the app.
 * ============================================================ */
export const RASD_CTA_ROUTE = '/#rasd';

export const RASD_ACCOUNT_TYPES = [
  'entrepreneur',
  'engineering',
  'supplier',
  'developer',
  'broker',
];

export function canUseRasd(accountType) {
  return RASD_ACCOUNT_TYPES.includes(accountType);
}

/* ============================================================
 *  Render rules — the ones RASD_API_1.md §7 spells out, kept here
 *  so no page re-derives them (and none of them quietly drifts).
 * ============================================================ */

/**
 * A project mirrored in from Taahud's own arena rather than collected
 * from the market. Internal projects must NEVER show a contact
 * section or a reveal affordance, whatever else is on screen.
 */
export function isInternalProject(project) {
  return project?.is_internal === true;
}

/**
 * The contact block renders for collected projects only. On a project
 * it is always empty (`contacts: []`, `contacts_locked: true`) — the
 * people belong to companies, and the section points there.
 */
export function showContactSection(record) {
  return !isInternalProject(record);
}

/**
 * Which of three states one contact channel is in — RASD v1.2 §3–5.
 *
 *   'none'      no number / address exists  → «no direct number», no reveal
 *   'masked'    exists, reveal is locked     → phone_masked + reveal button
 *   'revealed'  exists, reveal is open       → the full value
 *
 * Keyed on `has_phone` / `has_email`, NEVER on whether `phone` is
 * present. `contacts_locked: false` is a temporary demo mode; when it
 * closes, `phone` and `email` go back to null on every row and the
 * reveal-credit flow takes over. Built on `has_*`, that day changes
 * nothing here.
 *
 * @param {object} contact
 * @param {'phone'|'email'} kind
 */
export function contactChannel(contact, kind) {
  if (!contact?.[`has_${kind}`]) return 'none';
  return contact[kind] ? 'revealed' : 'masked';
}

/**
 * Whole months from today until a `YYYY-MM-DD` date — negative once
 * it has passed, null when there's no date. `expected_end_at` is the
 * strongest timing signal in the data: eighteen months out a project
 * is still buying, two months out it isn't.
 */
export function monthsUntil(date) {
  if (!date) return null;
  const end = new Date(`${date}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  if (end.getDate() < now.getDate()) months -= 1;
  return months;
}

/* A project with fewer months than this left on its schedule is past
   most of its procurement — the badge drops from «still buying» green
   to a caution tone. */
export const RASD_LATE_STAGE_MONTHS = 6;

/**
 * Open roles are the reason someone pays for RASD. Everything that
 * treats a project as an "opportunity" keys off this.
 */
export function hasOpenRoles(project) {
  return (project?.open_roles?.length ?? 0) > 0;
}

/**
 * `note` preserves what the collector actually typed; `role_label`
 * is the enum's normalization of it. Often they differ usefully
 * (مقاول من الباطن / مقاول أنظمة MEP) and often they're identical —
 * rendering both then reads «مقاول رئيسي — مقاول رئيسي».
 *
 * Compares against the API's own Arabic label rather than our
 * translated one: the collector typed Arabic, so that's the only
 * comparison where "identical" means identical.
 */
export function showRoleNote(openRole) {
  const note = (openRole?.note || '').trim();
  if (!note) return false;
  return note !== (openRole?.role_label || '').trim();
}

/**
 * The value column is empty across the whole dataset today
 * (`estimated_value` null on every project). Hide the value tile
 * rather than render a confident zero — and don't promote a value
 * range to a primary filter while this returns false.
 */
export function hasValueData(totals) {
  return Number(totals?.estimated_value_total || 0) > 0;
}
