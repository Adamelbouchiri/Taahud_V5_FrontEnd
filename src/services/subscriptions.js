import http from './http';

/* ============================================================
 *  Arena add-ons
 *  ----------------------------------------------------------------
 *  Two arenas are gated behind a paid monthly add-on (see
 *  ARENA_ADDONS_INTEGRATION.md):
 *
 *    isnad       → isnad_addon       (600 SAR/mo)
 *    solidarity  → solidarity_addon  (799 SAR/mo)
 *
 *  Ownership is derived from the user's active subscriptions. A
 *  subscription unlocks its arena when its status is trialing/active
 *  AND it hasn't expired (current_period_ends_at is null or future).
 * ============================================================ */
export const ARENA_ADDON_CODES = ['isnad_addon', 'solidarity_addon'];

/* True when a subscription row counts as an active add-on grant. */
export function isSubscriptionActive(sub) {
  const status = String(sub?.status || '').toLowerCase();
  if (status !== 'active' && status !== 'trialing') return false;
  const ends = sub?.current_period_ends_at;
  if (ends == null) return true;
  return new Date(ends) > new Date();
}

/* Reduce a /subscriptions/me (or /me) payload to a code→boolean map of
   which arena add-ons the user currently owns, e.g.
   { isnad_addon: true, solidarity_addon: false }. Tolerates either the
   `active_subscriptions` (our /subscriptions/me) or `subscriptions`
   (the /me payload in ARENA_ADDONS_INTEGRATION.md) envelope. */
export function deriveArenaAddons(status) {
  const subs = status?.active_subscriptions || status?.subscriptions || [];
  const map = {};
  for (const code of ARENA_ADDON_CODES) {
    map[code] = subs.some(
      (s) => s?.plan?.code === code && isSubscriptionActive(s)
    );
  }
  return map;
}

/* ============================================================
 *  SUBSCRIPTIONS SERVICE — wired to the real backend.
 *  ----------------------------------------------------------------
 *  Endpoints (all under /api):
 *
 *    GET   /plans                              list plans available
 *                                              for the user's account_type
 *    GET   /subscriptions/me                   trial + active sub status
 *    POST  /subscriptions/checkout             create Stripe checkout session
 *    POST  /subscriptions/:id/cancel           request cancellation
 *
 *  Auth: every call requires a bearer token. http.js's interceptor
 *  attaches it automatically.
 *
 *  Money format: prices come back as decimal strings like "499.00"
 *  (so JS doesn't introduce float drift on the wire). Components
 *  that do arithmetic should parseFloat() first.
 *
 *  Post-checkout flow (the only non-obvious part):
 *    1. createCheckout() → { url, session_id }
 *    2. redirect the browser to `url` (Stripe Checkout)
 *    3. Stripe redirects back to success_url with ?session_id=...
 *    4. The local subscriptions row is NOT updated until Stripe
 *       fires the customer.subscription.created webhook — usually
 *       <1s but can take longer. The success page polls /me until
 *       active_subscriptions is non-empty (see pollUntilActive).
 * ============================================================ */

/* ------------------------------------------------------------------
 *  Request dedupe + short-TTL cache (same play as auth.me()).
 * ------------------------------------------------------------------
 *  getStatus() and listPlans() are called by MANY independent
 *  components on a single navigation — every useArenaAddons() mount
 *  hits getStatus(), and the dashboard alone mounts that hook 4×
 *  (QuickActions, RecentProjects, RecentAssociatedProjects, Sidebar),
 *  plus RequireArenaAccess, ApplyPage, etc. Without coalescing, one
 *  page load fires /subscriptions/me half a dozen times.
 *
 *  We coalesce here:
 *    1. In-flight dedupe — concurrent callers share ONE request.
 *    2. Short TTL cache  — repeats within TTL reuse the last result.
 *
 *  Invalidated on every mutation (checkout, cancel) so it never
 *  serves stale state across a change; pass { force: true } to bypass
 *  (pollUntilActive needs guaranteed-fresh reads). Rejections are
 *  never cached.
 * ------------------------------------------------------------------ */
const SUBS_TTL_MS = 30_000;

function makeCache() {
  return { value: null, at: 0, inFlight: null };
}
const statusCache = makeCache();
const plansCache = makeCache();

function invalidateStatus() {
  statusCache.value = null;
  statusCache.at = 0;
  statusCache.inFlight = null;
}

/* Wrap a fetch thunk with the dedupe + TTL logic against `cache`. */
async function cached(cache, force, fetcher) {
  if (!force) {
    if (cache.inFlight) return cache.inFlight;
    if (cache.value != null && Date.now() - cache.at < SUBS_TTL_MS) {
      return cache.value;
    }
  }
  const request = fetcher();
  cache.inFlight = request;
  try {
    const value = await request;
    cache.value = value;
    cache.at = Date.now();
    return value;
  } catch (err) {
    // Never cache a failure — the next call should retry.
    cache.value = null;
    cache.at = 0;
    throw err;
  } finally {
    if (cache.inFlight === request) cache.inFlight = null;
  }
}

export const subscriptions = {
  /* ============================================================
   *  GET /plans
   *  ----------------------------------------------------------------
   *  Returns plans available for the authenticated user's
   *  account_type (6 base plans × billing periods × tiers, plus
   *  the universal Isnad add-on). `individual` users get an empty
   *  array — they're on the free tier and never need to subscribe.
   *
   *  Response: { plans: Plan[] }
   * ============================================================ */
  async listPlans({ force = false } = {}) {
    return cached(plansCache, force, async () => {
      const res = await http.get('/plans');
      // Accept whatever envelope the BE uses: { plans: [...] } (the
      // documented shape), { data: [...] } (matches every other list
      // endpoint here), or a bare array. Anything else → empty list.
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.plans)) return res.plans;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    });
  },

  /* ============================================================
   *  GET /subscriptions/me
   *  ----------------------------------------------------------------
   *  Returns the user's subscription state:
   *    {
   *      on_trial: boolean,
   *      trial_ends_at: ISO string,
   *      days_left_in_trial: number,
   *      has_access: boolean,         // trial OR active sub
   *      has_isnad_addon: boolean,
   *      active_subscriptions: Subscription[],
   *    }
   *
   *  Call this after login, after the Stripe redirect, and from any
   *  layout that needs gated-feature awareness.
   * ============================================================ */
  async getStatus({ force = false } = {}) {
    return cached(statusCache, force, () => http.get('/subscriptions/me'));
  },

  /* ============================================================
   *  POST /subscriptions/checkout
   *  ----------------------------------------------------------------
   *  Body:
   *    plan_id       integer, required
   *    success_url   absolute URL the user lands on after paying
   *    cancel_url    absolute URL the user lands on if they bail
   *
   *  Returns { url, session_id }. Caller should redirect the
   *  browser to `url` immediately. The local subscriptions table
   *  is NOT updated synchronously — the webhook does that.
   *
   *  Known 422 codes (read err.data.code, not err.message):
   *    already_subscribed     user has an active base sub
   *    addon_already_active   user already owns this add-on
   *  Known 403:
   *    plan not available for the user's account_type
   * ============================================================ */
  async createCheckout({ plan_id, success_url, cancel_url }) {
    // A checkout is about to change subscription state — drop the
    // cached status so the next read (post-redirect) refetches.
    invalidateStatus();
    return http.post('/subscriptions/checkout', {
      plan_id,
      success_url,
      cancel_url,
    });
  },

  /* ============================================================
   *  POST /subscriptions/:id/cancel
   *  ----------------------------------------------------------------
   *  Requests cancellation. `canceled_at` is set immediately so the
   *  UI can show "cancellation pending"; the final status flip
   *  arrives via webhook (usually within a few seconds — callers
   *  typically refresh getStatus() after ~3s).
   * ============================================================ */
  async cancel(subscriptionId) {
    const res = await http.post(`/subscriptions/${subscriptionId}/cancel`);
    // Status just changed (canceled_at set) — drop the cache so the
    // UI's next getStatus() reflects it.
    invalidateStatus();
    return res;
  },

  /* ============================================================
   *  GET /payments/moyasar/checkout/:session
   *  ----------------------------------------------------------------
   *  Fetches the config for our own Moyasar checkout page (the
   *  /pay/:sessionId route). Moyasar has no hosted subscription
   *  checkout like Stripe, so the backend hands us a session id and
   *  we render Moyasar.js's embedded card form ourselves.
   *
   *  Returns (http.js already unwraps response.data):
   *    {
   *      publishable_key: string,   // pk_test_xxx / pk_live_xxx
   *      amount:          number,   // in halalas (1 SAR = 100), pass as-is
   *      currency:        string,   // "SAR"
   *      description:     string,
   *      callback_url:    string,   // set by BE — pass straight to Moyasar
   *      metadata:        object,   // pass straight to Moyasar, unchanged
   *    }
   *
   *  Errors (read err.status):
   *    404  session expired or invalid (sessions live ~30 min)
   *    403  session doesn't belong to the logged-in user
   * ============================================================ */
  async getMoyasarCheckout(sessionId) {
    return http.get(`/payments/moyasar/checkout/${sessionId}`);
  },

  /* ============================================================
   *  Helper — poll getStatus() until the webhook lands.
   *  ----------------------------------------------------------------
   *  Used by the /subscribe/success page. Stripe redirects back
   *  to us BEFORE its webhook fires, so a single getStatus() right
   *  after the redirect will usually show no active sub yet. We
   *  retry on a fixed interval until either:
   *    - active_subscriptions is non-empty (subscription confirmed),
   *    - or we hit the attempt cap (treat as "pending — webhook
   *      delayed", still show success).
   *
   *  Default budget: 10 attempts × 1s = 10s, which covers nearly
   *  every real-world Stripe delivery.
   * ============================================================ */
  async pollUntilActive({ attempts = 10, intervalMs = 1000 } = {}) {
    let status = null;
    for (let i = 0; i < attempts; i++) {
      // Force a fresh read each attempt — we're waiting for the webhook
      // to flip state, so a cached response would defeat the poll.
      status = await this.getStatus({ force: true }).catch(() => null);
      if (status?.active_subscriptions?.length > 0) return status;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    return status;
  },
};
