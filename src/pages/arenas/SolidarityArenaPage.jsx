import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/solidarity — ساحة التضامن
   Contractor-to-contractor cooperation. Viewable by contractors only. */
export default function SolidarityArenaPage() {
  return (
    <RequireArenaAccess arena="solidarity">
      <PublicProjectsPage arenaSlug="solidarity" />
    </RequireArenaAccess>
  );
}
