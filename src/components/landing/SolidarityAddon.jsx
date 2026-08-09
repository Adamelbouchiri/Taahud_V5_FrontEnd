import React from 'react';
import { useNavigate } from 'react-router-dom';
import SolidarityAddonCard from '../SolidarityAddonCard';
import { hasToken } from '../../services/session';

/* ============================================================
 *  SolidarityAddon — landing section
 *  ----------------------------------------------------------------
 *  Marketing showcase for the التضامن (solidarity) arena add-on.
 *  The card itself is shared with the dashboard subscribe page; here
 *  the CTAs route a marketing visitor into the funnel.
 * ============================================================ */
export default function SolidarityAddon() {
  const navigate = useNavigate();
  // Signed-in visitors go straight to checkout; guests enter the
  // sign-up funnel first (mirrors the plans-grid CTAs above).
  const signedIn = typeof window !== 'undefined' && hasToken();
  return (
    <section
      id="solidarity-addon"
      className="relative py-20 lg:py-28 scroll-mt-20"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <SolidarityAddonCard
          onSubscribe={() => navigate(signedIn ? '/subscribe' : '/register')}
          onExplore={() => navigate('/projects/solidarity')}
        />
      </div>
    </section>
  );
}
