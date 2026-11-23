import { Fragment, useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, InfoWindow, Marker, OverlayView, Polyline, useLoadScript } from '@react-google-maps/api';
import { AuthContext } from '../context/AuthContext';
import { readJsonResponse } from '../utils/readJsonResponse';
import { announceDeliveryArrival, DELIVERY_TRIP_DURATION_MS, ensureDeliveryTripStarted, readDeliveryTrip } from '../utils/deliveryTrip';
import '../assets/style/profile.css';

const miramarLocation = [15.4800, 73.8080];
const ORDER_ISSUE_TAGS = ['Order not delivered', 'Missing/destroyed one or more item', 'Wrong order'];
const ORDER_ISSUE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function canReportOrderIssue(createdAt, now = Date.now()) {
  const placedAt = new Date(createdAt).getTime();
  return Number.isFinite(placedAt) && now - placedAt < ORDER_ISSUE_WINDOW_MS;
}

function DeliveryMap({ destination, address, showDriver, tripStartedAt, orderId }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
  const [map, setMap] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeError, setRouteError] = useState('');
  const [driver, setDriver] = useState({ lat: miramarLocation[0], lng: miramarLocation[1] });
  const origin = { lat: miramarLocation[0], lng: miramarLocation[1] };
  const target = { lat: destination[0], lng: destination[1] };

  useEffect(() => {
    if (!isLoaded || !map) return undefined;
    let cancelled = false;
    setRoutePath([]);
    setRouteError('');
    (async () => {
      try {
        const { Route } = await window.google.maps.importLibrary('routes');
        const result = await Route.computeRoutes({
          origin,
          destination: target,
          travelMode: 'DRIVING',
          fields: ['path', 'viewport'],
        });
        const points = result.routes?.[0]?.path?.map((point) => ({ lat: point.lat, lng: point.lng })) || [];
        if (cancelled) return;
        if (!points.length) throw new Error('No driving route was returned.');
        setRoutePath(points);
        const bounds = new window.google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 36);
      } catch {
        if (!cancelled) setRouteError('A road route could not be calculated for this delivery location.');
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, map, destination[0], destination[1]]);

  useEffect(() => {
    if (!showDriver || !tripStartedAt || routePath.length < 2) {
      setDriver(routePath[0] || origin);
      return undefined;
    }
    const cumulative = [0];
    for (let i = 1; i < routePath.length; i += 1) {
      const a = routePath[i - 1];
      const b = routePath[i];
      const rad = Math.PI / 180;
      const dLat = (b.lat - a.lat) * rad;
      const dLng = (b.lng - a.lng) * rad;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
      cumulative.push(cumulative[i - 1] + 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
    }
    const total = cumulative[cumulative.length - 1];
    const duration = DELIVERY_TRIP_DURATION_MS;
    const positionAt = (progress) => {
      const distance = total * progress;
      let index = cumulative.findIndex((value) => value >= distance);
      if (index < 1) index = 1;
      const segmentStart = cumulative[index - 1];
      const segmentLength = cumulative[index] - segmentStart || 1;
      const part = Math.min(Math.max((distance - segmentStart) / segmentLength, 0), 1);
      const a = routePath[index - 1];
      const b = routePath[index];
      return progress === 1 ? routePath[routePath.length - 1] : {
        lat: a.lat + (b.lat - a.lat) * part,
        lng: a.lng + (b.lng - a.lng) * part,
      };
    };
    const getProgress = () => Math.min(Math.max((Date.now() - tripStartedAt) / duration, 0), 1);
    const updatePosition = () => {
      const progress = getProgress();
      setDriver(positionAt(progress));
      if (progress >= 1) announceDeliveryArrival(orderId);
      return progress;
    };
    if (updatePosition() >= 1) return undefined;
    const timer = setInterval(() => {
      if (updatePosition() >= 1) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [routePath, showDriver, tripStartedAt, orderId]);

  if (loadError) return <p className="tracker-map-unavailable">Google Maps could not be loaded.</p>;
  if (!isLoaded) return <div className="tracker-map map-loading" role="status">Loading map…</div>;

  return (
    <GoogleMap
      mapContainerClassName="tracker-map"
      center={origin}
      zoom={13}
      options={{ scrollwheel: false, streetViewControl: false, mapTypeControl: false }}
      onLoad={setMap}
    >
      {routePath.length > 0 && <Polyline path={routePath} options={{ strokeColor: '#2e7d32', strokeOpacity: 0.85, strokeWeight: 5 }} />}
      <OverlayView position={origin} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <div className="tracker-cafe-icon" title="FreshBite Cafe · Miramar, Panaji" aria-label="FreshBite Cafe">☕</div>
      </OverlayView>
      <InfoWindow position={origin}><div><strong>FreshBite Cafe</strong><br />Miramar, Panaji, Goa</div></InfoWindow>
      <Marker position={target} title={address || 'Delivery destination'} zIndex={100} />
      {showDriver && (
        <OverlayView position={driver} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div className="tracker-driver-icon" title="Delivery driver" aria-label="Delivery driver">🛵</div>
        </OverlayView>
      )}
      {routeError && <InfoWindow position={origin}><div>{routeError}</div></InfoWindow>}
    </GoogleMap>
  );
}

function parseCoordinates(order) {
  const raw = order?.coordinates;
  if (typeof raw === 'string') {
    const [lat, lng] = raw.split(',').map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
  }
  const lat = Number(order?.latitude);
  const lng = Number(order?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

/**
 * Customer-facing stages are derived by the backend from kitchen and delivery state.
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
    label: 'Being Prepared',
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

const STEPS_DINE_IN = [
  {
    key: 'placed',
    label: 'Order Placed',
    icon: '🧾',
    description: 'Your order has been received and is being queued.',
  },
  {
    key: 'preparing',
    label: 'Being Prepared',
    icon: '👨‍🍳',
    description: 'Our kitchen is crafting your meal right now.',
  },
  {
    key: 'meal_ready',
    label: 'Your Meal is ready',
    icon: '🍽️',
    description: 'Each dish will be served to you one at a time.',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: '🎉',
    description: 'Delivered! Enjoy your meal. Thank you for ordering.',
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
    label: 'Being Prepared',
    icon: '👨‍🍳',
    description: 'Our kitchen is crafting your meal right now.',
  },
  {
    key: 'ready',
    label: 'Ready for Delivery',
    icon: '✅',
    description: 'Your order is ready. We are assigning a delivery driver.',
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
  const [tripStartedAt, setTripStartedAt] = useState(null);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [issueTag, setIssueTag] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [issueSending, setIssueSending] = useState(false);
  const [issueFeedback, setIssueFeedback] = useState('');
  const [issueError, setIssueError] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryOtpSending, setDeliveryOtpSending] = useState(false);
  const [deliveryOtpFeedback, setDeliveryOtpFeedback] = useState('');
  const [deliveryOtpError, setDeliveryOtpError] = useState('');

  useEffect(() => {
    if (!user || !token) return;
    fetchStatus();
    // Refresh often enough for admin status changes to reach the tracker promptly.
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  const destination = parseCoordinates(statusData);
  const isDelivery = String(statusData?.order_type || '').toLowerCase() === 'delivery';
  const isDineIn = String(statusData?.order_type || '').toLowerCase().replace(/[- ]/g, '') === 'dinein';
  useEffect(() => {
    if (!isDelivery || !['out_for_delivery', 'awaiting_delivery_otp'].includes(statusData?.stage)) {
      setTripStartedAt(null);
      return;
    }
    const trip = readDeliveryTrip(orderId) || ensureDeliveryTripStarted(orderId);
    setTripStartedAt(trip.startedAt);
  }, [isDelivery, orderId, statusData?.stage]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/orders/status/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await readJsonResponse(res);
        setError(data.error || 'Failed to fetch order status.');
        setLoading(false);
        return;
      }
      const data = await readJsonResponse(res);
      setStatusData(data);
      setError('');
    } catch (err) {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const submitOrderIssue = async (event) => {
    event.preventDefault();
    setIssueSending(true);
    setIssueFeedback('');
    setIssueError('');
    try {
      const response = await fetch('/api/contact/order-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: statusData.order_id, issue_tag: issueTag, message: issueMessage }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not send your issue report.');
      setIssueFeedback(data.message || 'Your issue report was sent.');
      setIssueTag('');
      setIssueMessage('');
      setIssueFormOpen(false);
    } catch (submitError) {
      setIssueError(submitError.message);
    } finally {
      setIssueSending(false);
    }
  };

  const submitDeliveryOtp = async (event) => {
    event.preventDefault();
    setDeliveryOtpSending(true);
    setDeliveryOtpFeedback('');
    setDeliveryOtpError('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/verify-delivery-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: deliveryOtp }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not verify the delivery code.');
      setDeliveryOtp('');
      setDeliveryOtpFeedback(data.message || 'Delivery confirmed. Thank you!');
      await fetchStatus();
    } catch (verifyError) {
      setDeliveryOtpError(verifyError.message);
    } finally {
      setDeliveryOtpSending(false);
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

  const isDeliveryFailed = isDelivery && statusData.stage === 'delivery_failed';
  const orderIssueAllowed = canReportOrderIssue(statusData.created_at);
  const steps = isDineIn ? STEPS_DINE_IN : isDelivery
    ? STEPS_DELIVERY.map((step) => step.key === 'completed' && isDeliveryFailed
      ? { ...step, key: 'delivery_failed', label: 'Delivery Failed', icon: 'X', description: 'Our team has been notified that delivery could not be completed.' }
      : step)
    : STEPS_DINE_TAKEOUT;

  // Determine which step index is currently active
  const activeIndex = steps.findIndex((step) => step.key === (statusData.stage === 'awaiting_delivery_otp' ? 'out_for_delivery' : statusData.stage));

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

          {!isDelivery ? (
            <section className="tracker-local-status" aria-live="polite">
              <span className="tracker-local-status-icon" aria-hidden="true">{String(statusData.order_type).toLowerCase() === 'dine in' || String(statusData.order_type).toLowerCase() === 'dine-in' ? '🍽️' : '🥡'}</span>
              <div>
                <h3>{isDineIn ? (statusData.stage === 'completed' ? 'Dine-in order complete' : statusData.stage === 'meal_ready' ? 'Your Meal is ready' : 'Table service status') : statusData.stage === 'completed' ? 'Takeout pickup complete' : 'Cafe pickup status'}</h3>
                <p>{isDineIn ? (statusData.stage === 'completed' ? 'Delivered! Enjoy your meal. Thank you for ordering.' : statusData.stage === 'meal_ready' ? 'Each dish will be served to you one at a time.' : 'Follow your order progress here; our team will bring it to your table.') : statusData.stage === 'completed' ? 'Your order has been picked up. Enjoy your meal!' : statusData.stage === 'ready' ? 'Your order is ready! Collect it from the counter.' : 'Your order is being prepared at the cafe. Collect it from the counter when it is ready.'}</p>
              </div>
            </section>
          ) : (
            <section className="tracker-map-section" aria-label="Delivery route">
              <h3>Delivery route</h3>
              {destination ? (
                <DeliveryMap
                  destination={destination}
                  address={statusData.address}
                  showDriver={['out_for_delivery', 'awaiting_delivery_otp'].includes(statusData.stage)}
                  tripStartedAt={tripStartedAt}
                  orderId={orderId}
                />
              ) : <p className="tracker-map-unavailable">Delivery location is not available for this order.</p>}
              {statusData.stage === 'out_for_delivery' && <p className="tracker-driver-caption">{destination ? 'Your driver is on the way.' : 'Your order is out for delivery.'}</p>}
              {statusData.stage === 'delivery_failed' && <p role="status">Delivery could not be completed{statusData.delivery_failure_reason ? `: ${statusData.delivery_failure_reason}` : '.'}</p>}
              {statusData.delivery_status === 'awaiting_otp' && <form className="tracker-delivery-otp" onSubmit={submitDeliveryOtp}>
                <h4>Confirm your delivery</h4>
                <p>Ask your driver for the four-digit delivery code and enter it to complete this order. The code expires after five minutes.</p>
                <label htmlFor="delivery-verification-otp">Delivery verification code</label>
                <input id="delivery-verification-otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={deliveryOtp} onChange={(event) => setDeliveryOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} required />
                <button type="submit" disabled={deliveryOtpSending || deliveryOtp.length !== 4}>{deliveryOtpSending ? 'Verifying…' : 'Confirm delivery'}</button>
                {deliveryOtpFeedback && <p className="tracker-otp-success" role="status">{deliveryOtpFeedback}</p>}
                {deliveryOtpError && <p className="tracker-otp-error" role="alert">{deliveryOtpError}</p>}
              </form>}
            </section>
          )}

          {/* ── Stepper ── */}
          <div className="tracker-stepper">
            {steps.map((step, idx) => {
              const isDone = idx < activeIndex;
              const isActive = !isDeliveryFailed && idx === activeIndex;
              const isFailed = isDeliveryFailed && step.key === 'delivery_failed';
              const isLast = idx === steps.length - 1;

              return (
                <Fragment key={step.key}>
                <div className="tracker-step">
                  <div className="step-icon-col">
                    <div
                      className={`step-circle ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isFailed ? 'failed' : ''}`}
                      aria-label={isDone ? 'Completed step' : isActive ? 'Current step' : 'Upcoming step'}
                    >
                      {isDone ? '✓' : step.icon}
                    </div>
                    {!isLast && (
                      <div className={`step-line ${isDone && !(isDeliveryFailed && step.key === 'out_for_delivery') ? 'done' : ''}`} />
                    )}
                  </div>
                  <div className="step-content">
                    <div
                      className={`step-label ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isFailed ? 'failed' : ''}`}
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
                </Fragment>
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

          {orderIssueAllowed && <section className="tracker-issue-section" aria-label="Report an order issue">
            <div><h3>Need help with this order?</h3><p>Send our team an issue report and we’ll follow up.</p></div>
            {!issueFormOpen && <button type="button" className="tracker-issue-button" onClick={() => { setIssueError(''); setIssueFormOpen(true); }}>Report Order Issues</button>}
            {issueFeedback && <p className="tracker-issue-success" role="status">{issueFeedback}</p>}
            {issueError && <p className="tracker-issue-error" role="alert">{issueError}</p>}
            {issueFormOpen && <form className="tracker-issue-form" onSubmit={submitOrderIssue}>
              <label htmlFor="order-issue-tag">What went wrong?</label>
              <select id="order-issue-tag" value={issueTag} onChange={(event) => setIssueTag(event.target.value)} required>
                <option value="">Select an issue</option>
                {ORDER_ISSUE_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <label htmlFor="order-issue-message">Additional details (optional)</label>
              <textarea id="order-issue-message" rows="3" maxLength="2000" value={issueMessage} onChange={(event) => setIssueMessage(event.target.value)} placeholder="Tell us a little more about the issue." />
              <div className="tracker-issue-actions"><button type="submit" className="tracker-issue-button" disabled={issueSending || !issueTag}>{issueSending ? 'Sending…' : 'Send report'}</button><button type="button" className="tracker-issue-cancel" onClick={() => setIssueFormOpen(false)}>Cancel</button></div>
            </form>}
          </section>}

          <Link to="/profile" className="tracker-back-btn">
            ← Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
