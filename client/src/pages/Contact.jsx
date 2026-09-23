import React from 'react';
import ContactForm from '../components/ContactForm';

export default function Contact() {
  return (
    <main style={{ paddingTop: '4.5rem' }}>
      <section className="Find-Us-Section" id="find-us">
        <div className="find-us-card">
          <ContactForm />
          <figure className="map-container">
            <img alt="Market Street District FreshBite Location Map" src="/assets/images/Map.png" className="map-image" />
          </figure>
        </div>
      </section>
    </main>
  );
}