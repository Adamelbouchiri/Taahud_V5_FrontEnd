import http from './http';

/* ============================================================
 *  CONTACT SERVICE
 *  ----------------------------------------------------------------
 *  The contact form on the landing page.
 * ============================================================ */

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));


export const contact = {
  /**
   * POST /api/contact — send a contact-form submission
   * @param {{ name, email, subject?, message }} payload
   */
  async submit(payload) {
    // return http.post('/contact', payload);

    /* ── MOCK ── remove when backend is ready ───────────────── */
    await delay(700);
    return { sent: true };
  },
};
