/* ============================================================
 *  LEGAL CONTENT INDEX
 *  ----------------------------------------------------------------
 *  Resolves a (lang, page) pair to a content block. Falls back to
 *  Arabic when the requested language is missing — Arabic is the
 *  canonical version and is always complete.
 *
 *    getLegalContent('en').terms      → { title, sections, ... }
 *    getLegalContent('ar').privacy    → { ... }
 *
 *  Page keys: 'terms' | 'privacy' | 'refund' | 'cookies'
 * ============================================================ */

import ar from './ar';
import en from './en';
import zh from './zh';

const CONTENT = { ar, en, zh };

export function getLegalContent(lang) {
  return CONTENT[lang] || CONTENT.ar;
}

export const CANONICAL_LANG = 'ar';
