import http from './http';

/* ============================================================
 *  WALLET / WITHDRAWALS SERVICE — wired to Taahud V5 API.
 *  ----------------------------------------------------------------
 *  The provider side of the escrow flow (see WALLET_PAYMENTS_FRONTEND.md):
 *
 *    owner pays a step (Moyasar.js) ──► provider wallet CREDIT (held)
 *    owner marks the step "pleased"  ──► held becomes AVAILABLE
 *    provider requests a withdrawal  ──► wallet DEBITED, status pending
 *    admin approves                  ──► status approved (payout off-platform)
 *    admin rejects                   ──► amount credited back, status rejected
 *
 *  MONEY UNIT: every amount here is an INTEGER IN HALALAS
 *  (1 SAR = 100 halalas). This is NOT the same as step.amount /
 *  project.budget, which are decimal SAR strings. Use
 *  utils/money.js → toHalalas() / fromHalalas() at the boundary.
 *
 *  Endpoints:
 *    GET  /wallet                balances (halalas) + frozen flag
 *    GET  /wallet/withdrawals    own withdrawals, newest first, paginated
 *    POST /wallet/withdrawals    request one (debits immediately)
 * ============================================================ */


/* ---------- helpers ---------- */

function unwrapPage(res) {
  // Laravel resource collections: { data: [...], meta, links }.
  if (Array.isArray(res?.data)) {
    return { data: res.data, meta: res.meta || null, links: res.links || null };
  }
  if (Array.isArray(res)) return { data: res, meta: null, links: null };
  return { data: [], meta: null, links: null };
}

function unwrap(res) {
  return res?.data ?? res;
}

/** IBAN accepted by the BE: `SA` + 22 digits, no spaces. */
export const IBAN_PATTERN = /^SA\d{22}$/;

/** stc pay mobile accepted by the BE: `+9665` + 8 digits. */
export const STC_MOBILE_PATTERN = /^\+9665\d{8}$/;

/** Smallest withdrawal the BE accepts: 100 halalas = 1.00 SAR. */
export const MIN_WITHDRAWAL_HALALAS = 100;


export const wallet = {
  /* ============================================================
   * READ
   * ============================================================ */

  /**
   * GET /api/wallet/withdrawals
   * The authenticated provider's own withdrawals, newest first.
   * Returns { data, meta, links } so the caller can page.
   */
  async withdrawals({ page, per_page } = {}) {
    const params = {};
    if (page) params.page = page;
    if (per_page) params.per_page = per_page;
    return unwrapPage(await http.get('/wallet/withdrawals', { params }));
  },

  /**
   * GET /api/wallet — the caller's own balances, in HALALAS.
   *
   * Always resolves to a usable wallet: a user who has never been paid
   * has no wallet row, and the BE creates one lazily and returns zeros
   * rather than 404. So there is no "wallet not found" state to render.
   *
   *   total     = held + available (the headline earnings figure)
   *   available = withdrawable right now — caps the withdrawal form
   *   held      = owner paid, step not approved yet ("pending release")
   *   is_frozen = admin froze it; withdrawals are blocked
   *
   * Returns null only if the response isn't shaped like a wallet, so a
   * caller can distinguish "no data" from a genuine zero balance.
   */
  async balance() {
    const res = unwrap(await http.get('/wallet'));
    if (!res || typeof res !== 'object') return null;
    return {
      total: res.balance ?? 0,
      available: res.available_balance ?? 0,
      held: res.held_balance ?? 0,
      currency: res.currency || 'SAR',
      is_frozen: !!res.is_frozen,
    };
  },


  /* ============================================================
   * WRITE
   * ============================================================ */

  /**
   * POST /api/wallet/withdrawals
   *
   * `amount` is in HALALAS (min 100). `payout_method` is
   * 'bank_transfer' (needs iban + holder_name) or 'stc_pay' (needs
   * mobile). Only the fields for the chosen method are sent — the BE
   * snapshots exactly those into payout_details.
   *
   * The money is debited IMMEDIATELY; the row starts as `pending`.
   * 422 if the amount exceeds the available balance, the wallet is
   * frozen, or a format check fails (bad IBAN / mobile).
   */
  async requestWithdrawal({ amount, payout_method, iban, holder_name, mobile }) {
    const body = { amount, payout_method };
    if (payout_method === 'bank_transfer') {
      body.iban = iban;
      body.holder_name = holder_name;
    } else if (payout_method === 'stc_pay') {
      body.mobile = mobile;
    }
    return unwrap(await http.post('/wallet/withdrawals', body));
  },
};

export default wallet;
