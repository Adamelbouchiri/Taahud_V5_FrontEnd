import { useCallback, useEffect, useState } from 'react';
import { brokers } from '../services';
import { onSessionCleared } from '../services/session';

/* ============================================================
 *  useBrokerInbox — what a broker has left waiting on the OWNER.
 *  ----------------------------------------------------------------
 *  Two owner-side queues come out of BROKER_SPRINT2_INTEGRATION.md,
 *  and neither has any other entry point in the UI:
 *
 *    GET /me/pending-drafts              a broker handed over a draft
 *    GET /opportunities/pending-decisions a broker proposed a fee
 *
 *  Both are empty for the overwhelming majority of users — nobody
 *  invited them — so the sidebar links and the dashboard notice they
 *  drive are rendered only when a count is non-zero. That's why this
 *  returns counts rather than the rows: the callers decide whether to
 *  show a door, and the pages behind them fetch their own data.
 *
 *  Failures resolve to zero rather than propagating. A user with no
 *  broker relationship is the normal case, and the platform's other
 *  chrome must not depend on these two calls succeeding.
 *
 *  The two calls are deduped and briefly cached module-side, the same
 *  way auth.me() is: the sidebar and the dashboard home both mount on
 *  a single navigation to /dashboard, and without this that's four
 *  requests for two numbers.
 * ============================================================ */

const TTL_MS = 30_000;
let cache = null; // last resolved { drafts, fees }
let cachedAt = 0;
let inFlight = null;

/* These counts belong to one user. Any session teardown (logout, a
   401, an account switch, accepting a broker invitation) must drop
   them, or the next user's sidebar shows the previous user's inbox. */
onSessionCleared(() => {
  cache = null;
  cachedAt = 0;
  inFlight = null;
});

/* Read the total off the paginator when it's there and fall back to
   the page length — a non-paginated response still gives a usable
   "is there anything here" answer. */
function countOf(res) {
  if (typeof res?.meta?.total === 'number') return res.meta.total;
  return res?.data?.length ?? 0;
}

function fetchCounts(force) {
  if (!force) {
    if (inFlight) return inFlight;
    if (cache && Date.now() - cachedAt < TTL_MS) return Promise.resolve(cache);
  }

  const request = Promise.all([
    brokers.ownerDrafts.pending({ per_page: 1 }).catch(() => null),
    brokers.opportunities.pendingDecisions({ per_page: 1 }).catch(() => null),
  ])
    .then(([drafts, fees]) => {
      const counts = { drafts: countOf(drafts), fees: countOf(fees) };
      cache = counts;
      cachedAt = Date.now();
      return counts;
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });

  inFlight = request;
  return request;
}

export default function useBrokerInbox({ enabled = true } = {}) {
  const [counts, setCounts] = useState(() => cache || { drafts: 0, fees: 0 });
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(
    (force = false) => {
      if (!enabled) {
        setLoading(false);
        return undefined;
      }
      let cancelled = false;
      setLoading(true);
      fetchCounts(force)
        .then((res) => {
          if (!cancelled) setCounts(res);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [enabled]
  );

  useEffect(() => load(), [load]);

  return {
    counts,
    loading,
    total: counts.drafts + counts.fees,
    refresh: () => load(true),
  };
}
