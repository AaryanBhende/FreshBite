import React from 'react';
import { Link } from 'react-router-dom';

export default function Favorites() {
  return (
    <main style={{ paddingTop: '4.5rem' }}>
      <section className="Fresh-Favorites" id="menu">
        <header className="section-header">
          <h2>Fresh Favorites</h2>
          <p>Curated selections from our seasonal menu, designed to nourish and delight.</p>
        </header>
        <div className="menu-grid">
          <article className="Menu-Item-1">
            <img alt="Avocado Egg Toast" src="/assets/images/Avocado-Egg-Toast.png" />
            <h3>Avocado Harvest Toast</h3>
            <p>Smashed avocado, poached egg, microgreens.</p>
          </article>
          <article className="Menu-Item-2">
            <img alt="Acai Bowl" src="/assets/images/Acai-Bowl.png" />
            <h3>
              Signature Acai Bowl<span>Vegan</span>
            </h3>
            <p>Granola, seasonal berries, honey drizzle.</p>
          </article>
          <article className="Menu-Item-3">
            <img alt="Latte and Croissant" src="/assets/images/Latte-Croissant.png" />
            <h3>Artisan Latte &amp; Croissant</h3>
            <p>Freshly brewed coffee with a buttery croissant.</p>
          </article>
        </div>
        <div className="menu-cta">
          <Link to="/menu">
            <button type="button">View Full Menu</button>
          </Link>
        </div>
      </section>
    </main>
  );
}