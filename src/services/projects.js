import http, { resolveFileUrl } from './http';

/* ============================================================
 *  PROJECTS SERVICE — wired to Taahud V5 API.
 *  ----------------------------------------------------------------
 *  Endpoints (all under /api):
 *
 *    GET    /projects                list (paginated, visibility-filtered)
 *    POST   /projects                create
 *    GET    /projects/:id            show
 *    PATCH  /projects/:id            update (owner-only)
 *    DELETE /projects/:id            soft-delete (owner-only)
 *    POST   /projects/:id/restore    restore archived
 *    POST   /projects/:id/files      upload file (multipart, max 10 MB)
 *    DELETE /projects/:id/files/:fid delete file
 *
 *  List-endpoint visibility (FRONTEND_INTEGRATION.md §10):
 *    The BE applies different rules per the user's relationship to
 *    each project:
 *      - Owner   → sees all statuses
 *      - Partner → sees all statuses
 *      - Third-party browser → ONLY status `open_for_bids`
 *    So a `pending_review`/`awarded`/`in_progress`/`completed` project
 *    is invisible to arena viewers — only the owner and partner see
 *    them. The FE never needs to filter by status client-side for
 *    visibility; the BE returns exactly what the user is allowed to
 *    see. The `mine=1` query flag narrows the response further to
 *    only-owned projects.
 *
 *  Backend wraps single resources in { data: {...} } and lists in
 *  { data: [...], links, meta }. We unwrap here so callers get the
 *  flat shape they already expect.
 *
 *  Backend shape vs frontend shape:
 *    - BE returns nested `owner` and `partner` objects.
 *    - FE used to read `user_id`, `partner_id`, `is_accepted`.
 *    - adaptProject() below derives those so existing components
 *      don't need to change.
 * ============================================================ */


/* ============================================================
 *  Adapter — bridge BE response shape to what FE components read.
 *  ----------------------------------------------------------------
 *  Derived fields:
 *    - user_id:      from owner.id (owner stays nested too)
 *    - partner_id:   from partner?.id
 *    - is_accepted:  true once a partner is assigned
 *    - original_budget_num: parsed budget-on-accept snapshot (or null)
 *    - requirements: flatten [{id, requirement}] → string[]
 *    - files[]:      alias .url → .file_path so existing FE renders work
 * ============================================================ */
function adaptProject(p) {
  if (!p || typeof p !== 'object') return p;

  const out = { ...p };

  if (p.owner) out.user_id = p.owner.id;
  out.partner_id = p.partner?.id ?? null;
  out.is_accepted = !!p.partner;

  /* Budget-on-accept snapshot. Accepting a bid overwrites `budget` with
     the accepted bid_amount and parks the owner's estimate here; an admin
     override restores it and clears this back to null. So null means
     "no active acceptance" — NOT "no budget". */
  out.original_budget_num =
    p.original_budget != null && Number.isFinite(Number(p.original_budget))
      ? Number(p.original_budget)
      : null;

  if (Array.isArray(p.requirements)) {
    out.requirements = p.requirements.map((r) =>
      typeof r === 'string' ? r : r.requirement
    );
  }

  if (Array.isArray(p.files)) {
    out.files = p.files.map((f) => {
      const url = resolveFileUrl(f.url ?? f.file_path);
      return {
        ...f,
        // Always emit a fully-qualified URL the browser can navigate
        // to, regardless of whether the BE returned absolute or
        // relative. Mirror to file_path too for legacy renderers.
        url,
        file_path: url,
      };
    });
  }

  return out;
}


/* ============================================================
 *  Helper — turn FE filter values into backend query params.
 *  Drops 'all' sentinels so we don't send useless filters.
 * ============================================================ */
function buildParams(filters = {}, extras = {}) {
  const params = { ...extras };
  if (filters.arena && filters.arena !== 'all') params.arena = filters.arena;
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.per_page) params.per_page = filters.per_page;
  if (filters.page) params.page = filters.page;
  return params;
}


export const projects = {
  /* ============================================================
   * READ
   * ============================================================ */

  /**
   * GET /api/projects?mine=1 — projects the current user owns.
   * Returns all statuses (owner sees their entire pipeline). Backend
   * returns paginated; we flatten to an array.
   */
  async list(filters = {}) {
    const res = await http.get('/projects', {
      params: buildParams(filters, { mine: 1 }),
    });
    const rows = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    return rows.map(adaptProject);
  },

  /**
   * GET /api/projects (no mine flag) — projects the user can see in
   * the marketplace. BE applies visibility per relationship:
   *   - own projects (any status)         ← from list page, mixed in
   *   - partner projects (any status)     ← from list page, mixed in
   *   - arena-viewable open_for_bids only ← the real "browse" set
   *
   * Callers that want strictly the third-party browse set should
   * filter out p.user_id===me / p.partner_id===me locally.
   *
   * The FE has a `public` arena that the backend doesn't expose yet
   * (it's the future tendersalerts proxy). Short-circuit to an empty
   * array so the UI shows the empty state instead of erroring.
   */
  async browse(filters = {}) {
    if (filters.arena === 'public') return [];

    const res = await http.get('/projects', {
      params: buildParams(filters, { mine: 0 }),
    });
    const rows = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    return rows.map(adaptProject);
  },

  /**
   * Projects the current user is "associated with" — i.e. ones they
   * own OR are the partner on. Used by the service-provider dashboard
   * to surface live engagements.
   *
   * The BE has no `partner=mine` filter, but the default list call
   * (no mine flag) already returns the union of:
   *   - own (any status)
   *   - partner (any status)
   *   - arena-viewable open_for_bids
   * so we filter the third bucket out client-side and keep the first
   * two. Partner relationships are only populated after the owner
   * accepts an application, so this is often empty for fresh
   * service-provider accounts.
   */
  async associated(userId) {
    if (!userId) return [];
    const res = await http.get('/projects', {
      params: buildParams({}, { mine: 0 }),
    });
    const rows = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    return rows
      .map(adaptProject)
      .filter((p) => p.user_id === userId || p.partner_id === userId);
  },

  /** GET /api/projects/:id */
  async get(id) {
    const res = await http.get(`/projects/${id}`);
    return adaptProject(res?.data ?? res);
  },


  /* ============================================================
   * WRITE
   * ============================================================ */

  /** POST /api/projects */
  async create(payload) {
    const res = await http.post('/projects', payload);
    return adaptProject(res?.data ?? res);
  },

  /** PATCH /api/projects/:id */
  async update(id, payload) {
    const res = await http.patch(`/projects/${id}`, payload);
    return adaptProject(res?.data ?? res);
  },

  /** DELETE /api/projects/:id — soft-delete */
  async remove(id) {
    return http.delete(`/projects/${id}`);
  },

  /** POST /api/projects/:id/restore */
  async restore(id) {
    const res = await http.post(`/projects/${id}/restore`);
    return adaptProject(res?.data ?? res);
  },


  /* ============================================================
   * FILES
   * ============================================================ */

  /**
   * POST /api/projects/:projectId/files
   * Multipart upload. onProgress receives 0..100.
   */
  async uploadFile(projectId, file, onProgress) {
    const form = new FormData();
    form.append('file', file);

    const res = await http.post(`/projects/${projectId}/files`, form, {
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

  /** DELETE /api/projects/:projectId/files/:fileId */
  async removeFile(projectId, fileId) {
    return http.delete(`/projects/${projectId}/files/${fileId}`);
  },
};
