import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import '../assets/style/menu.css';

export default function ProductGrid({ items, onSelectDish, onReviewSubmitted, horizontal = false }) {
  const [expandedDish, setExpandedDish] = useState(null);
  const closeExpanded = () => setExpandedDish(null);

  useEffect(() => {
    if (!expandedDish) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeExpanded();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expandedDish]);

  useEffect(() => {
    if (!expandedDish) return;
    const currentDish = items.find((item) => item.id === expandedDish.id);
    if (currentDish && currentDish.is_available !== expandedDish.is_available) setExpandedDish(currentDish);
  }, [items, expandedDish]);

  if (items.length === 0) {
    return <p className="no-items">No dishes match your search/filter.</p>;
  }

  return (
    <>
      <div className={`catalog-grid${horizontal ? ' catalog-grid--horizontal' : ''}`}>
        {items.map((dish) => (
          <ProductCard
            key={dish.id}
            id={`dish-${dish.id}`}
            dish={dish}
            onSelect={onSelectDish}
            onExpand={setExpandedDish}
            onReviewSubmitted={onReviewSubmitted}
          />
        ))}
      </div>

      {expandedDish && (
        <div className="modal-backdrop card-expand-backdrop" onClick={closeExpanded}>
          <div className="card-expand-wrap" onClick={(e) => e.stopPropagation()}>
            <ProductCard
              dish={expandedDish}
              onSelect={onSelectDish}
              onClose={closeExpanded}
              onReviewSubmitted={() => {
                if (onReviewSubmitted) onReviewSubmitted();
              }}
              expanded
            />
          </div>
        </div>
      )}
    </>
  );
}
