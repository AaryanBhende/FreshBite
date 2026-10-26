import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/style/profile.css';


// ─── Helpers ────────────────────────────────────────────────
function typeBadgeClass(type) {
  if (!type) return 'badge-dine';
  const t = type.toLowerCase();
  if (t === 'delivery') return 'badge-delivery';
  if (t === 'takeout')  return 'badge-takeout';
  return 'badge-dine';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function calcGroupTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ─── Order History tab ───────────────────────────────────────
function OrderHistory({ token, onReorder }) {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to fetch orders.');
        return;
      }
      setOrders(await res.json());
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-card">
        <h2>Order History</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-card">
        <h2>Order History</h2>
        <p style={{ color: '#c62828' }}>{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="profile-card">
        <h2>Order History</h2>
        <div className="order-history-empty">
          <p>You haven't placed any orders yet.</p>
          <Link to="/menu" style={{ color: 'var(--color-primary, #2e7d32)', fontWeight: 600 }}>
            Browse the Menu →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <h2>Order History</h2>
      {orders.map((group) => {
        const total = calcGroupTotal(group.items);
        return (
          <div className="order-group" key={group.order_id}>
            {/* Header row */}
            <div className="order-group-header">
              <div className="order-group-meta">
                <span className="order-group-id">{group.order_id}</span>
                <span className="order-group-date">{formatDate(group.created_at)}</span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`order-group-type-badge ${typeBadgeClass(group.order_type)}`}>
                  {group.order_type}
                </span>
                <span className={`order-status-badge ${group.completed ? 'badge-completed' : 'badge-pending'}`}>
                  {group.completed ? 'Completed' : 'Pending'}
                </span>
              </div>

              <div className="order-group-actions">
                {/* Re-order: push past items into cart state and navigate to /menu */}
                <button
                  className="btn-reorder"
                  title="Add these items to your cart"
                  onClick={() => onReorder(group.items)}
                >
                  🔄 Re-order
                </button>
                {/* Live tracker link */}
                <Link
                  to={`/track/${group.order_id}`}
                  className="btn-track"
                  title="Track this order"
                >
                  📍 Track
                </Link>
              </div>
            </div>

            {/* Nested items */}
            <ul className="order-items-list">
              {group.items.map((item) => (
                <li key={item.id} className="order-item-row">
                  <div className="order-item-info">
                    <div className="order-item-title-row">
                      {item.title}
                      {item.category && (
                        <span className="order-item-cat">{item.category}</span>
                      )}
                    </div>
                    <div className="order-item-sub">
                      Qty: {item.quantity}
                      {item.notes ? ` · Note: ${item.notes}` : ''}
                    </div>
                  </div>
                  <span className="order-item-price">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Group total */}
            <div className="order-group-total">
              <span>Order Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── My Reservations tab ─────────────────────────────────────
function UserReservations({ token }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to fetch reservations.');
        return;
      }
      setReservations(await res.json());
    } catch {
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-card">
        <h2>Table Reservations</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[1, 2].map((n) => (
            <div key={n} className="skeleton" style={{ height: 60, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-card">
        <h2>Table Reservations</h2>
        <p style={{ color: '#c62828' }}>{error}</p>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="profile-card">
        <h2>Table Reservations</h2>
        <div className="order-history-empty">
          <p>You have no table reservations yet.</p>
          <Link to="/reservations" className="profile-book-btn">
            + Book New Table
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="profile-reservation-heading">
        <h2 style={{ margin: 0, padding: 0, border: 'none' }}>Table Reservations</h2>
        <Link to="/reservations" className="profile-book-btn">
          + Book New Table
        </Link>
      </div>
      {reservations.map((r) => (
        <div className="order-group" key={r.id}>
          <div className="order-group-header">
            <div className="order-group-meta">
              <span className="order-group-id">{r.id}</span>
              <span className="order-group-date">
                📅 {r.reservation_date} at 🕒 {r.time_slot}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="order-group-type-badge badge-dine">
                👥 {r.party_size} {r.party_size === 1 ? 'Guest' : 'Guests'}
              </span>
              <span className={`order-status-badge status-${r.status}`}>
                {r.status}
              </span>
            </div>
          </div>
          <div style={{ padding: '0.8rem 1.2rem', fontSize: '0.88rem', color: '#555' }}>
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Seating:</strong> {r.seating_pref}
            </p>
            {r.special_requests && (
              <p style={{ margin: 0 }}>
                <strong>Requests:</strong> <em>"{r.special_requests}"</em>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── My Details tab ──────────────────────────────────────────
function MyDetails({ user, token, onProfileUpdate }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving]       = useState(false);
  const [feedback, setFeedback]   = useState({ msg: '', type: '' });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ msg: '', type: '' });

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setFeedback({ msg: 'New passwords do not match.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
      };
      if (form.newPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ msg: data.error || 'Update failed.', type: 'error' });
      } else {
        setFeedback({ msg: 'Profile updated successfully!', type: 'success' });
        // Clear password fields
        setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        // Bubble the updated user object up so AuthContext + Navbar refresh
        if (data.user) onProfileUpdate(data.user);
      }
    } catch {
      setFeedback({ msg: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : '—';

  return (
    <>
      {/* Contact info card */}
      <div className="profile-card">
        <h2>Contact Information</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="profile-form-row">
            <div className="profile-form-group">
              <label htmlFor="pf-name">Full Name</label>
              <input
                id="pf-name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
              />
            </div>
            <div className="profile-form-group">
              <label htmlFor="pf-email">Email Address</label>
              <input
                id="pf-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password section */}
          <h2 style={{ marginTop: '1rem' }}>Change Password</h2>
          <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.8rem' }}>
            Leave all three blank to keep your current password.
          </p>
          <div className="profile-form-row">
            <div className="profile-form-group">
              <label htmlFor="pf-cur-pw">Current Password</label>
              <input
                id="pf-cur-pw"
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
            <div className="profile-form-group">
              <label htmlFor="pf-new-pw">New Password</label>
              <input
                id="pf-new-pw"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="profile-form-group" style={{ maxWidth: 280 }}>
            <label htmlFor="pf-conf-pw">Confirm New Password</label>
            <input
              id="pf-conf-pw"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          <button className="profile-save-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>

          {feedback.msg && (
            <div className={`profile-feedback ${feedback.type}`}>{feedback.msg}</div>
          )}
        </form>
      </div>

      {/* Account info card */}
      <div className="profile-card">
        <h2>Account Information</h2>
        <ul className="profile-meta-list">
          <li><strong>User ID:</strong> <code style={{ fontSize: '0.8rem' }}>{user?.id}</code></li>
          <li><strong>Role:</strong> {user?.role === 'admin' ? '🛡️ Admin' : '👤 User'}</li>
          <li><strong>Member since:</strong> {joinedDate}</li>
        </ul>
      </div>
    </>
  );
}

// ─── Main Profile page ───────────────────────────────────────
export default function Profile() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { user, token, login: loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab]     = useState('details');
  const [toastMsg,  setToastMsg]      = useState('');
  const [toastVis,  setToastVis]      = useState(false);

  // Auth gate
  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-auth-gate">
            <h2>Please log in</h2>
            <p>Sign in to view and edit your profile and order history.</p>
            <Link to="/menu" className="tracker-back-btn">Go to Menu</Link>
          </div>
        </div>
      </div>
    );
  }

  // When user updates their profile, refresh auth context so Navbar shows new name
  const handleProfileUpdate = (updatedUser) => {
    // Merge into existing user object and re-persist token + user
    loginUser({ ...user, ...updatedUser }, token);
  };

  // Re-order: convert past items into cart items and navigate to /menu
  const handleReorder = (items) => {
    // Build cart entries compatible with Menu.jsx cart shape
    const newCartItems = items.map((item) => ({
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: item.title,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || '',
      completed: 0,
    }));

    // Merge with existing cart (don't wipe existing items)
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem('freshbite_cart') || '[]');
      } catch {
        return [];
      }
    })();

    localStorage.setItem('freshbite_cart', JSON.stringify([...existing, ...newCartItems]));

    // Show toast then navigate
    setToastMsg(`${items.length} item${items.length !== 1 ? 's' : ''} added to your cart!`);
    setToastVis(true);
    setTimeout(() => {
      setToastVis(false);
      navigate('/menu');
    }, 1400);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-page-title">My Account</h1>
        <p className="profile-page-subtitle">
          Welcome back, <strong>{user.name}</strong>!
        </p>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            My Details
          </button>
          <button
            className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Order History
          </button>
          <button
            className={`profile-tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            Table Reservations
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'details' && (
          <MyDetails user={user} token={token} onProfileUpdate={handleProfileUpdate} />
        )}
        {activeTab === 'history' && (
          <OrderHistory token={token} onReorder={handleReorder} />
        )}
        {activeTab === 'reservations' && (
          <UserReservations token={token} />
        )}
      </div>

      {/* Re-order toast notification */}
      <div className={`reorder-toast ${toastVis ? 'show' : ''}`}>
        🛒 {toastMsg}
      </div>
    </div>
  );
}
