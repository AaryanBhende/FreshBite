import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../assets/style/menu.css';

const hasValue = (v) => v !== null && v !== undefined && v !== '';

const POPULAR_TAGS = ['Delicious', 'Fresh', 'Healthy', 'Must Try', 'Spicy', 'Value for Money'];

export default function ProductCard({
  dish,
  onSelect,
  onExpand,
  onClose,
  expanded = false,
  onReviewSubmitted,
  actionLabel = '+Add to Order',
}) {
  const { user, token } = useContext(AuthContext);
  const tags = dish.category ? dish.category.split(',').map((tag) => tag.trim()) : ['None'];
  const isUnavailable = dish.is_available === 0 || dish.is_available === false;
  const canExpand = !isUnavailable && !expanded && onExpand;

  // Review states (for expanded view)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewCount, setReviewCount] = useState(0);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState({ msg: '', type: '' });
  const reviewListRef = useRef(null);
  const reviewEndRef = useRef(null);
  const reviewRequestInFlight = useRef(false);
  const reviewRequestController = useRef(null);
  const reviewRequestSequence = useRef(0);

  const nutrition = [
    { label: 'Calories', value: dish.calories, unit: 'kcal' },
    { label: 'Protein', value: dish.protein, unit: 'g' },
    { label: 'Carbs', value: dish.carbs, unit: 'g' },
    { label: 'Fats', value: dish.fats, unit: 'g' },
    { label: 'Fibre', value: dish.fibre, unit: 'g' },
  ].filter((n) => hasValue(n.value));

  const handleAdd = () => {
    if (isUnavailable) return;
    onSelect(dish);
    if (expanded && onClose) onClose();
  };

  // Fetch reviews when expanded
  useEffect(() => {
    if (expanded && dish?.id) {
      fetchReviews({ page: 1, append: false });
    }
  }, [expanded, dish?.id]);

  const fetchReviews = async ({ page = 1, append = false } = {}) => {
    if (!dish?.id || (append && reviewRequestInFlight.current)) return;
    if (!append) reviewRequestController.current?.abort();
    const controller = new AbortController();
    reviewRequestController.current = controller;
    const requestId = ++reviewRequestSequence.current;
    reviewRequestInFlight.current = true;
    if (append) setLoadingMoreReviews(true);
    else {
      setLoadingReviews(true);
      setReviews([]);
      setReviewCount(0);
      setHasMoreReviews(false);
      setReviewPage(1);
    }
    try {
      const res = await fetch(`/api/ratings/item/${dish.id}?page=${page}&limit=5`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        if (requestId !== reviewRequestSequence.current) return;
        const pageReviews = data.reviews || [];
        setReviews((current) => {
          if (!append) return pageReviews;
          const existingIds = new Set(current.map((review) => review.id));
          return [...current, ...pageReviews.filter((review) => !existingIds.has(review.id))];
        });
        const pagination = data.pagination || {};
        setReviewCount(Number(data.review_count ?? pagination.total ?? pageReviews.length));
        setHasMoreReviews(Boolean(pagination.hasMore));
        setReviewPage(page);
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Failed to fetch reviews:', err);
    } finally {
      if (requestId === reviewRequestSequence.current) {
        reviewRequestInFlight.current = false;
        reviewRequestController.current = null;
        setLoadingReviews(false);
        setLoadingMoreReviews(false);
      }
    }
  };

  useEffect(() => {
    if (!expanded || !hasMoreReviews || loadingReviews || loadingMoreReviews || !reviewListRef.current || !reviewEndRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchReviews({ page: reviewPage + 1, append: true });
    }, { root: reviewListRef.current, rootMargin: '50px' });
    observer.observe(reviewEndRef.current);
    return () => observer.disconnect();
  }, [expanded, hasMoreReviews, loadingReviews, loadingMoreReviews, reviewPage, reviews.length, dish?.id]);

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewMsg({ msg: '', type: '' });
    setSubmittingReview(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/ratings/item/${dish.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating: newRating,
          review_text: newComment,
          tags: selectedTags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReviewMsg({ msg: data.error || 'Failed to submit review.', type: 'error' });
      } else {
        setReviewMsg({ msg: 'Thank you! Your review has been published.', type: 'success' });
        setNewComment('');
        setSelectedTags([]);
        setShowWriteReview(false);
        fetchReviews({ page: 1, append: false });
        if (onReviewSubmitted) onReviewSubmitted();
      }
    } catch (err) {
      setReviewMsg({ msg: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Parse rating values from dish (populated from GET /api/menu aggregation)
  const avgRatingNum = Number(dish.avg_rating) || 0;
  const reviewCountNum = Number(dish.review_count) || 0;

  return (
    <article
      id={!expanded ? `dish-${dish.id}` : undefined}
      className={`catalog-card ${expanded ? 'expanded' : ''}${isUnavailable ? ' catalog-card--unavailable' : ''}`}
    >
      {isUnavailable && <span className="catalog-unavailable-stamp" aria-label="Unavailable">Unavailable</span>}
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

        {/* ── FR-3.2 Aggregation Rating Badge directly on card ── */}
        <div
          className={`card-rating-badge ${reviewCountNum === 0 ? 'no-reviews' : ''}`}
          onClick={canExpand ? () => onExpand(dish) : undefined}
          title={
            reviewCountNum > 0
              ? `${avgRatingNum.toFixed(1)} out of 5 stars (${reviewCountNum} review${
                  reviewCountNum === 1 ? '' : 's'
                })`
              : 'Be the first to review this dish!'
          }
        >
          <span className="rating-star-icon">★</span>
          <span>{reviewCountNum > 0 ? avgRatingNum.toFixed(1) : 'New'}</span>
          <span className="rating-count-text">
            ({reviewCountNum} {reviewCountNum === 1 ? 'review' : 'reviews'})
          </span>
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

        {/* ── Reviews & Customer Feedback in Expanded View ── */}
        {expanded && (
          <div className="dish-reviews-section">
            <div className="dish-reviews-header">
              <h4>Customer Reviews ({reviewCount})</h4>
              <button
                type="button"
                className="btn-secondary write-review-toggle"
                onClick={() => setShowWriteReview(!showWriteReview)}
              >
                {showWriteReview ? 'Close Review Form' : '★ Write a Review'}
              </button>
            </div>

            {/* Write Review Form */}
            {showWriteReview && (
              <form onSubmit={handleSubmitReview} className="write-review-form">
                <h5>Leave your rating for {dish.title}</h5>

                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= newRating ? 'active' : ''}`}
                      onClick={() => setNewRating(star)}
                      aria-label={`${star} Star`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="star-rating-caption">
                    {newRating} / 5 Stars
                  </span>
                </div>

                <textarea
                  rows="3"
                  placeholder="Share what you enjoyed or suggestions for flavor..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />

                <div className="tag-options">
                  {POPULAR_TAGS.map((tag) => (
                    <span
                      key={tag}
                      className={`tag-chip ${selectedTags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      +{tag}
                    </span>
                  ))}
                </div>

                <div className="review-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowWriteReview(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={submittingReview}>
                    {submittingReview ? 'Submitting…' : 'Post Review'}
                  </button>
                </div>
              </form>
            )}

            {reviewMsg.msg && (
              <div className={`res-feedback review-feedback ${reviewMsg.type}`}>
                {reviewMsg.msg}
              </div>
            )}

            {loadingReviews && reviews.length === 0 ? (
              <p className="review-loading">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p className="review-empty">
                No reviews yet. Be the first to share your thoughts!
              </p>
            ) : (
              <div className="dish-reviews-list" ref={reviewListRef}>
                {reviews.map((r) => (
                  <div className="dish-review-item" key={r.id}>
                    <div className="review-item-top">
                      <span className="review-author">{r.author_name}</span>
                      <span className="review-stars">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </span>
                    </div>
                    {r.review_text && <p className="review-text">{r.review_text}</p>}
                    {r.tags && (
                      <div className="review-tags">
                        {r.tags.split(',').map((t, idx) => (
                          <span className="review-tag" key={idx}>
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={reviewEndRef} className="dish-reviews-list-end" aria-hidden="true" />
                {loadingMoreReviews && <p className="review-loading" role="status">Loading more reviews…</p>}
              </div>
            )}
          </div>
        )}

        {onSelect && (
          <div className="card-footer">
            <button className="btn-primary" type="button" onClick={handleAdd} disabled={isUnavailable}>
              {isUnavailable ? 'Unavailable' : actionLabel}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
