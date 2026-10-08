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

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              placeholder="Search reviewer, dish, or comments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.45rem 0.8rem',
                border: '1.5px solid #ddd',
                borderRadius: 6,
                fontSize: '0.88rem',
                width: 250,
              }}
            />
            <button
              type="submit"
              className="btn-secondary"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
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
          className="btn-secondary"
          onClick={fetchReviews}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
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
          <div className="res-stat-number" style={{ color: '#2e7d32' }}>
            {activeCount}
          </div>
          <div className="res-stat-label">Active (Live)</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number" style={{ color: '#d32f2f' }}>
            {flaggedCount}
          </div>
          <div className="res-stat-label">Flagged / Soft-Deleted</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number" style={{ color: '#f57f17' }}>
            ★ {avgStars}
          </div>
          <div className="res-stat-label">Average Score</div>
        </div>
      </div>

      {loading && <p style={{ color: '#777', padding: '1rem' }}>Loading customer reviews…</p>}
      {error && <p style={{ color: '#c62828', padding: '1rem' }}>{error}</p>}

      {/* ── Reviews Moderation Table ── */}
      {!loading && (
        <div className="admin-table-wrapper">
          {reviews.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {r.menu_item_img && (
                            <img
                              src={`/${r.menu_item_img}`}
                              alt={r.menu_item_title}
                              style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                            />
                          )}
                          <strong>{r.menu_item_title}</strong>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{r.author_name}</strong>
                          {r.author_email && (
                            <div style={{ fontSize: '0.78rem', color: '#777' }}>
                              {r.author_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#f57f17', fontWeight: 700, fontSize: '0.95rem' }}>
                          {'★'.repeat(r.rating)}
                        </span>{' '}
                        <small style={{ color: '#777' }}>({r.rating}/5)</small>
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        <div style={{ color: '#2c3e50', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                          {r.review_text ? `"${r.review_text}"` : <em style={{ color: '#999' }}>No comment</em>}
                        </div>
                        {r.tags && (
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {r.tags.split(',').map((t, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.7rem',
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: 10,
                                }}
                              >
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#666' }}>
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
