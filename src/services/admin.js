import http from './http';

/* ============================================================
 *  ADMIN SERVICE — wired to Taahud V5 admin endpoints.
 *  ----------------------------------------------------------------
 *  All paths live under /api/admin and require an admin or
 *  super-admin role. The bearer token is attached automatically
 *  by http.js; this module just builds the request bodies and
 *  unwraps response envelopes.
 *
 *  Endpoints (per FRONTEND_INTEGRATION.md §13):
 *
 *    GET    /admin/                             ping
 *
 *    Users
 *    GET    /admin/users                        list (search, account_type, suspended, per_page)
 *    GET    /admin/users/:id                    show
 *    PATCH  /admin/users/:id                    update
 *    POST   /admin/users/:id/suspend            { reason } — revokes tokens
 *    POST   /admin/users/:id/unsuspend
 *    POST   /admin/users/:id/force-verify-phone
 *    POST   /admin/users/:id/force-password-reset  → returns new_password ONCE
 *
 *    Projects
 *    GET    /admin/projects                     list (arena, status, with_trashed, only_trashed)
 *    POST   /admin/projects                     create (optionally `owner_user_id` to proxy-create)
 *    GET    /admin/projects/:id                 show
 *    PATCH  /admin/projects/:id                 update
 *    DELETE /admin/projects/:id                 soft-delete
 *    POST   /admin/projects/:id/restore         restore
 *    DELETE /admin/projects/:id/force-delete    { reason } — super-admin
 *    POST   /admin/projects/:id/force-status    { status, reason }
 *    POST   /admin/projects/:id/force-partner   { partner_user_id, reason }
 *
 *    Applications
 *    GET    /admin/applications                 list (project_id, status, user_id)
 *    GET    /admin/applications/:id             show
 *    POST   /admin/applications/:id/override    { reason }
 *
 *    Roles (super-admin only)
 *    GET    /admin/roles/users?role=admin
 *    POST   /admin/roles/grant                  { user_id, reason }
 *    POST   /admin/roles/revoke                 { user_id, reason }
 *
 *    Audit
 *    GET    /admin/activity                     list (admin_id, action, target_type, ...)
 *    GET    /admin/activity/:id
 *    GET    /admin/activity/admin/:adminUserId
 *    GET    /admin/activity/target/:type/:id
 *
 *  Most responses are wrapped either as { data: {...} } (single)
 *  or { data: [...], meta, links } (paginated). The helpers below
 *  expose the paginated shape directly so the UI can render
 *  pagination controls.
 * ============================================================ */


/* ---------- helpers ---------- */

function strip(obj) {
  // Drop undefined / empty-string params so axios doesn't put noise
  // like `?status=` on the URL.
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    out[k] = v;
  });
  return out;
}

function unwrap(res) {
  return res?.data ?? res;
}

function unwrapPage(res) {
  // The BE returns { data: [...], meta: {...}, links: {...} } for
  // paginated lists. Pass meta + links through so the UI can drive
  // a pager; flatten data to a plain array for the row map.
  if (Array.isArray(res?.data)) {
    return { data: res.data, meta: res.meta || null, links: res.links || null };
  }
  // Some endpoints return a plain array. Treat that as a one-page
  // response with no metadata.
  if (Array.isArray(res)) {
    return { data: res, meta: null, links: null };
  }
  return { data: [], meta: null, links: null };
}


/* ============================================================
 *  Public service surface
 * ============================================================ */

export const admin = {
  /* ---------- ping ---------- */
  async ping() {
    return http.get('/admin/');
  },

  /* ============================================================
   * STATS — GET /admin/stats
   * ----------------------------------------------------------------
   * Single endpoint that powers the admin overview dashboard.
   * Returns aggregate counts + MoM/YoY growth + 12-month series
   * for users, projects, applications in one call. Each request
   * is logged as a `stats.view` audit entry on the BE.
   *
   * Shape (per ADMIN_STATS_INTEGRATION.md):
   *   {
   *     generated_at,
   *     users:        { total, by_account_type, active, suspended,
   *                     admins, super_admins, growth: {...} },
   *     projects:     { total, by_status, by_arena,
   *                     with_applications, without_applications,
   *                     growth: {...} },
   *     applications: { total, by_status, growth: {...} },
   *   }
   *
   * `growth` is { mom_percent, yoy_percent, monthly_series: [...] }
   * where mom/yoy can be null (no baseline) and monthly_series is
   * always exactly 12 entries, oldest→newest, zero-filled.
   * ============================================================ */
  async stats() {
    return http.get('/admin/stats');
  },


  /* ============================================================
   * USERS
   * ============================================================ */
  users: {
    /** GET /admin/users
     *  Filters AND together on the BE. `role` accepts admin /
     *  super-admin / none — the 'none' option lets staff find
     *  regular users that haven't been granted any admin role.
     */
    async list(filters = {}) {
      const params = strip({
        search: filters.search,
        account_type: filters.account_type,
        suspended: filters.suspended,
        role: filters.role,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/users', { params }));
    },

    /** GET /admin/users/:id */
    async get(id) {
      return unwrap(await http.get(`/admin/users/${id}`));
    },

    /** PATCH /admin/users/:id */
    async update(id, payload) {
      const body = strip({
        name: payload.name,
        email: payload.email,
        city: payload.city,
        account_type: payload.account_type,
      });
      return unwrap(await http.patch(`/admin/users/${id}`, body));
    },

    /** POST /admin/users/:id/suspend  { reason } */
    async suspend(id, reason) {
      return http.post(`/admin/users/${id}/suspend`, { reason });
    },

    /** POST /admin/users/:id/unsuspend */
    async unsuspend(id) {
      return http.post(`/admin/users/${id}/unsuspend`);
    },

    /** POST /admin/users/:id/force-verify-phone */
    async forceVerifyPhone(id) {
      return http.post(`/admin/users/${id}/force-verify-phone`);
    },

    /**
     * POST /admin/users/:id/force-password-reset
     * The new password is returned ONCE in `new_password` —
     * the caller must show + record it before navigating away.
     */
    async forcePasswordReset(id) {
      return http.post(`/admin/users/${id}/force-password-reset`);
    },
  },


  /* ============================================================
   * PROJECTS
   * ============================================================ */
  projects: {
    /** GET /admin/projects
     *  Admin sees every project across every arena, including
     *  soft-deleted ones when `with_trashed`/`only_trashed` is set.
     *
     *  Filter set:
     *    - search          fuzzy LIKE on name OR city
     *    - arena / status  enum filters
     *    - type            exact match on project type
     *    - city            exact match on city (precise vs fuzzy
     *                      search)
     *    - owner_id        all projects owned by a given user
     *                      (investigative)
     *    - created_by_admin       0/1 — proxy-created only
     *    - created_by_admin_id    audit trail by admin id
     */
    async list(filters = {}) {
      const params = strip({
        search: filters.search,
        arena: filters.arena,
        status: filters.status,
        type: filters.type,
        city: filters.city,
        owner_id: filters.owner_id,
        created_by_admin:
          filters.created_by_admin === true
            ? 1
            : filters.created_by_admin === false
            ? undefined
            : filters.created_by_admin,
        created_by_admin_id: filters.created_by_admin_id,
        with_trashed: filters.with_trashed ? 1 : undefined,
        only_trashed: filters.only_trashed ? 1 : undefined,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/projects', { params }));
    },

    /** GET /admin/projects/:id */
    async get(id) {
      return unwrap(await http.get(`/admin/projects/${id}`));
    },

    /**
     * POST /admin/projects
     * If `owner_user_id` is provided AND differs from the admin's
     * own id, the BE marks it as a proxy-create and stamps
     * `created_by_admin_id` on the project.
     */
    async create(payload) {
      return unwrap(await http.post('/admin/projects', payload));
    },

    /** PATCH /admin/projects/:id */
    async update(id, payload) {
      return unwrap(await http.patch(`/admin/projects/${id}`, payload));
    },

    /** DELETE /admin/projects/:id — soft delete */
    async remove(id) {
      return http.delete(`/admin/projects/${id}`);
    },

    /** POST /admin/projects/:id/restore */
    async restore(id) {
      return unwrap(await http.post(`/admin/projects/${id}/restore`));
    },

    /** DELETE /admin/projects/:id/force-delete — super-admin only */
    async forceDelete(id, reason) {
      // axios DELETE with a body uses the `data` config field.
      return http.delete(`/admin/projects/${id}/force-delete`, {
        data: { reason },
      });
    },

    /** POST /admin/projects/:id/force-status  { status, reason } */
    async forceStatus(id, status, reason) {
      return unwrap(
        await http.post(`/admin/projects/${id}/force-status`, { status, reason })
      );
    },

    /** POST /admin/projects/:id/force-partner  { partner_user_id, reason } */
    async forcePartner(id, partnerUserId, reason) {
      return unwrap(
        await http.post(`/admin/projects/${id}/force-partner`, {
          partner_user_id: partnerUserId,
          reason,
        })
      );
    },
  },


  /* ============================================================
   * APPLICATIONS
   * ============================================================ */
  applications: {
    /** GET /admin/applications */
    async list(filters = {}) {
      const params = strip({
        project_id: filters.project_id,
        status: filters.status,
        user_id: filters.user_id,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/applications', { params }));
    },

    /** GET /admin/applications/:id */
    async get(id) {
      return unwrap(await http.get(`/admin/applications/${id}`));
    },

    /** POST /admin/applications/:id/override  { reason } */
    async override(id, reason) {
      return unwrap(
        await http.post(`/admin/applications/${id}/override`, { reason })
      );
    },
  },


  /* ============================================================
   * ROLES — super-admin only
   * ============================================================ */
  roles: {
    /** GET /admin/roles/users?role=admin */
    async listUsers(role) {
      const params = strip({ role });
      return unwrapPage(await http.get('/admin/roles/users', { params }));
    },

    /** POST /admin/roles/grant  { user_id, reason } */
    async grant(userId, reason) {
      return http.post('/admin/roles/grant', { user_id: userId, reason });
    },

    /** POST /admin/roles/revoke  { user_id, reason } */
    async revoke(userId, reason) {
      return http.post('/admin/roles/revoke', { user_id: userId, reason });
    },
  },


  /* ============================================================
   * ACTIVITY / AUDIT LOG
   * ============================================================ */
  activity: {
    /** GET /admin/activity */
    async list(filters = {}) {
      const params = strip({
        admin_id: filters.admin_id,
        action: filters.action,
        target_type: filters.target_type,
        target_id: filters.target_id,
        has_reason: filters.has_reason ? 1 : undefined,
        from: filters.from,
        to: filters.to,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/activity', { params }));
    },

    /** GET /admin/activity/:id */
    async get(id) {
      return unwrap(await http.get(`/admin/activity/${id}`));
    },

    /** GET /admin/activity/admin/:adminUserId */
    async byAdmin(adminUserId, filters = {}) {
      const params = strip({
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(
        await http.get(`/admin/activity/admin/${adminUserId}`, { params })
      );
    },

    /**
     * GET /admin/activity/target/:type/:id
     * Pass short class names: 'User' | 'Project' | 'Application'.
     */
    async byTarget(type, id, filters = {}) {
      const params = strip({
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(
        await http.get(`/admin/activity/target/${type}/${id}`, { params })
      );
    },
  },
};

export default admin;
