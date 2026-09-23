import React from 'react';
import '../assets/style/menu.css';
export default function ProductCard({ dish, onSelect }) {
  return (
    <article className="catalog-card">
      <div className="card-image-wrap">
        <img src={`/${dish.img}`} alt={dish.title} />
        <span className="card-price">₹{dish.price}</span>
      </div>
      <div className="card-body">
        <div className="card-header">
          <h3>{dish.title}</h3>
          <span className={`category-tag ${dish.category === 'None' ? 'none' : ''}`}>
            {dish.category}
          </span>
        </div>
        <p className="card-desc">{dish.description}</p>
        {onSelect && (
          <div className="card-footer">
          <button className="btn-primary" type="button" onClick={() => onSelect(dish)}>
            +Add to Order
          </button>
        </div>
        )}
      </div>
    </article>
  );
}