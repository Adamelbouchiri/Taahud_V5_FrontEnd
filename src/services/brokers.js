import http from './http';

/* ============================================================
 *  BROKERS SERVICE — the broker workspace + the public referral
 *  lookup.
 *  ----------------------------------------------------------------
 *  Sprint 1 (BROKER_SYSTEM_INTEGRATION.md):
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
 *  Sprint 2 (BROKER_SPRINT2_INTEGRATION.md) — fee negotiation,
 *  Method-D invitations and project drafts:
 *
 *    POST   /broker/opportunities/{id}/propose-fee     broker
 *    POST   /broker/opportunities/{id}/fee-response    broker
 *    POST   /opportunities/{id}/fee-decision           owner
 *    GET    /opportunities/pending-decisions           owner
 *
 *    POST   /broker/opportunities/{id}/invitation      broker
 *    DELETE /broker/opportunities/{id}/invitation      broker
 *    GET    /invitations/{token}                       public
 *    POST   /invitations/{token}/accept                public → auth.js
 *
 *    POST   /broker/opportunities/{id}/draft-project   broker
 *    GET    /broker/projects/drafts                    broker
 *    GET    /broker/projects/{id}                      broker
 *    PATCH  /broker/projects/{id}                      broker
 *    POST   /broker/projects/{id}/hand-off             broker
 *    GET    /me/pending-drafts                         owner
 *    PATCH  /me/drafts/{id}                            owner
 *    POST   /me/drafts/{id}/publish                    owner
 *
 *  `POST /invitations/{token}/accept` lives in auth.js, not here: it
 *  creates an account and returns a bearer token, so it has to install
 *  a session — and session installation is auth.js's job.
 *
 *  Auto-link has no endpoint. Any project the referred owner creates
 *  within 90 days of accepting the invitation comes back with `broker`
 *  populated on the ProjectResource; nothing to call.
 *
 *  Admin-side broker + opportunity management lives in admin.js,
 *  alongside the other /admin resources.
 *
 *  Three error shapes matter to callers and are re-thrown untouched
 *  (http.js already attaches `.status` and `.data`):
 *    403 { message, broker_status }            non-active broker
 *    422 { message, conflict:{ held_until } }  duplicate national_id
 *    410 { message, status }                   dead invitation token
 *
 *  Commission and the broker wallet are NOT in this sprint — don't add
 *  speculative endpoints here.
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

/* ------------------------------------------------------------------
 *  Draft-project payloads
 * ------------------------------------------------------------------
 *  A draft lives in the `projects` table, so its body is the ordinary
 *  project shape. Unlike strip() this keeps keys the caller actually
 *  supplied and turns a blank string into an explicit null — otherwise
 *  clearing an optional field (a description the owner wants gone)
 *  would be impossible over PATCH.
 *
 *  `budget` is coerced to a number because the form holds it as text.
 * ------------------------------------------------------------------ */
const DRAFT_FIELDS = [
  'name',
  'type',
  'arena',
  'city',
  'budget',
  'description',
  'scope',
  'start_date',
  'expected_duration',
  'experience',
  'is_started_externally',
];

function draftBody(payload = {}) {
  const out = {};
  for (const key of DRAFT_FIELDS) {
    if (!(key in payload)) continue;
    const v = payload[key];
    if (key === 'budget') {
      out.budget = v === '' || v === null || v === undefined ? null : Number(v);
    } else if (key === 'is_started_externally') {
      out.is_started_externally = !!v;
    } else {
      out[key] = v === '' || v === undefined ? null : v;
    }
  }
  return out;
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

    /* ============================================================
     *  Fee negotiation — three calls, two actors.
     *  ----------------------------------------------------------------
     *  broker  proposeFee     not_set | rejected  → pending_owner_decision
     *  owner   decideFee      pending_owner_decision → approved | counter_proposed
     *  broker  respondToFee   counter_proposed   → approved | rejected
     *
     *  Only ONE counter round is allowed, and the owner may only
     *  counter DOWNWARDS. A broker rejection keeps the hold — the
     *  opportunity stays reserved and the broker can propose again.
     *  Calling any of these in the wrong state is a 422 carrying the
     *  BE's Arabic explanation, which the UI shows as-is.
     * ============================================================ */

    /** POST /api/broker/opportunities/:id/propose-fee — 0.5…5.0 */
    async proposeFee(id, feePercent) {
      return unwrap(
        await http.post(`/broker/opportunities/${id}/propose-fee`, {
          fee_percent: Number(feePercent),
        })
      );
    },

    /**
     * POST /api/broker/opportunities/:id/fee-response
     * @param {'accept'|'reject'} decision
     */
    async respondToFee(id, decision) {
      return unwrap(
        await http.post(`/broker/opportunities/${id}/fee-response`, { decision })
      );
    },

    /**
     * POST /api/opportunities/:id/fee-decision — OWNER side, so the
     * path deliberately has no /broker prefix.
     *
     * A counter must be strictly lower than the broker's proposal; the
     * BE rejects anything higher with a 422. Note the 404 on a
     * non-invited caller is deliberate (it hides the opportunity's
     * existence) — treat it as "not yours", not as "deleted".
     *
     * @param {'approve'|'counter'} decision
     * @param {number} [counterFeePercent] required when countering
     */
    async decideFee(id, decision, counterFeePercent) {
      const body = { decision };
      if (decision === 'counter') {
        body.counter_fee_percent = Number(counterFeePercent);
      }
      return unwrap(await http.post(`/opportunities/${id}/fee-decision`, body));
    },

    /**
     * GET /api/opportunities/pending-decisions — OWNER side.
     * Opportunities where the signed-in user is the invited owner and
     * a fee decision is waiting on them. Drives the inbox badge.
     */
    async pendingDecisions(filters = {}) {
      const params = strip({
        page: filters.page,
        per_page: filters.per_page,
      });
      return unwrapPage(
        await http.get('/opportunities/pending-decisions', { params })
      );
    },
  },

  /* ============================================================
   *  INVITATIONS — Method D (copy the URL and send it yourself).
   *  ----------------------------------------------------------------
   *  One invitation per opportunity, valid 7 days. There is no
   *  resend: cancel the pending one and create a new invitation.
   *  An expired/cancelled invitation is replaced automatically by
   *  create(); an ACCEPTED one can't be replaced at all (422).
   * ============================================================ */
  invitations: {
    /**
     * POST /api/broker/opportunities/:id/invitation
     * @param {{ invitee_name, invitee_phone?, invitee_email?,
     *           invitee_notes? }} payload
     * @returns {Promise<{ message, invitation }>} invitation carries
     *   `token` and a FE-relative `accept_url` (/invitations/{token}).
     */
    async create(opportunityId, payload) {
      const body = strip({
        invitee_name: payload.invitee_name,
        invitee_phone: payload.invitee_phone,
        invitee_email: payload.invitee_email,
        invitee_notes: payload.invitee_notes,
      });
      return http.post(
        `/broker/opportunities/${opportunityId}/invitation`,
        body
      );
    },

    /** DELETE /api/broker/opportunities/:id/invitation — pending only. */
    async cancel(opportunityId) {
      return http.delete(`/broker/opportunities/${opportunityId}/invitation`);
    },

    /**
     * GET /api/invitations/:token — PUBLIC, no token attached.
     *
     * Resolves to a discriminated result instead of throwing, because
     * every failure here is a page state the invitee needs to SEE:
     *
     *   { valid:true,  invitation }             200
     *   { valid:false, reason:'gone', status }  410 expired/cancelled/used
     *   { valid:false, reason:'missing' }       404 unknown token
     *   { valid:false, reason:'error', message} anything else
     */
    async show(token) {
      try {
        const res = await http.get(`/invitations/${encodeURIComponent(token)}`);
        return { valid: true, invitation: res?.invitation ?? res?.data ?? null };
      } catch (err) {
        if (err?.status === 410) {
          return {
            valid: false,
            reason: 'gone',
            status: err?.data?.status || 'expired',
            message: err.message,
          };
        }
        if (err?.status === 404) {
          return { valid: false, reason: 'missing', message: err.message };
        }
        return { valid: false, reason: 'error', message: err.message };
      }
    },
  },

  /* ============================================================
   *  DRAFTS — broker side.
   *  ----------------------------------------------------------------
   *  A draft is a real Project with status='draft', invisible in every
   *  public listing. It has two phases, told apart by
   *  `draft_ready_for_owner_at`:
   *
   *    null      → broker holds it; broker edits, owner can't see it
   *    not null  → owner holds it; broker is locked out of edits
   *
   *  create() needs all three prerequisites met (accepted invitation,
   *  approved fee, no existing draft) or the BE answers 422 with the
   *  reason — see canCreateDraft() in config/brokerConstants.js, which
   *  gates the button so that 422 stays a backstop.
   * ============================================================ */
  drafts: {
    /** POST /api/broker/opportunities/:id/draft-project */
    async create(opportunityId, payload) {
      return unwrap(
        await http.post(
          `/broker/opportunities/${opportunityId}/draft-project`,
          draftBody(payload)
        )
      );
    },

    /** GET /api/broker/projects/drafts — in-progress AND handed off. */
    async list(filters = {}) {
      const params = strip({
        page: filters.page,
        per_page: filters.per_page,
      });
      return unwrapPage(await http.get('/broker/projects/drafts', { params }));
    },

    /** GET /api/broker/projects/:id */
    async get(id) {
      return unwrap(await http.get(`/broker/projects/${id}`));
    },

    /** PATCH /api/broker/projects/:id — 422 once handed off. */
    async update(id, payload) {
      return unwrap(
        await http.patch(`/broker/projects/${id}`, draftBody(payload))
      );
    },

    /**
     * POST /api/broker/projects/:id/hand-off — one-way and one-time.
     * After this the owner edits and publishes; the broker can only
     * watch. A second call is a 422.
     */
    async handOff(id) {
      return unwrap(await http.post(`/broker/projects/${id}/hand-off`));
    },
  },

  /* ============================================================
   *  DRAFTS — owner side.
   *  ----------------------------------------------------------------
   *  The owner may edit ANY field before publishing (per the COO:
   *  "it's their project ultimately"). Publishing moves the project to
   *  pending_review and marks the opportunity converted; the broker
   *  attribution and the agreed fee ride along untouched.
   * ============================================================ */
  ownerDrafts: {
    /** GET /api/me/pending-drafts — handed off, waiting on the owner. */
    async pending(filters = {}) {
      const params = strip({
        page: filters.page,
        per_page: filters.per_page,
      });
      return unwrapPage(await http.get('/me/pending-drafts', { params }));
    },

    /**
     * One handed-off draft, read out of the pending list.
     *
     * There is no GET /me/drafts/{id} in the API, and the list is
     * short by nature (a broker hands off one project at a time), so
     * the editor filters the list rather than inventing an endpoint.
     * Resolves to null when the id isn't in it — which also covers the
     * "still with the broker" case the owner isn't allowed to see yet.
     */
    async get(id) {
      const { data } = await brokers.ownerDrafts.pending({ per_page: 100 });
      return data.find((d) => String(d.id) === String(id)) || null;
    },

    /** PATCH /api/me/drafts/:id — handed-off drafts only. */
    async update(id, payload) {
      return unwrap(await http.patch(`/me/drafts/${id}`, draftBody(payload)));
    },

    /** POST /api/me/drafts/:id/publish — draft → pending_review. */
    async publish(id) {
      return unwrap(await http.post(`/me/drafts/${id}/publish`));
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
