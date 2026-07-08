import { useCallback, useEffect, useState } from 'react';
import { features as featuresApi, deriveCheck } from '../services/features';

/* ============================================================
 *  useFeatures
 *  ----------------------------------------------------------------
 *  Loads the current user's feature entitlement snapshot from
 *  GET /me/features (see FEATURE_GATING_INTEGRATION.md) and exposes
 *  it, plus a synchronous `can()` helper derived from the snapshot.
 *
 *  Why derive checks locally instead of calling /me/features/check?
 *  The snapshot already carries limit/used/remaining/granted for
 *  every feature the user has, so a proactive "can I use this?"
 *  answer needs no extra round-trip. The /check endpoint stays
 *  available via features.check() for flows that want a guaranteed
 *  fresh read right before submit.
 *
 *  Returns:
 *    features  — code→entry map (raw snapshot `data`). Only lists
 *                features the user actually has.
 *    meta      — { has_active_subscription, is_on_trial, ... }.
 *    loading   — true until the first fetch resolves. Gate action
 *                buttons on this so they don't flash enabled.
 *    error     — the last fetch error (or null). The snapshot fails
 *                CLOSED: on error `can()` reports no access.
 *    refresh   — re-fetch (call after a checkout completes).
 *    can(code) — { has_feature, can_use, type, limit, used,
 *                  remaining, resets_at, label_ar, label_en } for a
 *                family code, matching the /check response shape.
 *
 *  Mirrors useArenaAddons' fetch-per-mount + refresh contract.
 * ============================================================ */
export default function useFeatures() {
  const [features, setFeatures] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((force = false) => {
    let cancelled = false;
    setLoading(true);
    featuresApi
      .getAll({ force })
      .then(({ data, meta: m }) => {
        if (cancelled) return;
        setFeatures(data);
        setMeta(m);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        // Fail closed — treat an unreadable snapshot as "no features".
        setFeatures({});
        setMeta({});
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  const can = useCallback((code) => deriveCheck(features[code]), [features]);
  // refresh() bypasses the service cache — call it after a checkout so
  // freshly-granted features show up immediately.
  const refresh = useCallback(() => load(true), [load]);

  return { features, meta, loading, error, refresh, can };
}
