import {
  Calculator,
  Scale,
  Code2,
  Megaphone,
  UtensilsCrossed,
  Truck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

/* ============================================================
 *  PARTNER SECTORS — the taxonomy for the "Become a Partner" program.
 *  ----------------------------------------------------------------
 *  Shared by the public /partners page (filter pills + apply-form
 *  dropdown) and the admin console (sector filter + edit dropdown).
 *
 *  Each sector carries:
 *    - key        stable id used for i18n (partners.sectors.<key>)
 *                 and client-side filtering
 *    - canonical  the Arabic label submitted to / stored by the API
 *                 as the free-string `sector` value, regardless of
 *                 the UI language
 *    - icon       lucide icon for the pill / card
 *    - accent     accent color
 * ============================================================ */
export const PARTNER_SECTORS = [
  { key: 'finance',     canonical: 'محاسبة ومالية',  icon: Calculator,      accent: '#2c2f7c' },
  { key: 'legal',       canonical: 'خدمات قانونية',   icon: Scale,           accent: '#3a3d99' },
  { key: 'tech',        canonical: 'تقنية وبرمجيات',  icon: Code2,           accent: '#136d4a' },
  { key: 'marketing',   canonical: 'تسويق وإعلان',    icon: Megaphone,       accent: '#b8862a' },
  { key: 'hospitality', canonical: 'مطاعم وضيافة',    icon: UtensilsCrossed, accent: '#c2410c' },
  { key: 'logistics',   canonical: 'لوجستيات وشحن',   icon: Truck,           accent: '#0e7490' },
  { key: 'insurance',   canonical: 'تأمين',           icon: ShieldCheck,     accent: '#7c3aed' },
  { key: 'training',    canonical: 'تدريب وتطوير',    icon: GraduationCap,   accent: '#be185d' },
];

// Look up a sector descriptor by its stable key OR by the canonical
// Arabic label stored on a partner row (so cards/pills can resolve an
// icon + accent from whatever the API returns).
export function sectorFor(value) {
  if (!value) return null;
  return (
    PARTNER_SECTORS.find((s) => s.key === value) ||
    PARTNER_SECTORS.find((s) => s.canonical === value) ||
    null
  );
}
