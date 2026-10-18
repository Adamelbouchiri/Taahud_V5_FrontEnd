import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Partners from '../components/landing/Partners';
import HowItWorks from '../components/landing/HowItWorks';
import RoleServices from '../components/landing/RoleServices';
import FeaturedProjects from '../components/landing/FeaturedProjects';
import Testimonials from '../components/landing/Testimonials';
import Plans from '../components/landing/Plans';
import RasdSection from '../components/landing/RasdSection';
import CtaBanner from '../components/landing/CtaBanner';
import GetStarted from '../components/landing/GetStarted';
import Footer from '../components/landing/Footer';

/* ============================================================
 *  LandingPage — public marketing page
 *  ----------------------------------------------------------------
 *  Order:
 *    Hero → Partners → HowItWorks → RoleServices → RasdSection
 *      → FeaturedProjects → Plans → Testimonials
 *      → CtaBanner → GetStarted (affiliate band) → Footer
 *
 *  Services, Contact, About, Pricing and FAQ live on dedicated
 *  routes — reached from the navbar and footer.
 * ============================================================ */

export default function LandingPage() {
  // When the landing page mounts (or its hash changes), scroll to
  // the section named in the URL hash. Cross-page links from
  // /about or /contact bounce here with "/#rasd" etc.
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
        <HowItWorks />
        <RoleServices />
        <RasdSection />
        <FeaturedProjects />
        <Plans />
        <Testimonials />
        <CtaBanner />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}
