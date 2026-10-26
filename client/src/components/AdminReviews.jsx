import React, { useState, useEffect, useRef } from 'react';
import '../assets/style/menu.css';

export default function AdminReviews({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'flagged'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const requestInFlight = useRef(false);
  const requestController = useRef(null);
  const requestSequence = useRef(0);
  const listEndRef = useRef(null);

  useEffect(() => {
    fetchReviews({ page: 1, append: false });
  }, [statusFilter, token, appliedSearch]);

  const fetchReviews = async ({ page = 1, append = false } = {}) => {
    if (!token || (append && requestInFlight.current)) return;
    if (!append) requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const requestId = ++requestSequence.current;
    requestInFlight.current = true;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (appliedSearch) params.append('search', appliedSearch);

      const res = await fetch(`/api/ratings/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to fetch reviews.');
      }
      const data = await res.json();
      if (requestId !== requestSequence.current) return;
      const pageReviews = Array.isArray(data) ? data : data.reviews || [];
      setReviews((current) => {
        if (!append) return pageReviews;
        const seen = new Set(current.map((review) => review.id));
        return [...current, ...pageReviews.filter((review) => !seen.has(review.id))];
      });
      const pagination = data.pagination || {};
      if (!append) setReviewsTotal(Number(pagination.total ?? pageReviews.length));
      setHasMore(Boolean(pagination.hasMore));
      setNextPage(page + 1);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (requestId === requestSequence.current) {
        requestInFlight.current = false;
        requestController.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (!hasMore || loading || loadingMore || !listEndRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchReviews({ page: nextPage, append: true });
    }, { rootMargin: '250px' });
    observer.observe(listEndRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, nextPage, reviews.length]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchQuery.trim());
  };

  const handleToggleModeration = async (review) => {
    const newStatus = review.is_moderated ? 0 : 1;
    const confirmPrompt = newStatus === 1
      ? 'Are you sure you want to flag/soft-delete this review from public display?'
      : 'Restore this review to public display on the menu?';

    if (!window.confirm(confirmPrompt)) return;

    setActionInProgress(review.id);
    try {
      const res = await fetch(`/api/ratings/admin/${review.id}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_moderated: newStatus }),
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to update review moderation status.');
      } else {
        // Update local state
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_moderated: newStatus } : r))
        );
      }
    } catch (err) {
      alert('Network error updating moderation status.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics
  const totalCount = reviews.length;
  const activeCount = reviews.filter((r) => !r.is_moderated).length;
  const flaggedCount = reviews.filter((r) => r.is_moderated).length;
  const avgStars = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="admin-reviews-container">
      {/* ── Toolbar & Filters ── */}
      <div className="admin-res-toolbar">
        <div className="admin-res-filters">
          <div className="admin-filter-item">
            <label htmlFor="filter-mod-status">Filter by Status:</label>
            <select
              id="filter-mod-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Reviews</option>
              <option value="active">Active (Visible)</option>
              <option value="flagged">Flagged / Soft-Deleted</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="admin-review-search">
            <input
              type="text"
              placeholder="Search reviewer, dish, or comments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-review-search-input"
            />
            <button
              type="submit"
              className="btn-secondary admin-review-search-button"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                className="btn-secondary admin-review-clear-button"
                onClick={() => {
                  setSearchQuery('');
                  setAppliedSearch('');
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        <button
          type="button"
          onClick={() => fetchReviews({ page: 1, append: false })}
          className="btn-secondary admin-review-refresh-button"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Stats Summary Bar ── */}
      <div className="admin-res-stats">
        <div className="res-stat-card">
          <div className="res-stat-number">{reviewsTotal}</div>
          <div className="res-stat-label">Loaded / Total Reviews</div>
          <small>{totalCount} loaded</small>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number review-stat-active">
            {activeCount}
          </div>
          <div className="res-stat-label">Loaded Active</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number review-stat-flagged">
            {flaggedCount}
          </div>
          <div className="res-stat-label">Loaded Flagged</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number review-stat-average">
            ★ {avgStars}
          </div>
          <div className="res-stat-label">Loaded Average Score</div>
        </div>
      </div>

      {loading && <p className="admin-review-loading">Loading customer reviews…</p>}
      {error && <p className="admin-review-error">{error}</p>}

      {/* ── Reviews Moderation Table ── */}
      {(!loading || reviews.length > 0) && (
        <div className="admin-table-wrapper">
          {reviews.length === 0 && !loading ? (
            <p className="admin-review-empty">
              No reviews match the selected filter.
            </p>
          ) : (
            <table className="admin-res-table">
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Reviewer</th>
                  <th>Rating</th>
                  <th>Review Content &amp; Tags</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Moderation Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const isFlagged = Boolean(r.is_moderated);
                  const isBusy = actionInProgress === r.id;

                  return (
                    <tr
                      key={r.id}
                      className={isFlagged ? 'admin-mod-row--flagged' : undefined}
                    >
                      <td>
                        <div className="admin-review-dish-cell">
                          {r.menu_item_img && (
                            <img
                              src={`/${r.menu_item_img}`}
                              alt={r.menu_item_title}
                              className="admin-review-dish-image"
                            />
                          )}
                          <strong>{r.menu_item_title}</strong>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{r.author_name}</strong>
                          {r.author_email && (
                            <div className="admin-review-email">
                              {r.author_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="admin-review-stars">
                          {'★'.repeat(r.rating)}
                        </span>{' '}
                        <small className="admin-review-rating">({r.rating}/5)</small>
                      </td>
                      <td className="admin-review-content-cell">
                        <div className="admin-review-content">
                          {r.review_text ? `"${r.review_text}"` : <em className="admin-review-no-comment">No comment</em>}
                        </div>
                        {r.tags && (
                          <div className="admin-review-tags">
                            {r.tags.split(',').map((t, idx) => (
                              <span
                                key={idx}
                                className="admin-review-tag"
                              >
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="admin-review-date">
                        {new Date(r.created_at).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </td>
                      <td>
                        <span className={`admin-mod-badge ${isFlagged ? 'flagged' : 'active'}`}>
                          {isFlagged ? 'Flagged / Hidden' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn-flag ${isFlagged ? 'restore' : 'flag'}`}
                          disabled={isBusy}
                          onClick={() => handleToggleModeration(r)}
                          title={
                            isFlagged
                              ? 'Approve and restore this review for customers'
                              : 'Soft-delete/flag this review as inappropriate'
                          }
                        >
                          {isBusy
                            ? 'Processing…'
                            : isFlagged
                            ? '✓ Restore'
                            : '⚑ Soft-Delete / Flag'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div ref={listEndRef} className="admin-review-list-end" aria-hidden="true" />
          {loadingMore && <p className="admin-review-loading" role="status">Loading more reviews…</p>}
          {!hasMore && reviews.length > 0 && <p className="admin-review-loading">All matching reviews loaded.</p>}
        </div>
      )}
    </div>
  );
}
