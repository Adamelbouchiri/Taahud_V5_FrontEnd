import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/public — الساحة العامة (نمو)
   Aggregated from external sources (E'timad, Forsa, Muqawil...).
   Viewable by suppliers / contractors / engineering offices. */
export default function PublicArenaPage() {
  return (
    <RequireArenaAccess arena="public">
      <PublicProjectsPage arenaSlug="public" />
    </RequireArenaAccess>
  );
}
