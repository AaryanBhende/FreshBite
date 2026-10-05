import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

const SECONDS_PER_ITEM = 7;

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/menu/favorites');
        if (res.ok) setFavorites(await res.json());
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
      }
    })();
  }, []);

  const repeats = favorites.length ? Math.ceil(6 / favorites.length) : 0;
  const half = Array.from({ length: repeats }).flatMap(() => favorites);
  const track = [...half, ...half];
  const duration = `${half.length * SECONDS_PER_ITEM}s`;

  return (
    <main style={{ paddingTop: '4.5rem' }}>
      <section className="Fresh-Favorites" id="menu">
        <header className="section-header">
          <h2>Fresh Favorites</h2>
          <p>Curated selections from our seasonal menu, designed to nourish and delight.</p>
        </header>

        {favorites.length > 0 && (
          <div className="marquee">
            <div className="marquee-track" style={{ animationDuration: duration }}>
              {track.map((item, i) => (
                <Link
                  key={`${item.id}-${i}`}
                  to="/menu"
                  state={{ scrollToId: item.id }}
                  className="marquee-item"
                  aria-hidden={i >= half.length ? 'true' : undefined}
                  tabIndex={i >= half.length ? -1 : undefined}
                >
                  <ProductCard dish={item} />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="menu-cta">
          <Link to="/menu">
            <button type="button">View Full Menu</button>
          </Link>
        </div>
      </section>
    </main>
  );
}