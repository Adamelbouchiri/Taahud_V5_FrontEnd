import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/isnad — ساحة إسناد
   Large/financed projects. Paywalled — requires has_isnad_upgrade
   in addition to having an eligible role (developer / contractor /
   engineering / financier). */
export default function IsnadArenaPage() {
  return (
    <RequireArenaAccess arena="isnad">
      <PublicProjectsPage arenaSlug="isnad" />
    </RequireArenaAccess>
  );
}
