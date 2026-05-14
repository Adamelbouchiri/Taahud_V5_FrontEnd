import React from 'react';
import RequireArenaAccess from '../../components/RequireArenaAccess';
import PublicProjectsPage from '../PublicProjectsPage';

/* /projects/arena — ساحة أرينا
   Real-estate developer's project pool. Viewable by developers only. */
export default function DeveloperArenaPage() {
  return (
    <RequireArenaAccess arena="arena">
      <PublicProjectsPage arenaSlug="arena" />
    </RequireArenaAccess>
  );
}
