import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isPhoneVerified } from '../services/auth';
import { OTP_ENABLED } from '../config/constants';

/* ============================================================
 *  RequireVerified
 *  ----------------------------------------------------------------
 *  A cheap, synchronous guard layered on top of RequireAuth for every
 *  platform route EXCEPT /otp itself. If the user's phone isn't
 *  verified, bounce them to /otp instead of letting them into the
 *  platform — this closes the back-button bypass where a freshly
 *  logged-in (but unverified) user could navigate back into the app.
 *
 *  Reads the verification snapshot that services/session.js persists
 *  alongside the token at login/register/verify time. The BE's
 *  phone-verified middleware is the authoritative gate; this guard
 *  just keeps the UI from rendering for unverified users, and the
 *  http.js 403 interceptor catches anything that slips past the
 *  snapshot (e.g. verification revoked server-side mid-session).
 *
 *  Stack ORDER in App.jsx: RequireAuth → RequireVerified → (page).
 *  Without a token RequireAuth sends the user to /login first; with a
 *  token but no verification, RequireVerified sends them to /otp.
 *
 *  IMPORTANT: never wrap the /otp route with this guard — that would
 *  redirect /otp → /otp forever. /otp uses RequireAuth alone.
 *
 *  When OTP is globally disabled (OTP_ENABLED === false) this guard is
 *  a no-op, matching OtpPage's own short-circuit to /dashboard.
 * ============================================================ */
export default function RequireVerified({ children }) {
  const location = useLocation();

  if (OTP_ENABLED && !isPhoneVerified()) {
    return (
      <Navigate
        to="/otp"
        replace
        state={{
          from: location.pathname + location.search,
          reason: 'phone-unverified',
        }}
      />
    );
  }

  return children;
}
