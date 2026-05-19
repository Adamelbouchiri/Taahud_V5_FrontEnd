import React from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import IntegratedPlatform from '../components/landing/IntegratedPlatform';
import Services from '../components/landing/Services';
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
 *    Hero → IntegratedPlatform → Services → FeaturedProjects
 *      → Arenas → Testimonials → Plans → GuaranteeStrip
 *      → CtaBanner → GetStarted → Footer
 *
 *  IntegratedPlatform sits right under the Hero so the
 *  "what is Taahud, exactly?" answer is immediately visible.
 *  GuaranteeStrip slots between Plans and the conversion CTA to
 *  soften the pricing reveal with the refund promise.
 *  GetStarted replaces the older UpcomingFeatures block —
 *  same audience (Academy + affiliate) but interactive:
 *  email-capture on Academy, sign-up CTA on Affiliate.
 * ============================================================ */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <IntegratedPlatform />
        <Services />
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
