import { UserRound, HardHat, Truck, Building2, Compass } from 'lucide-react';

/* Sales WhatsApp — used by the "الاشتراكات" nav link and the Plans
   "subscribe" CTA. Local number 0537372053 → international 966537372053
   (Saudi country code, leading zero dropped). */
export const SALES_WHATSAPP_URL = 'https://wa.me/966537372053';

/* Customer-facing contact channels. Imported by ContactUs, Footer,
   and anywhere else that needs to surface a "talk to us" link. */
export const SUPPORT_EMAIL = 'support@taahud.sa';
export const SALES_PHONE_E164 = '+966537372053';

/* Feature flag — when false, the post-register / post-login OTP step
   is bypassed entirely and the user goes straight to the dashboard.
   Re-enable once an SMS provider is wired up on the backend. */
export const OTP_ENABLED = true;

/* How long a freshly-issued OTP stays valid, in minutes. Mirrors the
   backend's TTL on /auth/otp/send so the UI can show a live "code
   expires in MM:SS" countdown that actually matches when /verify
   will start rejecting the code. */
export const OTP_EXPIRY_MINUTES = 10;

/* ============================================================
 *  ACCOUNT TYPES vs UI CATEGORIES
 *  ----------------------------------------------------------------
 *  This file separates two related but DIFFERENT concepts:
 *
 *  1. ACCOUNT_TYPES — the values stored in the database
 *     `account_type` column. There are FIVE of them:
 *
 *       individual          عميل
 *       entrepreneur        مقاول       (called "contractor" in English)
 *       engineering         مكتب هندسي
 *       supplier            مورّد
 *       developer           مطوّر عقاري
 *
 *  2. ACCOUNT_CATEGORIES — the four cards shown in the
 *     registration UI. "Service provider" is a UI grouping that
 *     contains TWO database account types (entrepreneur + engineering
 *     office), revealed via sub-role buttons after the user picks
 *     the "مقدم خدمة" card.
 *
 *  Helpers like `isServiceProvider(accountType)` make role checks
 *  read naturally without scattering OR conditions everywhere.
 * ============================================================ */


/* ============================================================
 *  Database `account_type` values — match the backend enum:
 *    individual, entrepreneur, engineering, supplier, developer
 * ============================================================ */
export const ACCOUNT_TYPE = {
  INDIVIDUAL: 'individual',
  ENTREPRENEUR: 'entrepreneur',
  ENGINEERING: 'engineering',
  SUPPLIER: 'supplier',
  DEVELOPER: 'developer',
};

/* Pretty labels for any account_type — useful in the user menu,
   profile page, applications list, etc. */
export const ACCOUNT_TYPE_LABELS = {
  individual: 'عميل',
  entrepreneur: 'مقاول',
  engineering: 'مكتب هندسي',
  supplier: 'مورّد',
  developer: 'مطور عقاري',
};


/* ============================================================
 *  UI categories — the four cards shown in registration.
 *  "service_provider" is NOT a database value — it's a UI
 *  grouping. Picking it reveals the sub-role buttons.
 * ============================================================ */
export const ACCOUNT_CATEGORIES = [
  {
    value: 'individual',
    label: 'عميل',
    desc: 'باحث عن خدمة أو مواد',
    icon: UserRound,
  },
  {
    value: 'service_provider', // UI-only grouping
    label: 'مقدم خدمة',
    desc: 'مقاول أو مكتب هندسي',
    icon: HardHat,
  },
  {
    value: 'supplier',
    label: 'مورّد',
    desc: 'مورّد منتجات ومواد',
    icon: Truck,
  },
  {
    value: 'developer',
    label: 'مطور عقاري',
    desc: 'مشاريع ومجمعات',
    icon: Building2,
  },
];


/* ============================================================
 *  Service provider sub-roles — shown as buttons when the
 *  category is "service_provider". Each role's `value` IS the
 *  database account_type.
 * ============================================================ */
export const SERVICE_PROVIDER_ROLES = [
  {
    value: 'entrepreneur', // saved to DB as account_type
    label: 'مقاول',
    desc: 'تنفيذ المشاريع والأعمال',
    icon: HardHat,
  },
  {
    value: 'engineering', // saved to DB as account_type
    label: 'مكتب هندسي',
    desc: 'تصميم واستشارات وإشراف',
    icon: Compass,
  },
];


/* ============================================================
 *  Specialty options — only for supplier and developer.
 *  individual / entrepreneur / engineering don't use this.
 * ============================================================ */
export const SUPPLIER_SPECIALTIES = [
  'مواد بناء',
  'مواد كهربائية',
  'سباكة وأدوات صحية',
  'دهانات',
  'أدوات ومعدات',
  'حديد وأسمنت',
  'أخشاب',
  'بلاط وسيراميك',
  'ألمنيوم وزجاج',
  'أنظمة تكييف',
];

export const DEVELOPER_SPECIALTIES = [
  'تطوير سكني',
  'تطوير تجاري',
  'تطوير مختلط الاستخدام',
  'مجمعات سكنية',
  'أبراج تجارية',
  'فلل ومنازل',
  'شقق ومجمعات',
  'تطوير صناعي',
];

export const CITIES = [
  // منطقة الرياض
  'الرياض', 'الخرج', 'الدوادمي', 'المجمعة', 'القويعية', 'وادي الدواسر',
  'الأفلاج', 'الزلفي', 'شقراء', 'حوطة بني تميم', 'عفيف', 'السليل',
  'ضرما', 'المزاحمية', 'رماح', 'ثادق', 'حريملاء', 'الحريق',
  'الغاط', 'مرات', 'الدلم',
  // منطقة مكة المكرمة
  'مكة المكرمة', 'جدة', 'الطائف', 'القنفذة', 'الليث', 'رابغ',
  'خليص', 'الخرمة', 'رنية', 'تربة', 'الجموم', 'الكامل',
  'بحرة', 'أضم', 'ميسان', 'العرضيات',
  // المنطقة الشرقية
  'الدمام', 'الخبر', 'الظهران', 'الأحساء', 'الجبيل', 'القطيف',
  'حفر الباطن', 'الخفجي', 'رأس تنورة', 'بقيق', 'النعيرية', 'قرية العليا',
  // منطقة المدينة المنورة
  'المدينة المنورة', 'ينبع', 'العلا', 'بدر', 'خيبر', 'الحناكية',
  'وادي الفرع',
  // منطقة القصيم
  'بريدة', 'عنيزة', 'الرس', 'المذنب', 'البكيرية', 'البدائع',
  'الأسياح', 'النبهانية', 'الشماسية', 'عيون الجواء', 'رياض الخبراء', 'عقلة الصقور',
  // منطقة عسير
  'أبها', 'خميس مشيط', 'بيشة', 'محايل عسير', 'أحد رفيدة', 'سراة عبيدة',
  'رجال ألمع', 'المجاردة', 'بلقرن', 'تثليث', 'ظهران الجنوب', 'النماص',
  'تنومة', 'بارق',
  // منطقة تبوك
  'تبوك', 'ضباء', 'الوجه', 'أملج', 'حقل', 'تيماء', 'البدع',
  // منطقة حائل
  'حائل', 'بقعاء', 'الغزالة', 'الشنان', 'سميراء', 'موقق', 'الحائط',
  // منطقة الحدود الشمالية
  'عرعر', 'رفحاء', 'طريف', 'العويقيلة',
  // منطقة جازان
  'جازان', 'صبيا', 'أبو عريش', 'صامطة', 'بيش', 'الدرب',
  'أحد المسارحة', 'العارضة', 'ضمد', 'الريث', 'فيفاء', 'فرسان',
  'الطوال', 'هروب',
  // منطقة نجران
  'نجران', 'شرورة', 'حبونا', 'بدر الجنوب', 'يدمة', 'ثار', 'خباش',
  // منطقة الباحة
  'الباحة', 'بلجرشي', 'المندق', 'المخواة', 'قلوة', 'العقيق',
  'القرى', 'بني حسن', 'الحجرة', 'غامد الزناد',
  // منطقة الجوف
  'سكاكا', 'القريات', 'دومة الجندل', 'طبرجل',
];


/* ============================================================
 *  Helpers
 *  ----------------------------------------------------------------
 *  These take a database `account_type` and return UI-relevant
 *  flags or strings. Use them everywhere in place of raw
 *  equality checks (=== 'entrepreneur') so the grouping logic
 *  stays in one place.
 * ============================================================ */

/* True for entrepreneur OR engineering — the two account
   types that bid on individual / developer projects. Use this in any check
   that previously read `account_type === 'service_provider'`. */
export function isServiceProvider(accountType) {
  return (
    accountType === 'entrepreneur' ||
    accountType === 'engineering'
  );
}

/* Pretty label for a stored account_type value. */
export function accountTypeLabel(accountType) {
  return ACCOUNT_TYPE_LABELS[accountType] || accountType || '';
}

/* True if this account_type uses the supplier/developer specialty
   dropdown. Service-provider roles do NOT — their "specialty" is
   the account_type itself (entrepreneur vs engineering). */
export function hasSpecialty(accountType) {
  return accountType === 'supplier' || accountType === 'developer';
}

export function getSpecialties(accountType) {
  if (accountType === 'supplier') return SUPPLIER_SPECIALTIES;
  if (accountType === 'developer') return DEVELOPER_SPECIALTIES;
  return [];
}

export function specialtyLabel(accountType) {
  if (accountType === 'supplier') return 'نوع المنتجات';
  if (accountType === 'developer') return 'نوع المشاريع';
  return 'التخصص';
}
