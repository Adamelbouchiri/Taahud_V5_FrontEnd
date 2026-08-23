import { useEffect, useState } from 'react';
import { brokers } from '../services';
import {
  BROKER_REFERRAL_PARAM,
  BROKER_REFERRAL_KEY,
  BROKER_REFERRAL_DAYS,
} from '../config/brokerConstants';

/* ============================================================
 *  useBrokerReferral — capture and validate the broker who
 *  referred this visitor.
 *  ----------------------------------------------------------------
 *  Covers method B from BROKER_SYSTEM_INTEGRATION.md: the broker
 *  shares `taahud.sa/register?broker=260703R42`. The identifier has
 *  to survive the visitor bouncing through the landing page and
 *  coming back later, so it is persisted for 30 days.
 *
 *  Returns:
 *    identifier  what to send as `broker_identifier` on register —
 *                the RAW stored value, even when validation failed.
 *    broker      { name } once the lookup confirms an ACTIVE broker;
 *                null otherwise. Only render the banner when set.
 *    clear()     forget the referral (the user dismissed the banner).
 *
 *  Deliberately silent on failure. An unknown, non-broker, or
 *  non-active identifier must never block registration or show an
 *  error — the BE ignores a bad `broker_identifier` and registers
 *  the user with referred_by_broker_user_id: null. We still SEND
 *  the raw value so the BE stays the single source of truth on
 *  whether a referral counts.
 *
 *  localStorage rather than a cookie: the app has no cookie helper
 *  and nothing server-rendered needs to read this. Every access is
 *  wrapped — Safari private mode throws on write.
 * ============================================================ */

function readStored() {
  try {
    const raw = localStorage.getItem(BROKER_REFERRAL_KEY);
    if (!raw) return null;
    const { identifier, expires } = JSON.parse(raw);
    if (!identifier || (expires && Date.now() > expires)) {
      localStorage.removeItem(BROKER_REFERRAL_KEY);
      return null;
    }
    return identifier;
  } catch {
    return null;
  }
}

function writeStored(identifier) {
  try {
    localStorage.setItem(
      BROKER_REFERRAL_KEY,
      JSON.stringify({
        identifier,
        expires: Date.now() + BROKER_REFERRAL_DAYS * 24 * 60 * 60 * 1000,
      })
    );
  } catch {
    // Private browsing — the in-memory value still covers this visit.
  }
}

function clearStored() {
  try {
    localStorage.removeItem(BROKER_REFERRAL_KEY);
  } catch {
    /* nothing to do */
  }
}

export default function useBrokerReferral() {
  // Seed from storage so a returning visitor keeps their referral
  // even when the URL no longer carries ?broker=.
  const [identifier, setIdentifier] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(
      BROKER_REFERRAL_PARAM
    );
    if (fromUrl) {
      writeStored(fromUrl);
      return fromUrl;
    }
    return readStored();
  });
  const [broker, setBroker] = useState(null);

  useEffect(() => {
    if (!identifier) {
      setBroker(null);
      return undefined;
    }
    let alive = true;
    brokers.lookup(identifier).then((res) => {
      if (!alive) return;
      // Only an active broker earns the banner. An invalid identifier
      // stays in `identifier` (and in storage) so it still rides along
      // on the register call for the BE to adjudicate.
      setBroker(res.valid ? { name: res.name } : null);
    });
    return () => {
      alive = false;
    };
  }, [identifier]);

  return {
    identifier,
    broker,
    clear() {
      clearStored();
      setIdentifier(null);
      setBroker(null);
    },
  };
}
