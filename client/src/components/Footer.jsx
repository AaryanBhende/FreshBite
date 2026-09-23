import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <h3>FreshBite Cafe</h3>
      <nav className="footer-links">
        <Link to="#">Privacy Policy</Link>
        <Link to="#">Terms of Service</Link>
        <Link to="#">Instagram</Link>
        <Link to="#">Facebook</Link>
      </nav>
      <p className="copyright">© 2026 FreshBite Cafe. Nourishing your urban lifestyle.</p>
    </footer>
  );
}