import { useCallback, useEffect, useState } from 'react';
import { features as featuresApi } from '../services/features';
import { subscriptions } from '../services';
import { isSubscriptionActive } from '../services/subscriptions';
import { RASD_FEATURE_CODE, RASD_PLAN_CODES } from '../config/rasdConstants';

/* ============================================================
 *  useRasdEnrollment
 *  ----------------------------------------------------------------
 *  "Does this user already have رصد?" — asked by the dashboard
 *  promo so it can offer a subscription or an entrance, never the
 *  wrong one of the two.
 *
 *  Two sources, either of which counts:
 *
 *    1. GET /me/features → a granted `rasd_access` boolean. The
 *       platform's canonical entitlement snapshot.
 *    2. GET /subscriptions/me → an active subscription on either رصد
 *       plan (standalone or bundled). The fallback for a plan whose
 *       feature rows haven't been wired into the snapshot yet.
 *
 *  Both services are deduped and short-TTL cached, and the dashboard
 *  already calls both (PlanUsage, useArenaAddons), so this hook
 *  normally costs zero extra requests.
 *
 *  IT IS A DISPLAY HINT, NOT A GATE. The real check is the
 *  `rasd.access` middleware, which resolves the ACCOUNT OWNER's
 *  subscription — so once seats exist, a colleague on someone
 *  else's RASD account will read as not-enrolled here while the API
 *  happily serves them. That's why a wrong answer costs a mislabelled
 *  button and nothing more: /rasd is never opened or closed on it.
 *
 *  Fails CLOSED — an unreadable snapshot reads as "not enrolled",
 *  which shows a subscribe CTA rather than a door that 403s.
 *
 *  Returns { enrolled, loading, refresh }.
 * ============================================================ */

function hasRasdFeature(snapshot) {
  const entry = snapshot?.data?.[RASD_FEATURE_CODE];
  if (!entry) return false;
  // Boolean features carry `granted`; anything quota-shaped counts as
  // held the moment it's in the snapshot at all (the snapshot only
  // lists features the user actually has).
  return entry.type === 'boolean' ? entry.granted === true : true;
}

function hasRasdSubscription(status) {
  const subs = status?.active_subscriptions || status?.subscriptions || [];
  return subs.some(
    (s) => RASD_PLAN_CODES.includes(s?.plan?.code) && isSubscriptionActive(s)
  );
}

export default function useRasdEnrollment() {
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback((force = false) => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      featuresApi.getAll({ force }).catch(() => null),
      subscriptions.getStatus({ force }).catch(() => null),
    ])
      .then(([snapshot, status]) => {
        if (cancelled) return;
        setEnrolled(hasRasdFeature(snapshot) || hasRasdSubscription(status));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  return { enrolled, loading, refresh: () => load(true) };
}
