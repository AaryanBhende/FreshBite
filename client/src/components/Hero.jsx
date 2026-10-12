import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="hero-container">
      <article className="hero-text-content">
        <span className="badge">
          <img alt="Leaf Icon" src="/assets/icons/eco.svg" className="badge-icon" />
          Locally Sourced
        </span>
        <h1>Eat Fresh, <span className="green-text">Feel Vibrant</span></h1>
        <p>Nourishing your urban lifestyle with locally sourced, fresh ingredients.</p>
        <div className="hero-actions">
          <Link to="/menu" className="btn-primary">View Menu</Link>
          <Link to="/about" className="btn-secondary">Our Story</Link>
        </div>
      </article>
      <figure className="hero-image-container">
        <img alt="Salad Topped with Grilled Chicken Breast" src="/assets/images/Chicken-Salad.png" />
      </figure>
    </section>
  );
}
