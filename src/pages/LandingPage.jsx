import React from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Services from '../components/landing/Services';
import FeaturedProjects from '../components/landing/FeaturedProjects';
import Arenas from '../components/landing/Arenas';
import Testimonials from '../components/landing/Testimonials';
import Plans from '../components/landing/Plans';
import CtaBanner from '../components/landing/CtaBanner';
import UpcomingFeatures from '../components/landing/UpcomingFeatures';
import Footer from '../components/landing/Footer';

/* ============================================================
 *  LandingPage — public marketing page
 *  ----------------------------------------------------------------
 *  Order matches the navbar links:
 *    Hero → Services → FeaturedProjects → Arenas → Testimonials
 *      → Plans → CtaBanner → UpcomingFeatures → Footer
 *
 *  Stats are baked into the Hero (no separate section anymore).
 *  Old "About" and "Contact" sections were dropped — the new
 *  Arenas section + Footer contact column cover the same ground.
 *  UpcomingFeatures sits right before Footer to tease the next
 *  wave of features (Academy + affiliate marketing) without
 *  disrupting the conversion CTA above it.
 * ============================================================ */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <FeaturedProjects />
        <Arenas />
        <Testimonials />
        <Plans />
        <CtaBanner />
        <UpcomingFeatures />
      </main>
      <Footer />
    </>
  );
}
