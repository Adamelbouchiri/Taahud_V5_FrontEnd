import React from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import ContactUs from '../components/landing/ContactUs';

/* /contact — dedicated page hosting the contact-method cards
   (WhatsApp / sales email / support email / phone). Reached from
   the navbar "تواصل معنا" link. */
export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 116 }}>
        <ContactUs />
      </main>
      <Footer />
    </>
  );
}
