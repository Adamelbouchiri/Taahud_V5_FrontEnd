import { LEADS_SHEET_URLS } from '../config/constants';

/* ============================================================
 *  submitLead — send a landing-page lead email to the Google
 *  Sheet backing endpoint (a Google Apps Script Web App).
 *  ----------------------------------------------------------------
 *  Apps Script Web Apps don't return CORS headers, so a normal
 *  fetch would be blocked from reading the response. We POST with
 *  mode: 'no-cors' — the request still reaches the script and the
 *  row is appended; we just can't read what comes back (which we
 *  don't need). The body is sent as text/plain to avoid a CORS
 *  preflight that Apps Script would reject.
 *
 *  `source` marks which card the email came from ('academy' |
 *  'affiliate') and also selects which sheet endpoint to POST to
 *  (see LEADS_SHEET_URLS) — each source has its own sheet.
 *
 *  We also send an ISO `timestamp` (visitor's clock). The Apps
 *  Script can log this, but recording `new Date()` server-side is
 *  more reliable — see the doPost snippet in the constants file.
 *
 *  Returns true if the request was dispatched, false if there's
 *  no endpoint configured or the network call threw. The caller
 *  flips the UI to a thank-you state regardless — we don't want a
 *  transient network hiccup to look like a hard failure to the
 *  visitor.
 * ============================================================ */
export async function submitLead(email, source) {
  const url = LEADS_SHEET_URLS[source];
  if (!url) return false;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ email, source, timestamp: new Date().toISOString() }),
    });
    return true;
  } catch {
    return false;
  }
}
