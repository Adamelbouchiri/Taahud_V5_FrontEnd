import http from './http';

/* ============================================================
 *  RASD SERVICE — رصد, the market-intelligence add-on.
 *  ----------------------------------------------------------------
 *  Mirrors RASD_API_1.md (Sprint 1). Five endpoints, all read-only:
 *
 *    GET /rasd/summary            dashboard header — totals + buckets
 *    GET /rasd/projects           paginated, filterable project feed
 *    GET /rasd/projects/{id}      one project: parties, open roles
 *    GET /rasd/companies          paginated company directory
 *    GET /rasd/companies/{id}     one company: every project it touches
 *
 *  Nothing in Sprint 1 writes. There is no reveal endpoint, no
 *  export, no saved search — don't add speculative calls here.
 *
 *  ACCESS. Every route sits behind
 *    auth:sanctum → not.suspended → phone.verified → rasd.access
 *  and `rasd.access` resolves the ACCOUNT OWNER's subscription, not
 *  the caller's own:
 *
 *    user → active RASD membership → RASD account → owner's plan
 *
 *  So a 403 here has four distinct causes (no subscription, no active
 *  membership, suspended account, global kill switch off) and the BE
 *  names which one in a single Arabic `message`. That message is
 *  rendered VERBATIM — see readAccessDenial() and RasdAccessNotice.
 *
 *  THREE ENVELOPES, on purpose:
 *    lists   { data:[…], links:{…}, meta:{…} }
 *    records { data:{…} }
 *    summary flat — it isn't a resource, so it has no `data` wrapper.
 * ============================================================ */

/* Drop empty keys so a cleared filter doesn't go out as `city=` —
   the BE validates against a fixed list and answers 422 on the
   empty string rather than ignoring it. */
function strip(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

function unwrap(res) {
  return res?.data ?? res;
}

function unwrapPage(res) {
  if (Array.isArray(res?.data)) {
    return { data: res.data, meta: res.meta || null, links: res.links || null };
  }
  if (Array.isArray(res)) return { data: res, meta: null, links: null };
  return { data: [], meta: null, links: null };
}

export const rasd = {
  /* ============================================================
   *  GET /api/rasd/summary
   *  ----------------------------------------------------------------
   *  Describes the ENTIRE dataset and takes no parameters — it is
   *  intentionally not filterable. Flat shape:
   *
   *    totals    { projects, companies, open_roles,
   *                projects_with_open_roles, estimated_value_total }
   *    by_stage  [{ value, label, count }]   count desc, no empties
   *    by_sector [{ value, label, count }]
   *    by_city   [{ value, label, count }]
   *    last_updated_at  ISO — the freshness signal, always shown
   *
   *  Each bucket carries value AND label: chart the label, filter
   *  with the value. by_city is also the source for every city
   *  dropdown in the module (see useRasdSummary) — it's always
   *  current and only lists cities that actually have projects,
   *  which a hardcoded list can't promise.
   * ============================================================ */
  async summary() {
    const res = await http.get('/rasd/summary');
    return {
      totals: res?.totals ?? {},
      by_stage: res?.by_stage ?? [],
      by_sector: res?.by_sector ?? [],
      by_city: res?.by_city ?? [],
      last_updated_at: res?.last_updated_at ?? null,
    };
  },

  projects: {
    /**
     * GET /api/rasd/projects
     *
     * Any value outside the documented enums is a 422, not an empty
     * page — the two mean different things to the user and the list
     * pages render them differently. See isRasdValidationError.
     *
     * @param {{ q?, city?, sector?, stage?, confidence?, has_gap?,
     *           min_value?, max_value?, sort?, page?, per_page? }} filters
     */
    async list(filters = {}) {
      const params = strip({
        q: filters.q,
        city: filters.city,
        sector: filters.sector,
        stage: filters.stage,
        confidence: filters.confidence,
        // `1` only — sending has_gap=0 would filter for projects that
        // have no gap, which is not what an unchecked box means.
        has_gap: filters.has_gap ? 1 : undefined,
        min_value: filters.min_value,
        max_value: filters.max_value,
        sort: filters.sort,
        page: filters.page,
        per_page: filters.per_page,
      });
      return unwrapPage(await http.get('/rasd/projects', { params }));
    },

    /**
     * GET /api/rasd/projects/:id
     *
     * Adds description / notes / collected_at / expected_start_at /
     * expected_end_at plus the two role arrays to the list row. `parties` and `open_roles` are separate
     * on purpose — who is already in vs. where you can get in.
     *
     * A 404 carries Laravel's default English message; the caller
     * renders its own empty state rather than showing it.
     */
    async get(id) {
      return unwrap(await http.get(`/rasd/projects/${id}`));
    },
  },

  companies: {
    /**
     * GET /api/rasd/companies — sorted by name ascending.
     *
     * `role` returns companies holding that party role on at least
     * one project (accepts `auditor` since v1.2). `category` is one
     * of RASD_COMPANY_CATEGORIES — all seven are populated since v1.2.
     *
     * @param {{ q?, city?, role?, category?, page?, per_page? }} filters
     */
    async list(filters = {}) {
      const params = strip({
        q: filters.q,
        city: filters.city,
        role: filters.role,
        category: filters.category,
        page: filters.page,
        per_page: filters.per_page,
      });
      return unwrapPage(await http.get('/rasd/companies', { params }));
    },

    /**
     * GET /api/rasd/companies/:id
     *
     * `projects` may list the same project twice under different
     * roles — that's valid data, not a duplicate row.
     *
     * `contacts` carries people since v1.2 (RasdContactResource). Draw
     * phone/email from `has_phone` / `has_email`, never from whether
     * `phone` is set — see contactChannel() in config/rasdConstants.
     */
    async get(id) {
      return unwrap(await http.get(`/rasd/companies/${id}`));
    },
  },
};

/* ------------------------------------------------------------------
 *  Error readers
 * ------------------------------------------------------------------ */

/**
 * The `rasd.access` middleware's refusal, or null for anything else.
 *
 * The message is returned untouched and MUST be rendered verbatim.
 * There are four distinct reasons behind a RASD 403 — missing
 * subscription, no active membership, suspended account, kill switch
 * off — and three of them are things the user can fix themselves. A
 * generic «لا تملك صلاحية» sends them to support for nothing.
 */
export function readAccessDenial(err) {
  if (err?.status !== 403) return null;
  return err?.message || null;
}

/**
 * True when the BE rejected the FILTERS rather than returning no
 * matches. "Nothing matched" and "your request was malformed" are
 * different states and the list pages show them differently.
 */
export function isRasdValidationError(err) {
  return err?.status === 422;
}
