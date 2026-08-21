import http, { resolveFileUrl } from './http';

/* ============================================================
 *  APPLICATIONS SERVICE — wired to Taahud V5 API.
 *  ----------------------------------------------------------------
 *  Endpoints (all under /api):
 *
 *    POST   /projects/:projectId/applications     submit a bid
 *    GET    /applications?project_id&status&...   list (paginated)
 *    GET    /applications/:id                     show one
 *    POST   /applications/:id/accept              owner accepts (cascades)
 *    POST   /applications/:id/reject              owner rejects
 *    POST   /applications/:id/files               applicant uploads a file
 *    DELETE /applications/:id/files/:fileId       applicant deletes a file
 *
 *  Backend wraps single resources in { data: {...} } and lists in
 *  { data: [...], links, meta }. We unwrap here so callers get the
 *  flat shape the UI already expects.
 *
 *  Authorization (FRONTEND_INTEGRATION.md §3, §11):
 *    - Submit:        per-arena applicants matrix —
 *                       private:    entrepreneur, engineering
 *                       solidarity: entrepreneur only
 *                       arena:      entrepreneur, engineering
 *                       isnad:      entrepreneur, engineering, developer
 *                     Individuals and suppliers can never apply.
 *                     Project must be `open_for_bids`. Owner cannot
 *                     apply to own project. One application per user
 *                     per project (DB-unique). No withdrawal.
 *                     FE gates: RequireServiceProvider (broad
 *                     pre-gate), then ApplyPage refines with
 *                     canApplyArena(project.arena, account_type).
 *    - List / show:   BE enforces — applicant of that row, project
 *                     owner, or project partner.
 *    - Accept/Reject: project owner only, pending applications only.
 *                     Accept cascades atomically: app → accepted,
 *                     project.partner_id → applicant, project.status
 *                     → awarded, sibling pendings → rejected, and
 *                     project.budget → the accepted bid_amount (the
 *                     owner's estimate is snapshotted to
 *                     project.original_budget).
 *    - File ops:      applicant only, pending applications only.
 *                     Max 20 MB; PDF/JPG/JPEG/PNG/DOC/DOCX/XLS/XLSX.
 * ============================================================ */


/* ============================================================
 *  Adapter — bridge BE response shape to what FE components read.
 *  ----------------------------------------------------------------
 *  Derived fields:
 *    - user_id:    from applicant.id (applicant stays nested too)
 *    - project_id: from project.id (when project is nested)
 *    - is_accepted: convenience flag for `status === 'accepted'`
 *    - files[]:    alias .url → .file_path so legacy renderers work
 * ============================================================ */
function adaptApplication(a) {
  if (!a || typeof a !== 'object') return a;

  const out = { ...a };

  if (a.applicant) out.user_id = a.applicant.id;
  if (a.project && out.project_id == null) out.project_id = a.project.id;

  out.is_accepted = a.status === 'accepted';

  if (Array.isArray(a.files)) {
    out.files = a.files.map((f) => {
      const url = resolveFileUrl(f.url ?? f.file_path);
      return { ...f, url, file_path: url };
    });
  }

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


export const applications = {
  /* ============================================================
   * READ
   * ============================================================ */

  /**
   * GET /api/applications — applications the current user is
   * involved in (as applicant or project owner). BE returns the
   * union; filter further with `project_id` / `status`.
   * Returns a flat array (drops pagination metadata).
   */
  async list(filters = {}) {
    const res = await http.get('/applications', { params: buildParams(filters) });
    const rows = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    return rows.map(adaptApplication);
  },

  /** GET /api/applications/:id */
  async get(id) {
    const res = await http.get(`/applications/${id}`);
    return adaptApplication(res?.data ?? res);
  },

  /**
   * Convenience wrapper: list applications received on a project
   * I own. Same endpoint as list() with project_id pinned — BE
   * decides visibility.
   */
  async listForProject(projectId, filters = {}) {
    return applications.list({ ...filters, project_id: projectId });
  },


  /* ============================================================
   * WRITE — applicant
   * ============================================================ */

  /**
   * POST /api/projects/:projectId/applications
   *
   * BE requires:
   *   - cover_letter (string, 20–5000)
   *   - bid_amount   (non-negative number)
   *   - delivery_date (Y-m-d, in the future)
   */
  async submit(projectId, payload) {
    const res = await http.post(`/projects/${projectId}/applications`, payload);
    return adaptApplication(res?.data ?? res);
  },


  /* ============================================================
   * WRITE — project owner
   * ============================================================ */

  /**
   * POST /api/applications/:id/accept
   *
   * Cascading effect on the server (transactional):
   *   - project.original_budget → snapshot of the CURRENT project.budget
   *   - project.budget          → this application's bid_amount
   *   - this application → 'accepted'
   *   - project.partner_id → this applicant
   *   - project.status     → 'awarded'
   *   - all sibling pending applications → 'rejected'
   *
   * NOTE the budget swap: after accept, `project.budget` is the ACCEPTED
   * PRICE, not the owner's estimate — the estimate moves to
   * `original_budget`. Everything downstream (milestones, escrow) reads
   * budget, so it has to hold the real agreement. An admin override of
   * the accept restores the snapshot and clears it back to null.
   * See PROJECT_BUDGET_CHANGES_INTEGRATION.md.
   *
   * The nested `project` on the response is NOT run through
   * adaptProject, so it carries the raw `original_budget` string with no
   * `_num` twin. Refetch via projects.get() if you need the parsed view.
   */
  async accept(applicationId) {
    const res = await http.post(`/applications/${applicationId}/accept`);
    return adaptApplication(res?.data ?? res);
  },

  /**
   * POST /api/applications/:id/reject
   * Flips status only — no cascade.
   */
  async reject(applicationId) {
    const res = await http.post(`/applications/${applicationId}/reject`);
    return adaptApplication(res?.data ?? res);
  },


  /* ============================================================
   * FILES — applicant only, pending applications only
   * ============================================================ */

  /**
   * POST /api/applications/:applicationId/files
   * Multipart upload. onProgress receives 0..100.
   */
  async uploadFile(applicationId, file, onProgress) {
    const form = new FormData();
    form.append('file', file);

    const res = await http.post(`/applications/${applicationId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });

    const f = res?.data ?? res;
    const url = resolveFileUrl(f.url ?? f.file_path);
    return { ...f, url, file_path: url };
  },

  /** DELETE /api/applications/:applicationId/files/:fileId */
  async removeFile(applicationId, fileId) {
    return http.delete(`/applications/${applicationId}/files/${fileId}`);
  },
};
