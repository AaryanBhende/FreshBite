import {useEffect} from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import ContactForm from '../components/ContactForm';
import '../assets/style/contact.css';

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
    <main className="contact-page">
      <section className="Find-Us-Section" id="find-us">
        <div className="find-us-card">
          <ContactForm />
          
          <figure className="map-container contact-map-frame">
            <MapContainer
              center={miramarLocation}
              zoom={15}
              scrollWheelZoom={false}
              className="contact-map"
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
