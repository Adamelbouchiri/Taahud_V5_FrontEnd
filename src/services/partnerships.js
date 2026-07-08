import http from './http';

/* ============================================================
 *  PARTNERSHIPS SERVICE — wired to Taahud V5 API.
 *  ----------------------------------------------------------------
 *  The offer system used exclusively by Solidarity-arena projects.
 *  Unlike applications (bids), a partnership offer represents a
 *  partner joining the venture with one of five contribution types
 *  (funding / execution / land / expertise / development).
 *
 *  Endpoints (all under /api):
 *
 *    POST   /projects/:projectId/partnership-requests   submit an offer
 *    GET    /partnership-requests?status&project_id&...  list (paginated)
 *    GET    /partnership-requests/:id                    show one
 *    POST   /partnership-requests/:id/accept            owner accepts (NO cascade)
 *    POST   /partnership-requests/:id/reject            owner rejects
 *    DELETE /partnership-requests/:id                    partner withdraws (pending only)
 *
 *  Key differences from applications (see
 *  PARTNERSHIP_REQUESTS_INTEGRATION.md):
 *    - cover_letter  → message
 *    - bid_amount    → proposed_share (free-text string, optional)
 *    - delivery_date → (none)
 *    - adds offering_type / firm_name / capability_brief
 *    - NO CASCADE on accept: a project owner can accept multiple
 *      partners with different offering types simultaneously.
 *    - The partner can withdraw their own pending offer (soft-delete).
 *
 *  Authorization (BE enforces; FE pre-gates to avoid a 403):
 *    - Submit: project in solidarity arena, account_type is
 *      developer / entrepreneur / engineering, active solidarity_addon,
 *      not the owner, no existing offer on this project.
 *    - List / show: the partner who submitted OR the project owner.
 *    - Accept / reject: project owner only.
 *    - Withdraw: the partner only, while status is `pending`.
 *
 *  Backend wraps single resources in { data: {...} } and lists in
 *  { data: [...], links, meta }. We unwrap here so callers get the
 *  flat shape the UI expects.
 * ============================================================ */


/* ============================================================
 *  Adapter — bridge BE response shape to what FE components read.
 *  ----------------------------------------------------------------
 *  Derived fields:
 *    - user_id:     from partner.id (partner stays nested too)
 *    - project_id:  from project.id (when project is nested)
 *    - is_accepted: convenience flag for `status === 'accepted'`
 * ============================================================ */
function adaptOffer(o) {
  if (!o || typeof o !== 'object') return o;

  const out = { ...o };

  if (o.partner) out.user_id = o.partner.id;
  if (o.project && out.project_id == null) out.project_id = o.project.id;

  out.is_accepted = o.status === 'accepted';

  return out;
}


function buildParams(filters = {}) {
  const params = {};
  if (filters.project_id != null && filters.project_id !== 'all') {
    params.project_id = filters.project_id;
  }
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.per_page) params.per_page = filters.per_page;
  if (filters.page) params.page = filters.page;
  return params;
}


export const partnerships = {
  /* ============================================================
   * READ
   * ============================================================ */

  /**
   * GET /api/partnership-requests — offers the current user is
   * involved in (as partner or project owner). BE returns the union;
   * filter further with `project_id` / `status`. Returns a flat array
   * (drops pagination metadata).
   */
  async list(filters = {}) {
    const res = await http.get('/partnership-requests', {
      params: buildParams(filters),
    });
    const rows = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    return rows.map(adaptOffer);
  },

  /** GET /api/partnership-requests/:id */
  async get(id) {
    const res = await http.get(`/partnership-requests/${id}`);
    return adaptOffer(res?.data ?? res);
  },

  /**
   * Convenience wrapper: list offers received on a project I own.
   * Same endpoint as list() with project_id pinned — BE decides
   * visibility.
   */
  async listForProject(projectId, filters = {}) {
    return partnerships.list({ ...filters, project_id: projectId });
  },


  /* ============================================================
   * WRITE — partner
   * ============================================================ */

  /**
   * POST /api/projects/:projectId/partnership-requests
   *
   * BE requires:
   *   - offering_type    (one of funding/execution/land/expertise/development)
   *   - firm_name        (string, 2–255)
   *   - capability_brief (string, 10–5000)
   *   - message          (string, 10–5000)
   *   - proposed_share   (optional string, max 255)
   */
  async submit(projectId, payload) {
    const res = await http.post(
      `/projects/${projectId}/partnership-requests`,
      payload
    );
    return adaptOffer(res?.data ?? res);
  },

  /**
   * DELETE /api/partnership-requests/:id — the partner withdraws
   * their own pending offer (soft-delete). Only allowed while the
   * offer is still `pending`.
   */
  async withdraw(id) {
    return http.delete(`/partnership-requests/${id}`);
  },


  /* ============================================================
   * WRITE — project owner
   * ============================================================ */

  /**
   * POST /api/partnership-requests/:id/accept
   *
   * NO CASCADE: accepting one offer does NOT auto-reject the others.
   * The owner can accept multiple partners with different offering
   * types (1 funder + 1 executor + 1 land provider, all valid).
   */
  async accept(id) {
    const res = await http.post(`/partnership-requests/${id}/accept`);
    return adaptOffer(res?.data ?? res);
  },

  /** POST /api/partnership-requests/:id/reject */
  async reject(id) {
    const res = await http.post(`/partnership-requests/${id}/reject`);
    return adaptOffer(res?.data ?? res);
  },
};
