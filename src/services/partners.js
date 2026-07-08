import http from './http';

/* ============================================================
 *  PARTNERS SERVICE — the "Become a Partner" program.
 *  ----------------------------------------------------------------
 *  Businesses apply to become official Taahud partners; once an
 *  admin approves, a unique discount code (e.g. TAAHUD-VL7ESV) is
 *  minted that Taahud users redeem at the partner's establishment.
 *
 *  This is a SEPARATE domain from:
 *    - applications.js  (project bids)
 *    - partnerships.js  (solidarity-arena partnership offers)
 *  Don't confuse them. See partner_applications.md.
 *
 *  Endpoints used by the public page (all under /api):
 *    POST /partners/apply              submit an application (public)
 *    GET  /partners/validate/{code}    confirm a code is real & active
 *    GET  /partners                    directory of active partners
 *    GET  /partners/stats              header numbers + sector counts
 *
 *  The directory endpoints are public but OPTIONALLY authenticated:
 *  send the user's token (http auto-injects it) to receive each row's
 *  discount `code`. For a guest the `code` key is omitted entirely —
 *  `has_code` is still true, so the card shows a "get code" button that
 *  prompts login. See partner_applications.md §4.
 * ============================================================ */

export const partners = {
  /**
   * POST /api/partners/apply — public, no token required. If the
   * request DOES carry a valid token, the BE links the application
   * to that user automatically (don't send user_id — it's ignored).
   * Throttle: 20 req/min/IP (429 on excess).
   *
   * @param {{ company_name, sector, email, phone, offer? }} payload
   * @returns {Promise<{ id, status }>} the created row's id + status
   */
  async apply(payload) {
    const res = await http.post('/partners/apply', payload);
    return res?.data ?? res;
  },

  /**
   * GET /api/partners/validate/{code} — public, case-insensitive.
   * Returns { valid:true, partner_name, sector, expires_at } when the
   * code belongs to an approved, non-revoked, non-expired partner;
   * otherwise { valid:false } (identical for invalid/expired/revoked/
   * unknown, by design — codes can't be probed). Throttle 30/min/IP.
   *
   * @param {string} code
   * @returns {Promise<{ valid:boolean, partner_name?, sector?, expires_at? }>}
   */
  async validate(code) {
    return http.get(`/partners/validate/${encodeURIComponent(code)}`);
  },

  /**
   * GET /api/partners — the public directory of active partners
   * (approved, not revoked, not expired). Paginated ({ data, links,
   * meta }); we return just the normalized rows. Throttle 60/min/IP.
   *
   * Query params (all optional):
   *   sector    exact match — drives the sector tabs
   *   q         partial match on company_name OR offer
   *   per_page  page size (BE default 12). The page renders a single
   *             grid with no pager, so we ask for a generous page.
   *
   * Each row is normalized to { id, company_name, sector, offer,
   * has_code, code }. `code` is null for guests (key omitted by the
   * BE); render the "get code" button whenever `has_code` is true.
   *
   * @param {{ sector?, q?, per_page? }} params
   * @returns {Promise<Array<{ id, company_name, sector, offer, has_code, code }>>}
   */
  async listApproved({ per_page = 60, ...params } = {}) {
    const res = await http.get('/partners', {
      params: { per_page, ...params },
    });
    const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return rows.map((r) => ({
      id: r.id,
      company_name: r.company_name ?? '',
      sector: r.sector ?? '',
      offer: r.offer ?? '',
      has_code: r.has_code ?? false,
      // Present only for authenticated requests; guests get null.
      code: r.code ?? null,
    }));
  },

  /**
   * GET /api/partners/stats — public. Drives the hero numbers and the
   * per-sector counts. Throttle 60/min/IP.
   *
   * @returns {Promise<{ partner_count, sector_count, sectors: Array<{ sector, count }> }>}
   */
  async stats() {
    const res = await http.get('/partners/stats');
    return {
      partner_count: res?.partner_count ?? 0,
      sector_count: res?.sector_count ?? 0,
      sectors: Array.isArray(res?.sectors) ? res.sectors : [],
    };
  },
};
