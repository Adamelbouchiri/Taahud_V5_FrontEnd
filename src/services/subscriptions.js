import http from './http';

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
  async listPlans() {
    const res = await http.get('/plans');
    return Array.isArray(res?.plans) ? res.plans : [];
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
  async getStatus() {
    return http.get('/subscriptions/me');
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
    return http.post(`/subscriptions/${subscriptionId}/cancel`);
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
      status = await this.getStatus().catch(() => null);
      if (status?.active_subscriptions?.length > 0) return status;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    return status;
  },
};
