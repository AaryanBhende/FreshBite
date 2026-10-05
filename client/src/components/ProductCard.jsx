import React from 'react';
import '../assets/style/menu.css';

const hasValue = (v) => v !== null && v !== undefined && v !== '';

export default function ProductCard({ dish, onSelect, onExpand, onClose, expanded = false }) {
  const tags = dish.category ? dish.category.split(',').map((tag) => tag.trim()) : ['None'];
  const canExpand = !expanded && onExpand;

  const nutrition = [
    { label: 'Calories', value: dish.calories, unit: 'kcal' },
    { label: 'Protein', value: dish.protein, unit: 'g' },
    { label: 'Carbs', value: dish.carbs, unit: 'g' },
    { label: 'Fats', value: dish.fats, unit: 'g' },
    { label: 'Fibre', value: dish.fibre, unit: 'g' },
  ].filter((n) => hasValue(n.value));

  const handleAdd = () => {
    onSelect(dish);
    if (expanded && onClose) onClose();
  };

  return (
    <article
      id={!expanded ? `dish-${dish.id}` : undefined}
      className={`catalog-card ${expanded ? 'expanded' : ''}`}
    >
      {expanded && (
        <button
          className="card-close-btn"
          type="button"
          aria-label="Close details"
          onClick={onClose}
        >
          ×
        </button>
      )}

      <div
        className={`card-image-wrap ${canExpand ? 'clickable' : ''}`}
        onClick={canExpand ? () => onExpand(dish) : undefined}
        onKeyDown={
          canExpand
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExpand(dish);
                }
              }
            : undefined
        }
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-label={canExpand ? `View details for ${dish.title}` : undefined}
      >
        <img src={`/${dish.img}`} alt={dish.title} />
        <span className="card-price">₹{dish.price}</span>

        {!expanded && nutrition.length > 0 && (
          <div className="nutrition-overlay" aria-hidden="true">
            {nutrition.map((n) => (
              <div className="nutrition-item" key={n.label}>
                <strong>
                  {n.value}
                  {n.unit === 'g' ? 'g' : ''}
                </strong>
                <span>{n.unit === 'kcal' ? 'kcal' : n.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-header">
          <h3>{dish.title}</h3>
          <div className="card-tags">
            {tags.map((tag, index) => (
              <span key={index} className={`category-tag ${tag === 'None' ? 'none' : ''}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="card-desc">{dish.description}</p>

        {expanded && nutrition.length > 0 && (
          <div className="nutrition-panel">
            <h4>Nutrition per serving</h4>
            <div className="nutrition-grid">
              {nutrition.map((n) => (
                <div className="nutrition-cell" key={n.label}>
                  <strong>
                    {n.value}
                    <small>{n.unit}</small>
                  </strong>
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onSelect && (
          <div className="card-footer">
            <button className="btn-primary" type="button" onClick={handleAdd}>
              +Add to Order
            </button>
          </div>
        )}
      </div>
    </article>
  );
}