/* ============================================================
 *  Date formatting helpers.
 *  ----------------------------------------------------------------
 *  The API sends ISO-8601 timestamps (created_at, held_until, …).
 *  These render them in the active UI language.
 * ============================================================ */

const LOCALES = {
  ar: 'ar-SA',
  en: 'en-GB',
  zh: 'zh-CN',
  ur: 'ur-PK',
};

/**
 * Short calendar date in the active language — "22 Aug 2026".
 * Returns '' for null/undefined so callers can render conditionally
 * without a guard, and falls back to the raw string if the value
 * isn't a parseable date.
 *
 * @param {string|null|undefined} iso
 * @param {string} lang  active UI language ('ar' | 'en' | 'zh' | 'ur')
 */
export function formatDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString(LOCALES[lang] || LOCALES.en, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
