/* ============================================================
   Project constants — drives the dropdowns on the Create
   Project wizard. Stored values go straight into the
   `projects` table fields (see migration).
   ============================================================ */

/* ============================================================
   Project arenas — saved to the `arena` column.
   ----------------------------------------------------------------
   Five pools, sourced from the V5 packages workbook
   (تعاهد_الباقات_والساحات.xlsx → sheet 05_الساحات):

     - public      الساحة العامة (نمو)    aggregated public opportunities
     - private     الساحة الخاصة (عهد)    individual customer projects
     - solidarity  ساحة التضامن           contractor-to-contractor cooperation
     - arena       ساحة أرينا              developer's project pool
     - isnad       ساحة إسناد              large / financed projects (>100M ر.س)
                                          — requires the إسناد upgrade (600 ر.س/شهر)

   Each entry carries:
     - `postableBy`:  account types allowed to CREATE a project here.
                     Empty array = system-locked (no one can post manually).
                     The public arena is system-locked because its content
                     is aggregated from external sources (E'timad, Forsa,
                     Muqawil...) via API — users can't add to it.
     - `viewableBy`: account types allowed to VIEW non-owned projects in
                     this arena. Per FRONTEND_INTEGRATION.md §3:
                     owners/partners always see their own regardless.
     - `applicableBy`: account types allowed to SUBMIT BIDS on projects
                     here. Per FRONTEND_INTEGRATION.md §3 — matches the
                     viewer table for internal arenas, but kept as its
                     own field because the matrices could diverge later
                     (e.g. suppliers eventually viewing public but not
                     applying via the same channel).
     - `lockReason`:  short Arabic hint shown when the picker is locked
                     for that account type
     - `systemLocked`: true when no one can post (public arena).
                       Picker shows a "system" hint instead of a role hint.
     - `isUpgrade`:  true for إسناد — clicking opens the upgrade modal
                    instead of selecting the arena
     - `upgradePrice` (optional): displayed on the upgrade card
   ============================================================ */
export const ARENAS = [
  {
    value: 'public',
    label: 'الساحة العامة',
    shortLabel: 'نمو',
    desc: 'فرص عامّة مجمّعة من مصادر خارجيّة (اعتماد، فرصة، مقاول...) تظهر للموردين والمقاولين والمكاتب الهندسيّة.',
    color: '#2c2f7c',
    accentSoft: 'rgba(44,47,124,0.08)',
    postableBy: [],
    systemLocked: true,
    viewableBy: ['supplier', 'entrepreneur', 'engineering'],
    // Public is a future tendersalerts proxy — no bidding via this API.
    applicableBy: [],
    lockReason: 'الفرص العامّة تُجمَع تلقائيّاً من مصادر خارجيّة.',
  },
  {
    value: 'private',
    label: 'الساحة الخاصة',
    shortLabel: 'عهد',
    desc: 'مشاريع حصريّة لعملاء تعاهد — تُعرض على المقاولين والمكاتب الهندسيّة.',
    color: '#136d4a',
    accentSoft: 'rgba(19,109,74,0.08)',
    postableBy: ['individual'],
    viewableBy: ['entrepreneur', 'engineering'],
    applicableBy: ['entrepreneur', 'engineering'],
    lockReason: 'متاحة لعملاء تعاهد فقط.',
  },
  {
    value: 'solidarity',
    label: 'ساحة التضامن',
    shortLabel: 'التضامن',
    desc: 'تعاون بين المقاولين على مشاريع أكبر أو متعدّدة التخصّصات.',
    color: '#b8862a',
    accentSoft: 'rgba(184,134,42,0.10)',
    postableBy: ['entrepreneur'],
    viewableBy: ['entrepreneur'],
    // Per FRONTEND_INTEGRATION.md §3 — solidarity is entrepreneur-only,
    // engineering offices cannot apply here.
    applicableBy: ['entrepreneur'],
    lockReason: 'مخصّصة للمقاولين فقط.',
  },
  {
    value: 'arena',
    label: 'ساحة أرينا',
    shortLabel: 'أرينا',
    desc: 'الساحة الخاصّة بالمطوّر العقاري لطرح مشاريعه واستقبال العروض.',
    color: '#7a3aa3',
    accentSoft: 'rgba(122,58,163,0.10)',
    postableBy: ['developer'],
    // Per FRONTEND_INTEGRATION.md §3 — non-owner viewers are entrepre-
    // neurs and engineering offices. The developer owns the projects
    // here and sees them via "my projects" (owner check), not as a
    // marketplace browser.
    viewableBy: ['entrepreneur', 'engineering'],
    applicableBy: ['entrepreneur', 'engineering'],
    lockReason: 'مخصّصة للمطوّر العقاري.',
  },
  {
    value: 'isnad',
    label: 'ساحة إسناد',
    shortLabel: 'إسناد',
    desc: 'وصول حصري إلى المشاريع الكبرى والفرص التمويليّة (+100 مليون ر.س).',
    color: '#0d5538',
    accentSoft: 'rgba(13,85,56,0.10)',
    // Posting is restricted to real-estate developers (screenshot
    // 2026-05-12 153348 — "من يستطيع تنزيل / طرح المشروع؟").
    postableBy: ['developer'],
    // Per FRONTEND_INTEGRATION.md §3 — entrepreneurs, engineering, and
    // OTHER developers may view/apply. ('financier' is in the roadmap
    // but not a real account_type yet, so it's omitted.)
    viewableBy: ['entrepreneur', 'engineering', 'developer'],
    applicableBy: ['entrepreneur', 'engineering', 'developer'],
    isUpgrade: true,
    upgradePrice: '600 ر.س / شهر',
    lockReason: 'تتطلّب ترقية إسناد.',
  },
];

export function arenaLabel(value) {
  return ARENAS.find((a) => a.value === value)?.label || value || '';
}

export function arenaConfig(value) {
  return ARENAS.find((a) => a.value === value) || ARENAS[0];
}

/* ============================================================
 *  Account-type → default arena on project creation.
 *  ----------------------------------------------------------------
 *  Used by CreateProjectPage to set the initial selection in the
 *  ArenaPicker. Mirrors the "who posts where" matrix in the
 *  packages workbook:
 *
 *    individual    → private    (their own projects)
 *    entrepreneur  → solidarity (cooperation with other contractors)
 *    developer     → arena      (developer's dedicated pool)
 *    engineering   → (none)     (only posts via إسناد upgrade)
 *    supplier      → (none)     (suppliers don't post projects)
 *
 *  Public is never a default — it's system-locked (aggregated from
 *  external sources via API). If the role is unknown or has no
 *  default, defaultArenaFor() returns '' and the wizard leaves the
 *  picker blank for the user to choose.
 * ============================================================ */
export const DEFAULT_ARENA_BY_ACCOUNT = {
  individual: 'private',
  entrepreneur: 'solidarity',
  developer: 'arena',
};

export function defaultArenaFor(accountType) {
  return DEFAULT_ARENA_BY_ACCOUNT[accountType] || '';
}

/* True if the given account type is allowed to POST in this arena.
   Suppliers can't post anywhere (they don't see project creation
   in the UI). Public is system-locked — postableBy is empty, so
   nobody is eligible. */
export function canPostArena(arenaValue, accountType) {
  const a = ARENAS.find((x) => x.value === arenaValue);
  if (!a) return false;
  if (a.systemLocked) return false; // public — sourced via external API
  if (!accountType) return true; // loading — don't lock prematurely
  return a.postableBy.includes(accountType);
}

/* True if the account type can post in at least one (non-system-locked)
   arena. Drives whether to show "+ مشروع جديد" CTAs in the dashboard
   sidebar and home — engineering offices and suppliers have no
   posting privileges and shouldn't see these entry points. */
export function canPostAnyArena(accountType) {
  if (!accountType) return true; // loading — don't hide prematurely
  return ARENAS.some(
    (a) => !a.systemLocked && a.postableBy.includes(accountType)
  );
}

/* True if the given account type is allowed to VIEW this arena's feed.
   Drives the dashboard sidebar links and the /projects/:arena guards.

   Upgrade-gated arenas (isUpgrade — currently just إسناد) require the
   user to have paid for the upgrade in addition to having an eligible
   role. The flag is read from `user.has_isnad_upgrade` upstream and
   passed in here; missing/false hides the arena entirely. */
export function canViewArena(arenaValue, accountType, hasIsnadUpgrade = false) {
  const a = ARENAS.find((x) => x.value === arenaValue);
  if (!a) return false;
  if (a.isUpgrade && !hasIsnadUpgrade) return false;
  if (!accountType) return true; // loading — don't gate prematurely
  return (a.viewableBy || []).includes(accountType);
}

/* True if the given account type is allowed to APPLY (submit bids)
   on projects in this arena. Per FRONTEND_INTEGRATION.md §3 the rule
   is per-arena: solidarity is entrepreneur-only, isnad also lets
   developers bid, etc. Individuals and suppliers never apply.

   Project ownership still has to be checked separately — owners can't
   apply to their own projects regardless of arena. */
export function canApplyArena(arenaValue, accountType) {
  const a = ARENAS.find((x) => x.value === arenaValue);
  if (!a) return false;
  if (!accountType) return false; // unknown role — fail closed for apply
  return (a.applicableBy || []).includes(accountType);
}

/* True if the account type can apply in at least one arena. Drives
   broad pre-gates (e.g. the /projects/:id/apply route filter) before
   we know which arena the project sits in. */
export function canApplyAnyArena(accountType) {
  if (!accountType) return false;
  return ARENAS.some((a) => (a.applicableBy || []).includes(accountType));
}

/* True if this user is allowed to see the project's budget.
   ----------------------------------------------------------------
   Product rule (Adam, 2026-05-18): budget is sealed until accept.
   Only the project owner sees it during the bidding phase. After
   the owner accepts an application, the partner_id is set on the
   project and the chosen partner can ALSO see the budget.

   Everyone else (browsing users, applicants who haven't won yet,
   arena viewers in general) sees a "budget undisclosed" placeholder
   instead of the number.

   Note: this is FE-side hiding only — the BE currently returns the
   budget in API responses regardless of viewer. If true privacy is
   needed later, the BE has to redact too. */
export function canSeeProjectBudget(project, userId) {
  if (!project || !userId) return false;
  if (project.user_id === userId) return true; // owner
  if (project.partner_id && project.partner_id === userId) return true; // accepted partner
  return false;
}

/* Short reason string to show under a locked arena card. */
export function arenaLockReason(arenaValue, accountType) {
  const a = ARENAS.find((x) => x.value === arenaValue);
  if (!a) return '';
  if (a.isUpgrade) return a.lockReason; // إسناد — always "requires upgrade"
  if (a.systemLocked) return a.lockReason; // public — system-managed
  if (canPostArena(arenaValue, accountType)) return '';
  return a.lockReason || 'غير متاحة لنوع حسابك.';
}


/* ============================================================
   Project types — saved to `type` column */
export const PROJECT_TYPES = [
  'بناء جديد',
  'ترميم وتجديد',
  'تشطيب',
  'صيانة دورية',
  'توسعة',
  'تصميم داخلي',
  'مشروع تجاري',
  'مشروع سكني',
  'مجمع سكني',
  'مشروع صناعي',
  'بنية تحتية',
  'أخرى',
];

/* Expected duration — saved to `expected_duration` column (string) */
export const PROJECT_DURATIONS = [
  'أقل من شهر',
  '١-٣ أشهر',
  '٣-٦ أشهر',
  '٦-١٢ شهر',
  '١-٢ سنة',
  'أكثر من سنتين',
];

/* Experience levels — saved to `experience` column */
export const EXPERIENCE_LEVELS = [
  'مبتدئ — أقل من ٣ سنوات',
  'متوسط — ٣-٥ سنوات',
  'خبير — ٥-١٠ سنوات',
  'خبير متقدّم — أكثر من ١٠ سنوات',
];

/* ============================================================
   Project statuses — values stored in the `status` column.
   Mirrors the backend enum exactly (Taahud V5 API).
   ============================================================ */
export const PROJECT_STATUSES = {
  pending_review: {
    value: 'pending_review',
    label: 'قيد المراجعة',
    color: '#7a7a8c',
    bg: '#f4f1e9',
    border: '#e5e3dc',
  },
  open_for_bids: {
    value: 'open_for_bids',
    label: 'مفتوح للعروض',
    color: '#2c2f7c',
    bg: 'rgba(44,47,124,0.08)',
    border: 'rgba(44,47,124,0.2)',
  },
  awarded: {
    value: 'awarded',
    label: 'تم الترسية',
    color: '#0d5538',
    bg: 'rgba(19,109,74,0.10)',
    border: 'rgba(19,109,74,0.22)',
  },
  in_progress: {
    value: 'in_progress',
    label: 'قيد التنفيذ',
    color: '#136d4a',
    bg: 'rgba(19,109,74,0.08)',
    border: 'rgba(19,109,74,0.22)',
  },
  on_hold: {
    value: 'on_hold',
    label: 'متوقّف مؤقتاً',
    color: '#9c4221',
    bg: 'rgba(184,134,42,0.10)',
    border: 'rgba(184,134,42,0.22)',
  },
  completed: {
    value: 'completed',
    label: 'مكتمل',
    color: '#ffffff',
    bg: '#136d4a',
    border: '#136d4a',
  },
  cancelled: {
    value: 'cancelled',
    label: 'ملغي',
    color: '#b91c1c',
    bg: 'rgba(185,28,28,0.06)',
    border: 'rgba(185,28,28,0.18)',
  },
};

/* Filter tabs shown on the projects list page */
export const STATUS_FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'pending_review', label: 'قيد المراجعة' },
  { value: 'open_for_bids', label: 'مفتوح للعروض' },
  { value: 'awarded', label: 'تم الترسية' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'on_hold', label: 'متوقّف مؤقتاً' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
];

/* Wizard step definitions */
export const PROJECT_STEPS = [
  {
    id: 1,
    label: 'تفاصيل المشروع',
    description: 'المعلومات الأساسية عن مشروعك',
  },
  {
    id: 2,
    label: 'النطاق والميزانية',
    description: 'نطاق العمل والجدول الزمني والخبرة',
  },
  {
    id: 3,
    label: 'الملفات والمتطلبات',
    description: 'المستندات المرفقة والوثائق المطلوبة',
  },
  {
    id: 4,
    label: 'المراجعة والإرسال',
    description: 'تأكيد البيانات وإرسال المشروع',
  },
];
