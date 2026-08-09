/* ============================================================
 *  MONEY — halalas ⇄ SAR + locale-aware formatting
 *  ----------------------------------------------------------------
 *  The API speaks TWO money dialects and mixing them up silently
 *  moves the decimal point by two places:
 *
 *    - Wallet / withdrawals / Moyasar : integer HALALAS (1 SAR = 100)
 *    - project.budget / step.amount   : decimal SAR strings ("100000.00")
 *
 *  Convert at the boundary — never inside a component's render.
 * ============================================================ */

/** Decimal SAR (number or "100000.00") → integer halalas. */
export function toHalalas(sar) {
  const n = typeof sar === 'string' ? Number.parseFloat(sar) : sar;
  if (n == null || Number.isNaN(n)) return 0;
  // Round rather than truncate: 0.1 * 100 is 10.000000000000002 in
  // float, and Math.trunc would bill a halala short on some amounts.
  return Math.round(n * 100);
}

/** Integer halalas → decimal SAR (a Number, not a string). */
export function fromHalalas(halalas) {
  const n = typeof halalas === 'string' ? Number.parseInt(halalas, 10) : halalas;
  if (n == null || Number.isNaN(n)) return 0;
  return n / 100;
}

export function localeFor(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'ur') return 'ur-PK';
  return 'ar-SA';
}

/** Group-separated number in the active locale. */
export function formatNumber(n, lang, maximumFractionDigits = 2) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (num == null || Number.isNaN(num)) return String(n ?? '');
  try {
    return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits }).format(num);
  } catch {
    return String(num);
  }
}

/** SAR amount + the localized currency suffix. `t` supplies common.currency. */
export function formatSar(sar, lang, t) {
  return `${formatNumber(sar, lang)} ${t('common.currency')}`;
}

/** Halalas straight to a display string — the wallet's default. */
export function formatHalalas(halalas, lang, t) {
  return formatSar(fromHalalas(halalas), lang, t);
}
