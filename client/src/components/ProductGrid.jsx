import React from 'react';
import ProductCard from './ProductCard';
import '../assets/style/menu.css';
export default function ProductGrid({ items, onSelectDish }) {
  if (items.length === 0) {
    return <p className="no-items">No dishes match your search/filter.</p>;
  }

  return (
    <div className="catalog-grid">
      {items.map((dish) => (
        <ProductCard key={dish.id} dish={dish} onSelect={onSelectDish} />
      ))}
    </div>
  );
}