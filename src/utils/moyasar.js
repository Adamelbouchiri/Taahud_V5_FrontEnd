/* ============================================================
 *  MOYASAR.JS LOADER
 *  ----------------------------------------------------------------
 *  Moyasar has no hosted checkout — the card form is rendered by
 *  their CDN script inside our own /pay/:sessionId page, which serves
 *  BOTH subscription checkout and project-step escrow payments (the
 *  backend decides which by what it puts in the session).
 *
 *  The loader lives here so the CDN version is pinned in ONE place.
 *  Loading twice is a no-op: the script tag is reused and
 *  `window.Moyasar` short-circuits (its one-shot `load` event won't
 *  fire again for a new listener).
 *
 *  CDN version: 1.19.0 is the latest Moyasar.js at time of writing
 *  (confirmed against cdn.moyasar.com — bump if a newer one ships).
 * ============================================================ */

export const MOYASAR_VERSION = '1.19.0';
export const MOYASAR_CSS = `https://cdn.moyasar.com/mpf/${MOYASAR_VERSION}/moyasar.css`;
export const MOYASAR_JS = `https://cdn.moyasar.com/mpf/${MOYASAR_VERSION}/moyasar.js`;

export function loadCss(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    // A failed stylesheet shouldn't block the (functional) form.
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    // If Moyasar.js already initialised globally, we're done — this also
    // covers the case where the <script> finished loading on a previous
    // visit (its one-shot `load` event won't fire again for a new listener).
    if (window.Moyasar) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true' || window.Moyasar) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Moyasar.js')),
      );
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Moyasar.js'));
    document.body.appendChild(s);
  });
}

/**
 * Load the CSS + JS and resolve with `window.Moyasar`.
 * Throws if the script loaded but didn't expose the global.
 */
export async function loadMoyasar() {
  await loadCss(MOYASAR_CSS);
  await loadScript(MOYASAR_JS);
  if (!window.Moyasar) throw new Error('Moyasar.js unavailable');
  return window.Moyasar;
}

/* NOTE: there is deliberately no publishable-key helper here. Every
 * payment is created by the backend, which returns its own key in the
 * session config — one source of truth, nothing to rotate in the
 * frontend build. */
