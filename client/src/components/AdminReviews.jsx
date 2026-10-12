import React, { useState, useEffect } from 'react';
import '../assets/style/menu.css';

export default function AdminReviews({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'flagged'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, token]);

  const fetchReviews = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/ratings/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to fetch reviews.');
      }
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReviews();
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
                  fetchReviews();
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        <button
          type="button"
          onClick={fetchReviews}
          className="btn-secondary admin-review-refresh-button"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Stats Summary Bar ── */}
      <div className="admin-res-stats">
        <div className="res-stat-card">
          <div className="res-stat-number">{totalCount}</div>
          <div className="res-stat-label">Total Reviews</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number review-stat-active">
            {activeCount}
          </div>
          <div className="res-stat-label">Active (Live)</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number review-stat-flagged">
            {flaggedCount}
          </div>
          <div className="res-stat-label">Flagged / Soft-Deleted</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number review-stat-average">
            ★ {avgStars}
          </div>
          <div className="res-stat-label">Average Score</div>
        </div>
      </div>

      {loading && <p className="admin-review-loading">Loading customer reviews…</p>}
      {error && <p className="admin-review-error">{error}</p>}

      {/* ── Reviews Moderation Table ── */}
      {!loading && (
        <div className="admin-table-wrapper">
          {reviews.length === 0 ? (
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
        </div>
      )}
    </div>
  );
}
