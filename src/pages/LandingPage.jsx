import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Partners from '../components/landing/Partners';
import IntegratedPlatform from '../components/landing/IntegratedPlatform';
import FeaturedProjects from '../components/landing/FeaturedProjects';
import Arenas from '../components/landing/Arenas';
import Testimonials from '../components/landing/Testimonials';
import Plans from '../components/landing/Plans';
import GuaranteeStrip from '../components/landing/GuaranteeStrip';
import CtaBanner from '../components/landing/CtaBanner';
import GetStarted from '../components/landing/GetStarted';
import Footer from '../components/landing/Footer';

/* ============================================================
 *  LandingPage — public marketing page
 *  ----------------------------------------------------------------
 *  Order:
 *    Hero → Partners → IntegratedPlatform → FeaturedProjects
 *      → Arenas → Testimonials → Plans → GuaranteeStrip
 *      → CtaBanner → GetStarted → Footer
 *
 *  Services and Contact were extracted out to dedicated routes
 *  (/services and /contact) — reached via the navbar mega menu
 *  and the "تواصل معنا" link respectively.
 * ============================================================ */

export default function LandingPage() {
  // When the landing page mounts (or its hash changes), scroll to
  // the section named in the URL hash. Cross-page links from
  // /services or /contact bounce here with "/#platform" etc.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    requestAnimationFrame(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [hash]);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Partners />
        <IntegratedPlatform />
        <FeaturedProjects />
        <Arenas />
        <Testimonials />
        <Plans />
        <GuaranteeStrip />
        <CtaBanner />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}
