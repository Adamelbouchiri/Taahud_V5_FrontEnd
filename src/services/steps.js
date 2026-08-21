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
 *    POST  /projects/:project/steps/propose        provider: add a step to a live
 *                                                  project (→ status `proposed`)
 *    POST  /projects/:project/steps/:step/approve-proposal   owner: accept it
 *    POST  /projects/:project/steps/:step/reject-proposal    owner: discard it
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
 *  `proposed` sits OUTSIDE that machine (see PROPOSED_STEPS_FRONTEND.md):
 *  a step the provider adds after the plan is live, waiting for the owner.
 *
 *      proposed ──approve-proposal(owner)──▶ pending  (+budget if amount > 0)
 *               ──reject-proposal(owner)───▶ discarded (soft-deleted)
 *
 *  A proposed step is not in the plan: it doesn't count toward the budget
 *  or progress, can't be submitted, and can't be paid (422).
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
   * POST /api/projects/:projectId/steps/propose
   * Provider only. Adds ONE step to a project whose plan is already live,
   * outside the sum-equals-budget rule: it lands as `proposed` and the
   * budget only moves if/when the owner approves it.
   *
   * `amount` is decimal SAR like the rest of the plan (NOT halalas) and
   * min 0 — a 0 step is a legitimate free clarification / sub-task, which
   * is why this is a different endpoint from savePlan (that one demands
   * min 0.01 per step).
   *
   * 403 if the caller isn't the provider.
   */
  async propose(projectId, { title, amount } = {}) {
    const res = await http.post(`/projects/${projectId}/steps/propose`, {
      title,
      amount: Number.parseFloat(amount) || 0,
    });
    return adaptStep(res?.data ?? res);
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

  /**
   * POST /api/projects/:projectId/steps/:stepId/approve-proposal
   * Owner only, no body. `proposed → pending` (a normal plan step), and if
   * the amount > 0 the PROJECT BUDGET GROWS by it server-side. Callers must
   * re-read the project afterwards — anything showing the budget or a
   * paid-vs-budget bar is stale the moment this resolves.
   *
   * 403 if not the owner; 422 if the step isn't `proposed`.
   */
  async approveProposal(projectId, stepId) {
    const res = await http.post(
      `/projects/${projectId}/steps/${stepId}/approve-proposal`
    );
    return adaptStep(res?.data ?? res);
  },

  /**
   * POST /api/projects/:projectId/steps/:stepId/reject-proposal
   * Owner only, no body. The proposal is discarded (soft-deleted server-side
   * for audit) and the budget is untouched — the frontend just drops it from
   * view. Returns { message }, not a step.
   *
   * 403 if not the owner; 422 if the step isn't `proposed`.
   */
  async rejectProposal(projectId, stepId) {
    const res = await http.post(
      `/projects/${projectId}/steps/${stepId}/reject-proposal`
    );
    return res?.data ?? res;
  },
};
