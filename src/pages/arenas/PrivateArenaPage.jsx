import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/private — الساحة الخاصة (عهد)
   Taahud clients' private projects. Viewable by contractors and
   engineering offices. */
export default function PrivateArenaPage() {
  return (
    <RequireArenaAccess arena="private">
      <PublicProjectsPage arenaSlug="private" />
    </RequireArenaAccess>
  );
}
