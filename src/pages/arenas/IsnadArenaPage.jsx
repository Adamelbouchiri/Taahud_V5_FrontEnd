import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/isnad — ساحة إسناد
   Large/financed projects. Paywalled — requires the isnad_addon
   subscription in addition to having an eligible role (developer /
   contractor / engineering). */
export default function IsnadArenaPage() {
  return (
    <RequireArenaAccess arena="isnad">
      {/* RequireArenaAccess has already verified إسناد access (role +
          paid add-on) before rendering, so the inner page must not
          re-run the paywall gate — pass accessGranted to skip it. */}
      <PublicProjectsPage arenaSlug="isnad" accessGranted />
    </RequireArenaAccess>
  );
}
