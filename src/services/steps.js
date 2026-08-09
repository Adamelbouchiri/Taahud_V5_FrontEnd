import http from './http';

/* ============================================================
 *  PROJECT STEPS (MILESTONES) SERVICE — wired to Taahud V5 API.
 *  ----------------------------------------------------------------
 *  Milestone-based execution (see PROJECT_STEPS_FRONTEND.md):
 *  the project PROVIDER (project.partner_id) breaks the work into
 *  amount-weighted steps, marks each finished; the project OWNER
 *  (project.user_id) reviews each one (pleased / not_pleased).
 *  Approved steps drive project.progress. Each step is also the unit
 *  the OWNER pays for — see startPayment() and the wallet service.
 *
 *  Endpoints (all under /api, JSON-API-style { data } envelopes):
 *
 *    GET   /projects/:project/steps                list steps (owner|provider)
 *    POST  /projects/:project/steps                define/replace the plan (provider)
 *    POST  /projects/:project/steps/:step/submit   provider: pending → submitted
 *    POST  /projects/:project/steps/:step/review   owner: pleased | not_pleased
 *    POST  /projects/:project/steps/:step/pay      owner: open a server-built
 *                                                  Moyasar checkout session
 *
 *  Auth: same stack as projects — bearer token + not-suspended +
 *  active subscription + verified phone. Steps exist only after a
 *  project is awarded (partner_id set).
 *
 *  State machine (each action legal only from a specific status —
 *  the API returns 422 otherwise):
 *
 *      pending ──submit(provider)──▶ submitted ──review:pleased(owner)──▶ approved
 *         ▲                              │
 *         └──────review:not_pleased──────┘   (note required, step reopens)
 *
 *  Money note: `amount` is a decimal STRING ("30000.00"), same as
 *  project.budget — parseFloat() before any math or comparison.
 *  The plan's amounts must sum EXACTLY to project.budget or the
 *  save returns 422 (errors.steps).
 *
 *  Wallet note: the amounts on THIS side are decimal SAR; the
 *  wallet/withdrawal side is integer halalas. That conversion is the
 *  BACKEND's job for step payments — see startPayment() below.
 * ============================================================ */


/* ============================================================
 *  Adapter — normalize a step resource.
 *  ----------------------------------------------------------------
 *  Keeps the raw string `amount` (decimal cast) but adds a parsed
 *  `amount_num` so components can render/compare without repeating
 *  parseFloat. `paid_at` is stamped once the owner's payment for the
 *  step is confirmed, and is what the UI keys "paid" off.
 * ============================================================ */
function adaptStep(s) {
  if (!s || typeof s !== 'object') return s;
  const amount_num = Number.parseFloat(s.amount);
  return {
    ...s,
    amount_num: Number.isNaN(amount_num) ? 0 : amount_num,
  };
}

function unwrapList(res) {
  const rows = Array.isArray(res?.data) ? res.data : res?.data?.data ?? res;
  return Array.isArray(rows) ? rows.map(adaptStep) : [];
}


export const steps = {
  /* ============================================================
   * READ
   * ============================================================ */

  /**
   * GET /api/projects/:projectId/steps
   * Owner or provider. Returns steps in `sequence` order, each with
   * its `latest_review` (and reviewer) eager-loaded. Flat array.
   */
  async list(projectId) {
    const res = await http.get(`/projects/${projectId}/steps`);
    return unwrapList(res);
  },


  /* ============================================================
   * WRITE — provider (project.partner_id)
   * ============================================================ */

  /**
   * POST /api/projects/:projectId/steps
   * Provider only. Sends the ENTIRE plan every time — it replaces the
   * previous one. Only allowed while every step is still `pending`;
   * once any step is submitted the plan locks (422).
   *
   * `plan` is an array of { title, amount, sequence? }. `sequence`
   * defaults to array order. Amounts must sum exactly to the project
   * budget (validated server-side → 422 errors.steps).
   *
   * Returns the freshly-created plan (array of steps).
   */
  async savePlan(projectId, plan) {
    const payload = {
      steps: (plan || []).map((s, i) => ({
        title: s.title,
        // Send a number so the sum-vs-budget check compares cleanly.
        amount: Number.parseFloat(s.amount),
        sequence: s.sequence ?? i + 1,
      })),
    };
    const res = await http.post(`/projects/${projectId}/steps`, payload);
    return unwrapList(res);
  },

  /**
   * POST /api/projects/:projectId/steps/:stepId/submit
   * Provider only, no body. `pending → submitted`. Legal only from
   * `pending` (422 otherwise).
   */
  async submit(projectId, stepId) {
    const res = await http.post(
      `/projects/${projectId}/steps/${stepId}/submit`
    );
    return adaptStep(res?.data ?? res);
  },


  /* ============================================================
   * WRITE — owner (project.user_id)
   * ============================================================ */

  /**
   * POST /api/projects/:projectId/steps/:stepId/review
   * Owner only. `verdict` is 'pleased' | 'not_pleased'.
   *   - pleased      → submitted → approved (counts toward progress)
   *   - not_pleased  → submitted → pending  (NOTE REQUIRED, step reopens)
   * `note` max 2000 chars; required when not_pleased (422 errors.note).
   */
  async review(projectId, stepId, { verdict, note } = {}) {
    const body = { verdict };
    if (note != null && note !== '') body.note = note;
    const res = await http.post(
      `/projects/${projectId}/steps/${stepId}/review`,
      body
    );
    return adaptStep(res?.data ?? res);
  },

  /**
   * POST /api/projects/:projectId/steps/:stepId/pay
   * Owner only, NO BODY. Returns { checkout_url, session_id }.
   *
   * Server-driven, exactly like subscription checkout: the backend
   * computes the amount from the step, stamps metadata.step_id, and
   * hands back a URL to our existing /pay/:sessionId page. Redirect
   * the browser there — that's the whole frontend job.
   *
   * We deliberately send NOTHING. The amount lives server-side, so a
   * stale or tampered client can't cause a capture that then fails
   * verification (which used to mean a real charge needing a manual
   * refund).
   *
   * Crediting happens in the Moyasar → server callback, with a webhook
   * backstop, so closing the browser after paying no longer loses the
   * payment. The frontend never confirms anything; it just reads
   * ?paid=<stepId> / ?cancelled=<stepId> when the server sends the
   * owner back to the steps page.
   *
   * 403 if the caller isn't the project owner; 422 if already paid.
   */
  async startPayment(projectId, stepId) {
    const res = await http.post(`/projects/${projectId}/steps/${stepId}/pay`);
    const body = res?.data ?? res;
    return {
      checkout_url: body?.checkout_url || '',
      session_id: body?.session_id || '',
    };
  },
};
