import { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/style/profile.css';

/**
 * Four possible stages returned by the backend:
 *   placed → preparing → ready / out_for_delivery → completed
 */
const STEPS_DINE_TAKEOUT = [
  {
    key: 'placed',
    label: 'Order Placed',
    icon: '🧾',
    description: 'Your order has been received and is being queued.',
  },
  {
    key: 'preparing',
    label: 'Preparing',
    icon: '👨‍🍳',
    description: 'Our kitchen is crafting your meal right now.',
  },
  {
    key: 'ready',
    label: 'Ready for Pickup',
    icon: '✅',
    description: 'Your order is ready! Come collect it at the counter.',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: '🎉',
    description: 'Enjoy your meal! Thank you for dining with us.',
  },
];

const STEPS_DELIVERY = [
  {
    key: 'placed',
    label: 'Order Placed',
    icon: '🧾',
    description: 'Your order has been received and is being queued.',
  },
  {
    key: 'preparing',
    label: 'Preparing',
    icon: '👨‍🍳',
    description: 'Our kitchen is crafting your meal right now.',
  },
  {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    icon: '🛵',
    description: 'Your order is on its way to you!',
  },
  {
    key: 'completed',
    label: 'Delivered',
    icon: '🎉',
    description: 'Delivered! Enjoy your meal. Thank you for ordering.',
  },
];

export default function OrderTracker() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !token) return;
    fetchStatus();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/orders/status/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to fetch order status.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStatusData(data);
      setError('');
    } catch (err) {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="tracker-page">
        <div className="tracker-container">
          <div className="profile-auth-gate">
            <h2>Please log in</h2>
            <p>You need to be signed in to track your order.</p>
            <Link to="/menu" className="tracker-back-btn">Go to Menu</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tracker-page">
        <div className="tracker-container">
          <div className="tracker-card tracker-loading">
            <p>Fetching order status…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracker-page">
        <div className="tracker-container">
          <div className="tracker-card tracker-error">
            <p>{error}</p>
            <button className="tracker-back-btn" onClick={() => navigate('/profile')}>
              ← Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps =
    statusData.order_type === 'Delivery' ? STEPS_DELIVERY : STEPS_DINE_TAKEOUT;

  // Determine which step index is currently active
  const activeIndex = steps.findIndex((s) => s.key === statusData.stage);

  // Format the placed date nicely
  const placedDate = new Date(statusData.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="tracker-page">
      <div className="tracker-container">
        <div className="tracker-card">
          <h2>Live Order Tracker</h2>
          <p className="tracker-order-meta">
            Order <code>{statusData.order_id}</code> &middot; {statusData.order_type} &middot; Placed{' '}
            {placedDate}
          </p>

          {/* ── Stepper ── */}
          <div className="tracker-stepper">
            {steps.map((step, idx) => {
              const isDone = idx < activeIndex;
              const isActive = idx === activeIndex;
              const isLast = idx === steps.length - 1;

              return (
                <div className="tracker-step" key={step.key}>
                  <div className="step-icon-col">
                    <div
                      className={`step-circle ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                      aria-label={isDone ? 'Completed step' : isActive ? 'Current step' : 'Upcoming step'}
                    >
                      {isDone ? '✓' : step.icon}
                    </div>
                    {!isLast && (
                      <div className={`step-line ${isDone ? 'done' : ''}`} />
                    )}
                  </div>
                  <div className="step-content">
                    <div
                      className={`step-label ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                    >
                      {step.label}
                    </div>
                    <div
                      className={`step-description ${isActive ? 'active' : ''}`}
                    >
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Items summary ── */}
          {statusData.items && statusData.items.length > 0 && (
            <div className="tracker-items-summary">
              <h3>Items in this order</h3>
              <ul className="tracker-items-ul">
                {statusData.items.map((item) => (
                  <li key={item.id}>
                    <span className="check">{item.completed ? '✓' : '○'}</span>
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link to="/profile" className="tracker-back-btn">
            ← Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
