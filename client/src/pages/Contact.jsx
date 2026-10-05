import {useEffect} from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import ContactForm from '../components/ContactForm';

import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure Leaflet marker icon
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Fixed coordinates for Miramar, Panaji, Goa (403001)
const miramarLocation = [15.4800, 73.8080];

export default function Contact() {
  useEffect(() => {
    window.scrollTo({
      top: 70,
      behavior: 'smooth' 
    });
  }, []);

  return (
    <main style={{ paddingTop: '4.5rem' }}>
      <section className="Find-Us-Section" id="find-us">
        <div className="find-us-card">
          <ContactForm />
          
          <figure className="map-container" style={{ position: 'relative', zIndex: 1, overflow: 'hidden' }}>
            <MapContainer
              center={miramarLocation}
              zoom={15}
              scrollWheelZoom={false}
              style={{ width: '100%', height: '100%', minHeight: '350px', borderRadius: '8px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={miramarLocation}>
                <Popup>
                  <strong>FreshBite Cafe</strong>
                  <br />
                  Miramar, Panaji, Goa 403001
                </Popup>
              </Marker>
            </MapContainer>
          </figure>
        </div>
      </section>
    </main>
  );
}