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

/* ============================================================
 *  submitRasdLead — the رصد callback request from the landing
 *  section.
 *  ----------------------------------------------------------------
 *  A different contract from submitLead() above, because the script
 *  behind LEADS_SHEET_URLS.rasd is a different kind of script:
 *
 *    - it takes the WHOLE lead, not just an email;
 *    - it replies with real JSON — { ok, duplicate } — and serves
 *      `Access-Control-Allow-Origin: *`, so we can actually read the
 *      answer instead of firing into an opaque no-cors void.
 *
 *  `duplicate: true` means this person is already in the sheet. That
 *  is a SUCCESS, not an error — the form says "we already have your
 *  request" rather than pretending it's new or claiming it failed.
 *
 *  The body goes out as application/x-www-form-urlencoded, which
 *  makes it a CORS "simple request": no preflight, and Apps Script
 *  reads the fields straight off `e.parameter`. Sending JSON would
 *  need a Content-Type the browser preflights and Apps Script can't
 *  answer.
 *
 *  Returns a discriminated result instead of throwing — each branch
 *  is a screen the visitor needs to see:
 *    { ok: true,  duplicate: boolean }
 *    { ok: false, reason: 'unconfigured' | 'network' | 'rejected' }
 * ============================================================ */
export async function submitRasdLead(payload) {
  const url = LEADS_SHEET_URLS.rasd;
  if (!url) return { ok: false, reason: 'unconfigured' };

  // Empty optional fields are dropped rather than sent blank, so the
  // sheet gets an empty cell instead of the string "undefined".
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && String(value) !== '') {
      body.append(key, String(value));
    }
  }
  // The visitor's clock. The script should stamp its own server-side
  // time as the authority; this is only useful for spotting a device
  // with a badly wrong date.
  body.append('timestamp', new Date().toISOString());

  try {
    const res = await fetch(url, { method: 'POST', body });
    const data = await res.json().catch(() => null);
    if (data?.ok) return { ok: true, duplicate: data.duplicate === true };
    return { ok: false, reason: 'rejected' };
  } catch {
    // Offline, DNS, or a CORS refusal. Unknowable from here which —
    // all three mean "we can't confirm it landed", so the form says
    // so rather than thanking someone whose lead never arrived.
    return { ok: false, reason: 'network' };
  }
}

/* The sheet should hold one canonical phone shape, not whatever the
   visitor typed. The field accepts the local form people actually
   write (05XXXXXXXX) and this normalizes it to E.164 on the way out:
   05XXXXXXXX / 5XXXXXXXX / +9665XXXXXXXX / 9665XXXXXXXX all become
   +9665XXXXXXXX. Anything else is passed through untouched so a
   foreign number still reaches the sales team intact. */
export function normalizeSaudiPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^9665\d{8}$/.test(digits)) return `+${digits}`;
  return String(raw || '').trim();
}
