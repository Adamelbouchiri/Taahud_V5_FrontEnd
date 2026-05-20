import React from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import Services from '../components/landing/Services';

/* /services — dedicated page that hosts the same audience-tabbed
   Services section previously embedded on the landing page. The
   navbar's "الخدمات" mega-menu items navigate here. */
export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 116 }}>
        <Services />
      </main>
      <Footer />
    </>
  );
}
