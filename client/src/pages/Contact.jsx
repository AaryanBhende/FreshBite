import { useEffect } from 'react';
import { GoogleMap, InfoWindow, Marker, useLoadScript } from '@react-google-maps/api';
import ContactForm from '../components/ContactForm';
import '../assets/style/contact.css';


// Fixed coordinates for Miramar, Panaji, Goa (403001)
const miramarLocation = { lat: 15.4800, lng: 73.8080 };

export default function Contact() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
  useEffect(() => {
    window.scrollTo({
      top: 70,
      behavior: 'smooth' 
    });
  }, []);

  return (
    <main className="contact-page">
      <section className="Find-Us-Section" id="find-us">
        <div className="find-us-card">
          <ContactForm />
          
          <figure className="map-container contact-map-frame">
            {loadError ? (
              <div className="contact-map map-load-error" role="status">Google Maps could not be loaded.</div>
            ) : isLoaded ? (
              <GoogleMap
                mapContainerClassName="contact-map"
                center={miramarLocation}
                zoom={15}
                options={{ scrollwheel: false, streetViewControl: false, mapTypeControl: false }}
              >
                <Marker position={miramarLocation} title="FreshBite Cafe" />
                <InfoWindow position={miramarLocation}>
                  <div><strong>FreshBite Cafe</strong><br />Miramar, Panaji, Goa 403001</div>
                </InfoWindow>
              </GoogleMap>
            ) : <div className="contact-map map-loading" role="status">Loading map…</div>}
          </figure>
        </div>
      </section>
    </main>
  );
}
