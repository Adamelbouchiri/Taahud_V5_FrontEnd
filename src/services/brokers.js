import http from './http';

/* ============================================================
 *  BROKERS SERVICE — the broker workspace + the public referral
 *  lookup.
 *  ----------------------------------------------------------------
 *  Per BROKER_SYSTEM_INTEGRATION.md (MVP sprint):
 *
 *    GET    /brokers/lookup?identifier=…        public
 *    POST   /broker/opportunities               create draft
 *    GET    /broker/opportunities               my opportunities
 *    GET    /broker/opportunities/{id}
 *    PATCH  /broker/opportunities/{id}          title / description
 *    POST   /broker/opportunities/{id}/parties  upsert a party
 *    DELETE /broker/opportunities/{id}/parties/{partyId}
 *    POST   /broker/opportunities/{id}/submit
 *    POST   /broker/opportunities/{id}/cancel   { reason }
 *
 *  Admin-side broker + opportunity management lives in admin.js,
 *  alongside the other /admin resources.
 *
 *  Two error shapes matter to callers and are re-thrown untouched
 *  (http.js already attaches `.status` and `.data`):
 *    403 { message, broker_status }        non-active broker
 *    422 { message, conflict:{ held_until } }  duplicate national_id
 *
 *  Commission, wallet, and opportunity→project conversion are NOT
 *  in this sprint — don't add speculative endpoints here.
 * ============================================================ */

/* Drop undefined/empty keys so we never send `owner_email=` and trip
   the BE's `nullable|email` rule on an empty string. */
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

export const brokers = {
  /**
   * GET /api/brokers/lookup?identifier=… — PUBLIC, no token.
   *
   * Used before showing the "you were referred by X" banner on the
   * registration form. Resolves to `{ valid:false }` rather than
   * throwing on 404/422: an unknown identifier is an expected
   * outcome (stale link, typo, someone else's cookie), not an error
   * the UI should surface. See "Silent-fail on unknown identifier".
   *
   * @param {string} identifier e.g. '260703R42'
   * @returns {Promise<{ valid:boolean, name:string|null }>}
   */
  async lookup(identifier) {
    if (!identifier) return { valid: false, name: null };
    try {
      const res = await http.get('/brokers/lookup', {
        params: { identifier },
      });
      // 200 → { valid:true, broker:{ identifier, name } }
      return {
        valid: res?.valid === true,
        name: res?.broker?.name ?? null,
      };
    } catch {
      // 404 (unknown / not a broker / not active) and 422 (missing
      // param) both mean "don't show the banner" — never block the
      // registration form over a referral code.
      return { valid: false, name: null };
    }
  },

  opportunities: {
    /**
     * GET /api/broker/opportunities — the signed-in broker's own.
     * @param {{ status?, page?, per_page? }} filters
     */
    async list(filters = {}) {
      const params = strip({
        status: filters.status,
        page: filters.page,
        per_page: filters.per_page,
      });
      return unwrapPage(await http.get('/broker/opportunities', { params }));
    },

    /** GET /api/broker/opportunities/:id */
    async get(id) {
      return unwrap(await http.get(`/broker/opportunities/${id}`));
    },

    /**
     * POST /api/broker/opportunities — creates the draft AND its
     * project_owner party in one call. The owner is required here;
     * the optional executor is added afterwards via addParty().
     *
     * @param {{ title, description?, owner_name, owner_national_id?,
     *           owner_phone?, owner_email?, owner_notes? }} payload
     */
    async create(payload) {
      const body = strip({
        title: payload.title,
        description: payload.description,
        owner_name: payload.owner_name,
        owner_national_id: payload.owner_national_id,
        owner_phone: payload.owner_phone,
        owner_email: payload.owner_email,
        owner_notes: payload.owner_notes,
      });
      return unwrap(await http.post('/broker/opportunities', body));
    },

    /** PATCH /api/broker/opportunities/:id — draft only. */
    async update(id, payload) {
      const body = strip({
        title: payload.title,
        description: payload.description,
      });
      return unwrap(await http.patch(`/broker/opportunities/${id}`, body));
    },

    /**
     * POST /api/broker/opportunities/:id/parties — UPSERT by role.
     * Posting role='project_owner' REPLACES the existing owner;
     * role='executor' adds (or replaces) the single executor.
     * Returns the whole opportunity with both parties.
     *
     * @param {number|string} id
     * @param {{ role, name, national_id?, phone?, email?, notes? }} party
     */
    async addParty(id, party) {
      const body = strip({
        role: party.role,
        name: party.name,
        national_id: party.national_id,
        phone: party.phone,
        email: party.email,
        notes: party.notes,
      });
      return unwrap(await http.post(`/broker/opportunities/${id}/parties`, body));
    },

    /** DELETE /api/broker/opportunities/:id/parties/:partyId */
    async removeParty(id, partyId) {
      return unwrap(
        await http.delete(`/broker/opportunities/${id}/parties/${partyId}`)
      );
    },

    /**
     * POST /api/broker/opportunities/:id/submit
     *
     * Throws on 422 when the owner's national_id is already held by
     * another broker. The caller should read `err.data.conflict.held_until`
     * and show when the existing hold lapses — the BE deliberately
     * withholds WHICH broker holds it.
     */
    async submit(id) {
      return unwrap(await http.post(`/broker/opportunities/${id}/submit`));
    },

    /** POST /api/broker/opportunities/:id/cancel  { reason } */
    async cancel(id, reason) {
      return unwrap(
        await http.post(`/broker/opportunities/${id}/cancel`, { reason })
      );
    },
  },
};

/* Reads the duplicate-hold conflict off a rejected submit(). Returns
   null for any other failure so callers can fall through to their
   generic error branch. */
export function readHoldConflict(err) {
  const heldUntil = err?.data?.conflict?.held_until;
  return heldUntil ? { heldUntil } : null;
}

/* Reads the broker_status the BE attaches to a 403 from any broker
   endpoint, so the UI can bounce to the right status screen instead
   of showing a generic "forbidden". */
export function readBrokerStatusDenial(err) {
  if (err?.status !== 403) return null;
  return err?.data?.broker_status ?? null;
}
