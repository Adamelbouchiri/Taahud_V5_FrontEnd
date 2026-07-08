import { useEffect, useState } from 'react';
import { subscriptions } from '../services';
import { deriveArenaAddons } from '../services/subscriptions';

/* ============================================================
 *  useArenaAddons
 *  ----------------------------------------------------------------
 *  Resolves which add-on-gated arenas the current user can access.
 *
 *  Two arenas are gated behind paid monthly add-ons (see
 *  ARENA_ADDONS_INTEGRATION.md):
 *    isnad       → isnad_addon
 *    solidarity  → solidarity_addon
 *
 *  Ownership is derived from the user's active subscriptions on
 *  /subscriptions/me — the authoritative source (the legacy
 *  user-level has_isnad_upgrade flag isn't reliably populated).
 *
 *  Returns:
 *    addons   — code→boolean map, e.g. { isnad_addon, solidarity_addon }.
 *               Pass this straight into canViewArena / canPostArena /
 *               canApplyArena / defaultBrowseRouteFor.
 *    loading  — true until the status call resolves. Gate UI on this to
 *               avoid gated arenas popping in after first paint.
 *    refresh  — re-fetch (call after a checkout completes).
 *
 *  On a failed/absent status call we default to no add-ons so gates
 *  fail closed.
 * ============================================================ */
export default function useArenaAddons() {
  const [addons, setAddons] = useState({});
  const [loading, setLoading] = useState(true);

  // getStatus() is deduped + short-TTL cached at the service layer, so
  // the several useArenaAddons() mounts on one page share a single
  // /subscriptions/me request. refresh(force) bypasses that cache —
  // call after a checkout so a freshly-bought add-on shows immediately.
  const load = (force = false) => {
    let cancelled = false;
    setLoading(true);
    subscriptions
      .getStatus({ force })
      .then((s) => {
        if (!cancelled) setAddons(deriveArenaAddons(s));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(load, []);

  return { addons, loading, refresh: () => load(true) };
}
