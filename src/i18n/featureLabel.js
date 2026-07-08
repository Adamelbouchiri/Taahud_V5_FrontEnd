/* ============================================================
 *  featureLabel — resolve a display label for a feature family.
 *  ----------------------------------------------------------------
 *  The backend sends label_ar / label_en on the features snapshot and
 *  the /check response — but ONLY label_ar on a 403, and for features
 *  the user doesn't have it sends the RAW family code as the label
 *  (e.g. "submit_offers"). It also has no zh / ur labels at all.
 *
 *  So we resolve the label ourselves, always in the active language:
 *    1. Use the backend label for the active language IF it's a real
 *       string (not the raw code) — keeps specifics like "30 / month".
 *    2. Otherwise use our own localized family label (features.families.*).
 *    3. Last resort: prettify the code ("submit_offers" → "Submit offers").
 *
 *  Usage (inside a component with useTranslation):
 *    const { t, lang } = useTranslation();
 *    featureLabel({ code, label_ar, label_en }, lang, t)
 * ============================================================ */
export function featureLabel(entry, lang, t) {
  const code = entry?.code || '';

  // 1. Backend label for the active language (ar/en only — no zh/ur).
  const beLabel = lang === 'ar' ? entry?.label_ar : lang === 'en' ? entry?.label_en : null;
  if (beLabel && beLabel !== code) return beLabel;

  // 2. Our own localized family label. t() returns the key itself on a
  //    total miss (after the Arabic fallback), so detect that.
  if (code) {
    const key = `features.families.${code}`;
    const fe = t(key);
    if (fe && fe !== key) return fe;
  }

  // 3. Prettify the raw code.
  return prettify(code);
}

function prettify(code) {
  if (!code) return '';
  return String(code)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
