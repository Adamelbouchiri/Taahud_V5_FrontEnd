import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/solidarity — ساحة التضامن
   Cross-discipline cooperation (developer / entrepreneur / engineering).
   Paywalled — requires the solidarity_addon subscription. */
export default function SolidarityArenaPage() {
  return (
    <RequireArenaAccess arena="solidarity">
      {/* RequireArenaAccess already verified access (role + add-on), so
          the inner page must not re-run the paywall gate. */}
      <PublicProjectsPage arenaSlug="solidarity" accessGranted />
    </RequireArenaAccess>
  );
}
