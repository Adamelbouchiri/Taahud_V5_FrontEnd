import { useCallback, useEffect, useState } from 'react';
import { rasd, readAccessDenial } from '../services/rasd';

/* ============================================================
 *  useRasdSummary
 *  ----------------------------------------------------------------
 *  GET /rasd/summary, shared by every page in the module. The
 *  overview charts it; the projects and companies pages want only
 *  `by_city`, which is where their city dropdown comes from — the
 *  cities list in the doc grows whenever a new region appears in the
 *  data, while by_city is always current and only offers cities that
 *  actually have projects.
 *
 *  Deduped + short-TTL cached the same way services/features.js
 *  caches its snapshot: three pages mounting this on one navigation
 *  should cost one request, and the dataset is a nightly import —
 *  it does not change between two clicks.
 *
 *  Returns:
 *    summary    { totals, by_stage, by_sector, by_city,
 *                 last_updated_at }
 *    loading    true until the first fetch settles
 *    error      the normalized error, or null
 *    denial     the verbatim Arabic message from a 403, or null.
 *               Kept apart from `error` because it isn't a failure
 *               to retry — it's the access gate, and it has its own
 *               screen (RasdAccessNotice).
 *    refresh()  bypass the cache
 * ============================================================ */

const TTL_MS = 60_000;
const cache = { value: null, at: 0, inFlight: null };

export function invalidateRasdSummary() {
  cache.value = null;
  cache.at = 0;
  cache.inFlight = null;
}

function fetchSummary(force) {
  if (!force) {
    if (cache.inFlight) return cache.inFlight;
    if (cache.value != null && Date.now() - cache.at < TTL_MS) {
      return Promise.resolve(cache.value);
    }
  }
  const request = rasd.summary();
  cache.inFlight = request;
  return request
    .then((value) => {
      cache.value = value;
      cache.at = Date.now();
      return value;
    })
    .catch((err) => {
      cache.value = null;
      cache.at = 0;
      throw err;
    })
    .finally(() => {
      if (cache.inFlight === request) cache.inFlight = null;
    });
}

const EMPTY = {
  totals: {},
  by_stage: [],
  by_sector: [],
  by_city: [],
  last_updated_at: null,
};

export default function useRasdSummary() {
  const [summary, setSummary] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [denial, setDenial] = useState(null);

  const load = useCallback((force = false) => {
    let cancelled = false;
    setLoading(true);
    fetchSummary(force)
      .then((value) => {
        if (cancelled) return;
        setSummary(value);
        setError(null);
        setDenial(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSummary(EMPTY);
        setDenial(readAccessDenial(err));
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

  const refresh = useCallback(() => load(true), [load]);

  return { summary, loading, error, denial, refresh };
}
