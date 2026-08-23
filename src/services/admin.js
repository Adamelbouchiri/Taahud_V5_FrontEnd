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
 *    GET    /admin/projects                     list (arena, status, owner_identifier,
 *                                               with_trashed, only_trashed)
 *    POST   /admin/projects                     create (optionally `owner_user_id` to proxy-create)
 *    GET    /admin/projects/:id                 show (+ steps, payment_summary,
 *                                               partner_earnings — admin-only)
 *    PATCH  /admin/projects/:id                 update
 *    DELETE /admin/projects/:id                 soft-delete
 *    POST   /admin/projects/:id/restore         restore
 *    DELETE /admin/projects/:id/force-delete    { reason } — super-admin
 *    POST   /admin/projects/:id/force-status    { status, reason }
 *    POST   /admin/projects/:id/force-partner   { partner_identifier, reason }
 *
 *    Applications
 *    GET    /admin/applications                 list (project_id, status,
 *                                               applicant_identifier)
 *    GET    /admin/applications/:id             show (+ full applicant & the
 *                                               admin-rich project)
 *    POST   /admin/applications/:id/override    { reason }
 *
 *    Partnership requests (Solidarity offers)
 *    GET    /admin/partnership-requests              list (project_id, partner_identifier, status, offering_type, with/only_trashed)
 *    POST   /admin/partnership-requests              proxy-create { project_id, user_identifier, ...offer, reason }
 *    GET    /admin/partnership-requests/:id          show (incl. trashed)
 *    POST   /admin/partnership-requests/:id/override { new_status, reason }
 *    DELETE /admin/partnership-requests/:id          soft-delete { reason }
 *    POST   /admin/partnership-requests/:id/restore  restore
 *    DELETE /admin/partnership-requests/:id/force-delete  { reason } — super-admin
 *    POST   /admin/projects/:id/force-partner-solidarity  { partnership_request_id, reason }
 *
 *    Subscriptions
 *    GET    /admin/subscriptions/stats          dashboard aggregates
 *    GET    /admin/subscriptions                list (status, plan_id, user_id, provider, per_page)
 *    GET    /admin/subscriptions/:id            show (with charges)
 *    POST   /admin/subscriptions                grant a comped sub
 *    POST   /admin/subscriptions/:id/cancel     { reason } — keeps the row
 *    POST   /admin/subscriptions/:id/extend     { months } — does NOT charge
 *    DELETE /admin/subscriptions/:id            { reason } — super-admin hard delete
 *
 *    Payments (read-only ledger)
 *    GET    /admin/payments                     list + summary + tab_counts (status, kind, payment_method, q, per_page)
 *    GET    /admin/payments/:id                 show
 *
 *    Withdrawals (escrow payouts)
 *    GET    /admin/withdrawals                  list (status=pending|approved|paid|rejected)
 *    POST   /admin/withdrawals/:id/approve      status → approved (money stays debited)
 *    POST   /admin/withdrawals/:id/reject       { reason } — credits the amount back
 *
 *    Plans (catalog CRUD)
 *    GET    /admin/plans                        list (account_type, tier, is_addon, is_active)
 *    GET    /admin/plans/:id                    show (+ subscriptions_count)
 *    POST   /admin/plans                        create
 *    PATCH  /admin/plans/:id                    update (response: price_changed)
 *    POST   /admin/plans/:id/activate           re-list
 *    POST   /admin/plans/:id/deactivate         retire (subs unaffected)
 *    DELETE /admin/plans/:id                    super-admin hard delete (422 plan_in_use)
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

function num(v) {
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}


/* ============================================================
 *  Adapters — enriched admin detail resources
 *  ----------------------------------------------------------------
 *  See ADMIN_ENRICHED_VIEWS_FRONTEND.md. The admin project detail
 *  carries three admin-only sections the user-facing resource does
 *  NOT have: `steps`, `payment_summary` and `partner_earnings`.
 *
 *  Money on this view is SAR-decimal STRINGS ("120000.00") across
 *  the board — budget, original_budget, total_paid, partner_earnings,
 *  step amounts.
 *  No halalas here (unlike wallet/withdrawals). We keep the raw
 *  strings and add parsed `*_num` twins so components can compare
 *  and compute without re-running parseFloat in render.
 * ============================================================ */

function adaptAdminProject(p) {
  if (!p || typeof p !== 'object') return p;

  // `steps` INCLUDES provider proposals (status: 'proposed') so admins
  // can see what's awaiting the owner — badge them distinctly.
  const steps = Array.isArray(p.steps)
    ? p.steps.map((s) => ({ ...s, amount_num: num(s.amount) }))
    : [];

  // payment_summary counts only IN-PLAN steps; proposed_count is a
  // separate callout for proposals still awaiting owner approval.
  const ps = p.payment_summary;
  const payment_summary =
    ps && typeof ps === 'object'
      ? {
          ...ps,
          budget_num: num(ps.budget),
          total_paid_num: num(ps.total_paid),
          steps_total: Number(ps.steps_total) || 0,
          steps_paid: Number(ps.steps_paid) || 0,
          proposed_count: Number(ps.proposed_count) || 0,
        }
      : null;

  return {
    ...p,
    steps,
    payment_summary,
    // What the partner earned from THIS project. Should equal
    // total_paid — a divergence is worth surfacing, not hiding.
    partner_earnings_num:
      p.partner_earnings != null ? num(p.partner_earnings) : null,
    /* Budget-on-accept snapshot (PROJECT_BUDGET_CHANGES_INTEGRATION.md).
       null  → no active acceptance; `budget` is authoritative on its own.
       value → an acceptance is live: `budget` IS the accepted bid_amount
               and this holds the owner's pre-accept estimate.
       Kept as null (not 0) when absent so "no snapshot" stays
       distinguishable from "estimate was zero". */
    original_budget_num:
      p.original_budget != null ? num(p.original_budget) : null,
  };
}

function adaptAdminApplication(a) {
  if (!a || typeof a !== 'object') return a;
  // The nested `project` is the full AdminProjectResource (steps +
  // payment_summary + partner_earnings), so it gets the same treatment.
  return a.project ? { ...a, project: adaptAdminProject(a.project) } : a;
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
   *
   * The users resource additionally carries all_time_percent /
   * first_record_at / months_active (the projects/applications
   * responses don't), surfaced only on the users KPI card.
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

    /**
     * DELETE /admin/users/:id/force  { reason } — ⚠️ irreversible hard delete.
     * Permanently removes the user row (no soft-delete, no recovery).
     * Guards on the BE:
     *   - 422 if the user has associated data (projects / applications /
     *     admin activity) — response carries has_projects / has_applications /
     *     has_admin_activity flags; suspend instead.
     *   - 422 on self-deletion or a missing/short reason (min 10 chars).
     * Creates a `user.force_delete` audit entry with a full snapshot.
     */
    async forceDelete(id, reason) {
      // axios DELETE with a body uses the `data` config field.
      return http.delete(`/admin/users/${id}/force`, { data: { reason } });
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
     *    - owner_identifier   all projects owned by the user with this
     *                      human-readable identifier ("260703R47") —
     *                      investigative. Replaced the old numeric
     *                      `owner_id`, which the BE no longer reads.
     *                      An unknown identifier returns an EMPTY page
     *                      (200), not a 4xx — treat it as "no matches".
     *    - created_by_admin       0/1 — proxy-created only
     *    - created_by_admin_id    audit trail by admin id (still numeric:
     *                      it's the acting admin, not a filtered subject)
     */
    async list(filters = {}) {
      const params = strip({
        search: filters.search,
        arena: filters.arena,
        status: filters.status,
        type: filters.type,
        city: filters.city,
        owner_identifier: filters.owner_identifier,
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

    /**
     * GET /admin/projects/:id
     * Admin-rich: everything the project resource returns PLUS
     * `steps` (incl. proposals), `payment_summary` and
     * `partner_earnings`. See adaptAdminProject above for the
     * parsed `*_num` twins added on top.
     */
    async get(id) {
      const body = unwrap(await http.get(`/admin/projects/${id}`));
      // Some builds nest the resource one level deeper — adapt whichever
      // one is the actual project so the `*_num` twins never land on a
      // wrapper object.
      return adaptAdminProject(body?.project ?? body);
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

    /**
     * POST /admin/projects/:id/force-partner  { partner_identifier, reason }
     * Takes the partner's human-readable identifier ("260703R47"), not a
     * numeric user id — the BE resolves it against users.identifier and
     * 422s (`partner_identifier`) when nothing matches.
     */
    async forcePartner(id, partnerIdentifier, reason) {
      return unwrap(
        await http.post(`/admin/projects/${id}/force-partner`, {
          partner_identifier: partnerIdentifier,
          reason,
        })
      );
    },
  },


  /* ============================================================
   * APPLICATIONS
   * ============================================================ */
  applications: {
    /** GET /admin/applications
     *  `applicant_identifier` filters by the bidder's human-readable
     *  identifier ("260703R47") and replaced the old numeric `user_id`.
     *  `project_id` stays numeric — projects have no identifier.
     *  An unknown identifier returns an empty page, not an error. */
    async list(filters = {}) {
      const params = strip({
        project_id: filters.project_id,
        status: filters.status,
        applicant_identifier: filters.applicant_identifier,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/applications', { params }));
    },

    /**
     * GET /admin/applications/:id
     * Admin-rich: `applicant` is the admin user block (identity +
     * standing + projects_count / applications_count — never secrets)
     * and `project` is the full AdminProjectResource, steps and
     * payment_summary included, so an admin can judge the bid without
     * leaving the screen. The LIST rows stay lean — fetch this on open.
     */
    async get(id) {
      return adaptAdminApplication(
        unwrap(await http.get(`/admin/applications/${id}`))
      );
    },

    /** POST /admin/applications/:id/override  { reason }
     *  Reversing an ACCEPTED bid also restores the money: project.budget
     *  goes back to project.original_budget and the snapshot clears to
     *  null (alongside partner_id → null, status → open_for_bids).
     *  Overriding a PENDING bid just rejects it — no cascade, no budget
     *  change. Siblings auto-rejected at accept time stay rejected.
     *  The audit payload gains budget_before_override,
     *  original_budget_before_override and budget_restored_to. */
    async override(id, reason) {
      return unwrap(
        await http.post(`/admin/applications/${id}/override`, { reason })
      );
    },
  },


  /* ============================================================
   * PARTNERSHIP REQUESTS (Solidarity arena offers)
   * ----------------------------------------------------------------
   * Admin management of partnership_requests — mirrors the
   * applications admin surface with two additions: proxy-create
   * (register an offer on behalf of a user, bypassing the addon
   * gate) and force-partner-solidarity (force-accept on behalf of
   * an unresponsive owner). All actions are audited; the mutating
   * ones require a `reason` (10+ chars). Soft-delete/restore are
   * reversible; force-delete is super-admin-only and irreversible.
   * See ADMIN_PARTNERSHIP_INTEGRATION.md.
   * ============================================================ */
  partnerships: {
    /** GET /admin/partnership-requests — every offer system-wide.
     *  Filters: project_id, partner_identifier, status, offering_type,
     *  plus with_trashed / only_trashed (0/1) for archived rows.
     *  `partner_identifier` is the offering user's human-readable
     *  identifier and replaced the old numeric `user_id`; an unknown
     *  one returns an empty page, not an error. */
    async list(filters = {}) {
      const params = strip({
        project_id: filters.project_id,
        partner_identifier: filters.partner_identifier,
        status: filters.status,
        offering_type: filters.offering_type,
        with_trashed: filters.with_trashed ? 1 : undefined,
        only_trashed: filters.only_trashed ? 1 : undefined,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/partnership-requests', { params }));
    },

    /** GET /admin/partnership-requests/:id — includes soft-deleted. */
    async get(id) {
      return unwrap(await http.get(`/admin/partnership-requests/${id}`));
    },

    /**
     * POST /admin/partnership-requests — proxy-create on behalf of a user.
     * Bypasses the addon gate but still validates solidarity-arena,
     * non-owner, and no-duplicate. Body: { project_id, user_identifier,
     * offering_type, firm_name, capability_brief, proposed_share?,
     * message, reason }.
     *
     * `user_identifier` (the string identifier, replacing the old numeric
     * `user_id`) is required and must exist — unlike the LIST filters, a
     * miss here is a 422 with errors.user_identifier, not an empty result.
     */
    async proxyCreate(payload) {
      const body = strip({
        project_id: payload.project_id,
        user_identifier: payload.user_identifier,
        offering_type: payload.offering_type,
        firm_name: payload.firm_name,
        capability_brief: payload.capability_brief,
        proposed_share: payload.proposed_share,
        message: payload.message,
        reason: payload.reason,
      });
      return unwrap(await http.post('/admin/partnership-requests', body));
    },

    /** POST /admin/partnership-requests/:id/override  { new_status, reason }.
     *  No cascade — accepting one does not auto-reject siblings. */
    async override(id, newStatus, reason) {
      return unwrap(
        await http.post(`/admin/partnership-requests/${id}/override`, {
          new_status: newStatus,
          reason,
        })
      );
    },

    /** DELETE /admin/partnership-requests/:id  { reason } — soft-delete. */
    async remove(id, reason) {
      return http.delete(`/admin/partnership-requests/${id}`, {
        data: { reason },
      });
    },

    /** POST /admin/partnership-requests/:id/restore — undo a soft-delete. */
    async restore(id) {
      return unwrap(
        await http.post(`/admin/partnership-requests/${id}/restore`)
      );
    },

    /** DELETE /admin/partnership-requests/:id/force-delete  { reason }
     *  — super-admin only, irreversible. */
    async forceDelete(id, reason) {
      return http.delete(`/admin/partnership-requests/${id}/force-delete`, {
        data: { reason },
      });
    },

    /**
     * POST /admin/projects/:projectId/force-partner-solidarity
     * Force-accept a specific offer on behalf of an unresponsive owner.
     * Distinct audit action (partnership.force_accept) from override.
     * Body: { partnership_request_id, reason }.
     */
    async forcePartner(projectId, partnershipRequestId, reason) {
      return unwrap(
        await http.post(
          `/admin/projects/${projectId}/force-partner-solidarity`,
          { partnership_request_id: partnershipRequestId, reason }
        )
      );
    },
  },


  /* ============================================================
   * PARTNER APPLICATIONS — the "Become a Partner" program.
   * ----------------------------------------------------------------
   * Businesses apply (public POST /partners/apply); admins approve to
   * mint a 1-year discount code, and manage the full lifecycle here.
   * SEPARATE from `partnerships` above (Solidarity offers) and
   * `applications` (project bids) — don't confuse them. See
   * partner_applications.md.
   *
   * Base: /admin/partner-applications. All require admin:* + verified
   * phone + not-suspended; force-delete additionally needs super-admin:*.
   *
   *   GET    /                       list + filters (status, sector,
   *                                  user_id, q, with/only_trashed)
   *   GET    /:id                    show (incl. soft-deleted)
   *   POST   /:id/approve            mint code, +1yr expiry; 422 if approved
   *   POST   /:id/reject             { rejection_reason }; 422 if approved
   *   PATCH  /:id                    partial update of company/sector/…
   *   POST   /:id/regenerate-code    new code; 422 if not approved/revoked
   *   POST   /:id/revoke             { reason } kill-switch; code stays,
   *                                  is_code_valid → false
   *   POST   /:id/reinstate          clears revocation; 422 if not revoked
   *   DELETE /:id                    { reason } soft-delete
   *   POST   /:id/restore            restore soft-deleted
   *   DELETE /:id/force-delete       { reason } — super-admin, permanent
   * ============================================================ */
  partnerApplications: {
    /** GET /admin/partner-applications — paginated list.
     *  Filters AND together: status (pending/approved/rejected),
     *  sector (exact), user_id, q (partial on company_name OR email),
     *  with_trashed / only_trashed (0/1). */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        sector: filters.sector,
        user_id: filters.user_id,
        q: filters.q,
        with_trashed: filters.with_trashed ? 1 : undefined,
        only_trashed: filters.only_trashed ? 1 : undefined,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(
        await http.get('/admin/partner-applications', { params })
      );
    },

    /** GET /admin/partner-applications/:id — includes soft-deleted. */
    async get(id) {
      return unwrap(await http.get(`/admin/partner-applications/${id}`));
    },

    /** POST /:id/approve — mints a code, sets a 1-yr expiry, stamps the
     *  approver, and clears any prior revoke/reject. 422 if already approved. */
    async approve(id) {
      return unwrap(
        await http.post(`/admin/partner-applications/${id}/approve`)
      );
    },

    /** POST /:id/reject — { rejection_reason } (required, applicant-facing).
     *  422 if already approved. */
    async reject(id, rejectionReason) {
      return unwrap(
        await http.post(`/admin/partner-applications/${id}/reject`, {
          rejection_reason: rejectionReason,
        })
      );
    },

    /** PATCH /:id — partial update of any of company_name / sector /
     *  email / phone / offer (+ optional reason). */
    async update(id, payload) {
      const body = strip({
        company_name: payload.company_name,
        sector: payload.sector,
        email: payload.email,
        phone: payload.phone,
        offer: payload.offer,
        reason: payload.reason,
      });
      return unwrap(
        await http.patch(`/admin/partner-applications/${id}`, body)
      );
    },

    /** POST /:id/regenerate-code — new code, resets the 1-yr expiry.
     *  422 if not approved or currently revoked. */
    async regenerateCode(id) {
      return unwrap(
        await http.post(`/admin/partner-applications/${id}/regenerate-code`)
      );
    },

    /** POST /:id/revoke — { reason } (required). Kill-switch: the code
     *  stays but is_code_valid → false. 422 if not approved / already revoked. */
    async revoke(id, reason) {
      return unwrap(
        await http.post(`/admin/partner-applications/${id}/revoke`, { reason })
      );
    },

    /** POST /:id/reinstate — clears the revocation. 422 if not revoked. */
    async reinstate(id) {
      return unwrap(
        await http.post(`/admin/partner-applications/${id}/reinstate`)
      );
    },

    /** DELETE /:id — { reason } (required). Soft delete. */
    async remove(id, reason) {
      return http.delete(`/admin/partner-applications/${id}`, {
        data: { reason },
      });
    },

    /** POST /:id/restore — restore a soft-deleted row. */
    async restore(id) {
      return unwrap(
        await http.post(`/admin/partner-applications/${id}/restore`)
      );
    },

    /** DELETE /:id/force-delete — { reason } (required) — super-admin,
     *  permanent. 403 for a plain admin. */
    async forceDelete(id, reason) {
      return http.delete(`/admin/partner-applications/${id}/force-delete`, {
        data: { reason },
      });
    },
  },


  /* ============================================================
   * SUBSCRIPTIONS
   * ----------------------------------------------------------------
   * Admin subscription management. All paths live under
   * /admin/subscriptions and require the `admin:*` ability; the
   * hard `delete` additionally requires `super-admin:*`.
   *
   * Money notes (see the Postman collection):
   *   - plan.price is a decimal string ("1999.00").
   *   - stats.revenue / avg_value / total_revenue are SAR numbers.
   *   - charges[].amount is in HALALAS (SAR × 100) — divide by 100.
   *
   * `is_active` (not `status`) is the source of truth for whether
   * the subscriber has access right now: a comped sub can read
   * status=active with a past period and is_active=false.
   * ============================================================ */
  subscriptions: {
    /** GET /admin/subscriptions/stats — dashboard aggregates.
     *  Returns { summary, by_account_type[], by_plan[] } un-enveloped. */
    async stats() {
      return http.get('/admin/subscriptions/stats');
    },

    /**
     * GET /admin/subscriptions/plans — active plans for the grant picker.
     * Filters (optional):
     *   - account_type — only plans for this type; pass the selected
     *     subscriber's type so the picker matches them.
     *   - is_addon — 1 add-ons only, 0 base only; omit for all.
     * Returns a plain array of plan objects ({ id, code, account_type,
     * tier, billing_interval_months, price, currency, name_ar, name_en,
     * is_addon }). Use `id` as `plan_id` when granting.
     */
    async plans(filters = {}) {
      const params = strip({
        account_type: filters.account_type,
        is_addon: filters.is_addon,
      });
      const res = await http.get('/admin/subscriptions/plans', { params });
      if (Array.isArray(res?.data)) return res.data;
      return Array.isArray(res) ? res : [];
    },

    /** GET /admin/subscriptions — paginated list.
     *  Filters (all optional, AND together): status, plan_id,
     *  user_id, provider, per_page. */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        plan_id: filters.plan_id,
        user_id: filters.user_id,
        provider: filters.provider,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/subscriptions', { params }));
    },

    /** GET /admin/subscriptions/:id — one sub with the last 10 charges. */
    async get(id) {
      return unwrap(await http.get(`/admin/subscriptions/${id}`));
    },

    /**
     * POST /admin/subscriptions — grant a comped subscription.
     * Body: { user_id, plan_id, months?, reason? }. The created sub
     * is provider=manual, auto_renew=false (the renewal cron skips it).
     * Returns { message, subscription }.
     * Errors: 409 (already active on that plan), 422 (validation).
     */
    async grant(payload) {
      const body = strip({
        user_id: payload.user_id,
        plan_id: payload.plan_id,
        months: payload.months,
        reason: payload.reason,
      });
      return http.post('/admin/subscriptions', body);
    },

    /** POST /admin/subscriptions/:id/cancel — admin cancel (keeps row).
     *  Body: { reason? }. Returns { message, subscription }.
     *  422 if already canceled. */
    async cancel(id, reason) {
      return http.post(`/admin/subscriptions/${id}/cancel`, strip({ reason }));
    },

    /** POST /admin/subscriptions/:id/extend — push period out N months.
     *  Body: { months } (1–24, required). Returns { message, subscription }.
     *  422 on a canceled sub or invalid months. */
    async extend(id, months) {
      return http.post(`/admin/subscriptions/${id}/extend`, { months });
    },

    /** DELETE /admin/subscriptions/:id — HARD delete (super-admin).
     *  Body: { reason? }. Returns { message, deleted }. The payment
     *  ledger survives (charges detach). 403 without super-admin:*. */
    async remove(id, reason) {
      return http.delete(`/admin/subscriptions/${id}`, {
        data: strip({ reason }),
      });
    },
  },


  /* ============================================================
   * PAYMENTS — read-only view over the payment_charges ledger
   * ----------------------------------------------------------------
   * Payments & invoices console (see the Admin Payments Postman
   * collection). A transaction row IS a payment_charge; user /
   * category / plan come through subscription_id. Invoice numbers
   * are derived from the id (`INV-` + id), not stored.
   *
   * The list endpoint returns FOUR top-level keys in one shot:
   *   - summary      { total_revenue, refunded_amount } in SAR
   *   - data[]       PaymentResource rows for the current filter/page
   *   - meta         pagination
   *   - tab_counts   { all, successful, pending, failed, refunded }
   * `summary` and `tab_counts` are computed over ALL payments and do
   * NOT change as you filter the table — so the cards + tab badges
   * stay constant. We pass all four through untouched.
   *
   * PaymentResource money: `amount` is SAR (already halalas/100),
   * `amount_halalas` is the raw value. The `*_label` fields follow
   * Accept-Language; the raw fields (status / kind / payment_method)
   * are for logic.
   *
   * can_refund / can_confirm are eligibility seeds — the refund /
   * confirm actions are not built on the BE yet, so this surface is
   * read-only (list + show + client-side export).
   * ============================================================ */
  payments: {
    /** GET /admin/payments — list + summary + tab counts.
     *  Filters (table only): status (successful|pending|failed|
     *  refunded), kind (initial|renewal), payment_method (card|
     *  bank_transfer|applepay|stcpay), q (invoice # or user name),
     *  per_page. Returns { data, meta, summary, tab_counts }. */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        kind: filters.kind,
        payment_method: filters.payment_method,
        q: filters.q,
        per_page: filters.per_page,
        page: filters.page,
      });
      const res = await http.get('/admin/payments', { params });
      return {
        data: Array.isArray(res?.data) ? res.data : [],
        meta: res?.meta || null,
        summary: res?.summary || null,
        tab_counts: res?.tab_counts || null,
      };
    },

    /** GET /admin/payments/:id — one payment (404 if missing). */
    async get(id) {
      return unwrap(await http.get(`/admin/payments/${id}`));
    },
  },


  /* ============================================================
   * WITHDRAWALS — the escrow payout review queue
   * ----------------------------------------------------------------
   * Providers earn into a wallet when project owners pay for steps
   * (see services/wallet.js). Requesting a withdrawal DEBITS the
   * wallet immediately and parks the row as `pending`; this surface
   * is where an admin settles it.
   *
   *   approve → status `approved`. The money stays debited. The actual
   *             bank / stc payout happens OFF-PLATFORM for now, so
   *             `approved → paid` is not a transition the API exposes.
   *   reject  → status `rejected` AND the amount is credited back to
   *             the provider's wallet. `reason` is required.
   *
   * Both 422 when the withdrawal isn't `pending` — so a row settled in
   * another tab fails loudly instead of double-crediting.
   *
   * MONEY UNIT: `amount` is an INTEGER IN HALALAS (1 SAR = 100).
   * ============================================================ */
  withdrawals: {
    /** GET /admin/withdrawals — every provider's withdrawals, newest
     *  first, 20/page. `status` filters the queue: pending | approved |
     *  paid | rejected (omit for all). */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/withdrawals', { params }));
    },

    /** POST /admin/withdrawals/:id/approve — no body. 422 if not pending. */
    async approve(id) {
      return unwrap(await http.post(`/admin/withdrawals/${id}/approve`));
    },

    /** POST /admin/withdrawals/:id/reject — { reason } REQUIRED.
     *  Reverses the debit: the provider gets the amount back. */
    async reject(id, reason) {
      return unwrap(
        await http.post(`/admin/withdrawals/${id}/reject`, { reason })
      );
    },
  },


  /* ============================================================
   * PLANS — subscription plan catalog (CRUD + activate/deactivate)
   * ----------------------------------------------------------------
   * Unlike the public /plans (account-type-scoped, active only) and
   * the grant picker (subscriptions.plans), /admin/plans is the full
   * catalog including inactive plans, with create/update/retire.
   *
   * PlanResource: id, code, account_type (null for add-ons), tier,
   * billing_interval_months, price (decimal SAR), currency, name_ar,
   * name_en, description_ar, description_en, features[], is_addon,
   * is_active, sort_order, created_at, updated_at.
   *
   * Retire vs delete: deactivate() hides a plan from new sign-ups but
   * keeps existing subscribers working — the safe option. delete() is
   * super-admin only and 422s (code: plan_in_use) if any subscription
   * references the plan.
   * ============================================================ */
  plans: {
    /**
     * GET /admin/plans/features — the feature catalog for the editor.
     * Features are a fixed catalog of CODES (added by developers in
     * FeatureCatalog.php, not via the API). A plan's `features` is an
     * array of these codes; the checklist saves codes and the BE
     * resolves them to `features_localized` labels on read.
     * Returns an array of { code, en, ar }.
     */
    async features() {
      const res = await http.get('/admin/plans/features');
      if (Array.isArray(res?.data)) return res.data;
      return Array.isArray(res) ? res : [];
    },

    /** GET /admin/plans — paginated catalog.
     *  Filters: account_type, tier, is_addon (1/0), is_active (1/0). */
    async list(filters = {}) {
      const params = strip({
        account_type: filters.account_type,
        tier: filters.tier,
        is_addon: filters.is_addon,
        is_active: filters.is_active,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/plans', { params }));
    },

    /** GET /admin/plans/:id — plan + subscriptions_count.
     *  Returns the raw envelope { data, subscriptions_count } so the
     *  caller can decide deactivate (count > 0) vs delete. */
    async get(id) {
      return http.get(`/admin/plans/${id}`);
    },

    /** POST /admin/plans — create. Returns { message, data }.
     *  Required: code, tier, billing_interval_months, price, name_ar,
     *  name_en; account_type required unless is_addon. */
    async create(payload) {
      return http.post('/admin/plans', payload);
    },

    /** PATCH /admin/plans/:id — partial update.
     *  Returns { message, price_changed, data }; branch on
     *  price_changed to warn that subscribers were emailed. */
    async update(id, payload) {
      return http.patch(`/admin/plans/${id}`, payload);
    },

    /** POST /admin/plans/:id/activate — re-list a retired plan. */
    async activate(id) {
      return http.post(`/admin/plans/${id}/activate`);
    },

    /** POST /admin/plans/:id/deactivate — retire (existing subs unaffected). */
    async deactivate(id) {
      return http.post(`/admin/plans/${id}/deactivate`);
    },

    /** DELETE /admin/plans/:id — HARD delete (super-admin).
     *  422 (code: plan_in_use) if any subscription references it. */
    async remove(id, reason) {
      return http.delete(`/admin/plans/${id}`, { data: strip({ reason }) });
    },
  },


  /* ============================================================
   * BROKERS — the approval queue for `broker` accounts
   * ----------------------------------------------------------------
   * A broker registers through the normal /auth/register with
   * account_type='broker' and lands on `pending_review`. Nothing in
   * the broker workspace opens until an admin approves here.
   *
   * Lifecycle (BROKER_SYSTEM_INTEGRATION.md):
   *   pending_review → active     approve()
   *   pending_review → rejected   reject(reason)
   *   active         → suspended  suspend(reason)
   *   suspended      → active     reactivate()
   *   suspended      → rejected   reject(reason)
   *
   * approve/reject/suspend/reactivate all return { message, broker }.
   * Re-running a transition that no longer applies 422s with a plain
   * message (e.g. "هذا الوسيط نشط بالفعل.").
   * ============================================================ */
  brokers: {
    /** GET /admin/brokers?status=pending_review */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        search: filters.search,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/brokers', { params }));
    },

    /** POST /admin/brokers/:id/approve → broker_status becomes active. */
    async approve(id) {
      return http.post(`/admin/brokers/${id}/approve`);
    },

    /** POST /admin/brokers/:id/reject  { reason } — reason REQUIRED.
     *  Permanent: surfaces to the broker as broker_rejection_reason. */
    async reject(id, reason) {
      return http.post(`/admin/brokers/${id}/reject`, { reason });
    },

    /** POST /admin/brokers/:id/suspend  { reason } — reason REQUIRED.
     *  Reversible; the broker's existing data is preserved. */
    async suspend(id, reason) {
      return http.post(`/admin/brokers/${id}/suspend`, { reason });
    },

    /** POST /admin/brokers/:id/reactivate — suspended back to active. */
    async reactivate(id) {
      return http.post(`/admin/brokers/${id}/reactivate`);
    },
  },


  /* ============================================================
   * OPPORTUNITIES — the review queue for broker-registered
   * introductions.
   * ----------------------------------------------------------------
   * approve() is the consequential one: it starts the 90-day hold
   * (`held_until`), which blocks any other broker from registering
   * the same project_owner national_id. reject() and cancel() both
   * require a reason.
   * ============================================================ */
  opportunities: {
    /** GET /admin/opportunities?status=pending_review */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        search: filters.search,
        broker_id: filters.broker_id,
        per_page: filters.per_page,
        page: filters.page,
      });
      return unwrapPage(await http.get('/admin/opportunities', { params }));
    },

    /** GET /admin/opportunities/:id — includes broker + parties. */
    async get(id) {
      return unwrap(await http.get(`/admin/opportunities/${id}`));
    },

    /** POST /admin/opportunities/:id/approve — starts the 90-day hold. */
    async approve(id) {
      return http.post(`/admin/opportunities/${id}/approve`);
    },

    /** POST /admin/opportunities/:id/reject  { reason } — REQUIRED. */
    async reject(id, reason) {
      return http.post(`/admin/opportunities/${id}/reject`, { reason });
    },

    /** POST /admin/opportunities/:id/cancel  { reason } — REQUIRED.
     *  Allowed at any live stage: draft, pending_review, or active. */
    async cancel(id, reason) {
      return http.post(`/admin/opportunities/${id}/cancel`, { reason });
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
