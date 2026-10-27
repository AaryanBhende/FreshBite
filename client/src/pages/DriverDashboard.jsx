import React, { useContext, useEffect, useState } from 'react';
import { GoogleMap, Marker, OverlayView, Polyline, useLoadScript } from '@react-google-maps/api';
import { AuthContext } from '../context/AuthContext';
import { readJsonResponse } from '../utils/readJsonResponse';
import '../assets/style/profile.css';

const FAILURE_REASONS = [
  'Customer not available',
  'Missing/destroyed one or more item',
  'Wrong order',
];

const CAFE_LOCATION = { lat: 15.48, lng: 73.808 };

function DriverDeliveryRoute({ coordinates, address }) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY });
  const [map, setMap] = useState(null);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');
  const origin = CAFE_LOCATION;
  const destination = typeof coordinates === 'string' ? coordinates.split(',').map(Number) : [];
  const valid = destination.length === 2 && Number.isFinite(destination[0]) && Number.isFinite(destination[1]) && Math.abs(destination[0]) <= 90 && Math.abs(destination[1]) <= 180;

  useEffect(() => {
    if (!isLoaded || !map || !valid) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { Route } = await window.google.maps.importLibrary('routes');
        const result = await Route.computeRoutes({
          origin: CAFE_LOCATION,
          destination: { lat: destination[0], lng: destination[1] },
          travelMode: 'DRIVING',
          fields: ['path', 'viewport', 'distanceMeters', 'durationMillis'],
        });
        const data = result.routes?.[0];
        if (!data?.path?.length) throw new Error('No driving route returned.');
        if (cancelled) return;
        setRoute(data);
        setError('');
        const bounds = new window.google.maps.LatLngBounds();
        data.path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, 36);
      } catch {
        if (!cancelled) setError('A road route could not be calculated for this delivery location.');
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, map, coordinates, valid]);

  if (!valid) return <p className="driver-route-message">Route coordinates are not available for this delivery.</p>;
  if (loadError) return <p className="driver-route-message">Google Maps could not be loaded.</p>;
  if (!isLoaded) return <div className="driver-route-map driver-route-loading" role="status">Loading delivery route…</div>;
  return <div className="driver-route-panel">
    <GoogleMap mapContainerClassName="driver-route-map" center={CAFE_LOCATION} zoom={13} options={{ scrollwheel: false, streetViewControl: false, mapTypeControl: false }} onLoad={setMap}>
      {route && <Polyline path={route.path} options={{ strokeColor: '#2e7d32', strokeOpacity: .88, strokeWeight: 5 }} />}
      <OverlayView position={origin} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <div className="tracker-cafe-icon" title="FreshBite Cafe · Miramar, Panaji" aria-label="FreshBite Cafe">☕</div>
      </OverlayView>
      <Marker position={{ lat: destination[0], lng: destination[1] }} title={address || 'Delivery destination'} />
    </GoogleMap>
    <div className="driver-route-summary"><strong>FreshBite Cafe → Delivery address</strong>
      {route && <span>{(route.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(route.durationMillis / 60000))} min driving</span>}
      {error && <span role="status">{error}</span>}
    </div>
  </div>;
}

export default function DriverDashboard() {
  const { token, user, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [reasons, setReasons] = useState({});
  const [failureDetails, setFailureDetails] = useState({});
  const [deliveryOtps, setDeliveryOtps] = useState({});
  const [otpExpiries, setOtpExpiries] = useState({});
  const [message, setMessage] = useState('');
  const [activeView, setActiveView] = useState('deliveries');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [chartRange, setChartRange] = useState('daily');
  const load = async () => {
    try {
      const response = await fetch('/api/orders/driver/assigned', { headers: { Authorization: `Bearer ${token}` } });
      const data = await readJsonResponse(response);
      if (response.ok) setOrders(data);
      else setMessage(data.error || 'Could not refresh assigned deliveries.');
    } catch { setMessage('Could not refresh assigned deliveries.'); }
  };
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [token]);
  useEffect(() => {
    if (activeView !== 'analytics') return;
    let cancelled = false;
    setAnalyticsLoading(true); setAnalyticsError('');
    fetch('/api/orders/driver/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        const data = await readJsonResponse(response);
        if (!response.ok) throw new Error(data.error || 'Could not load earnings analytics.');
        if (!cancelled) setAnalytics(data);
      })
      .catch(error => { if (!cancelled) setAnalyticsError(error.message); })
      .finally(() => { if (!cancelled) setAnalyticsLoading(false); });
    return () => { cancelled = true; };
  }, [activeView, token]);
  const update = async (orderId, status) => {
    setMessage('');
    try {
      const response = await fetch(`/api/orders/driver/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason: reasons[orderId] || '', details: failureDetails[orderId] || '' }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not update delivery.');
      setMessage(data.message);
      if (status === 'failed') setDeliveryOtps(current => { const next = { ...current }; delete next[orderId]; return next; });
      await load();
    } catch (error) { setMessage(error.message); }
  };
  const generateDeliveryOtp = async (orderId) => {
    setMessage('');
    try {
      const response = await fetch(`/api/orders/driver/${encodeURIComponent(orderId)}/delivery-otp`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not generate the delivery code.');
      setDeliveryOtps(current => ({ ...current, [orderId]: data.otp }));
      setOtpExpiries(current => ({ ...current, [orderId]: data.expires_at }));
      setMessage(data.message);
      await load();
    } catch (error) { setMessage(error.message); }
  };
  const chartRows = chartRange === 'daily' ? (analytics?.daily || []) : (analytics?.weekly || []);
  const chartMax = Math.max(1, ...chartRows.map(row => Number(row.earnings) || 0));
  const currency = value => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return <main className="driver-dashboard">
    <section className="driver-dashboard-heading">
      <div><p className="driver-dashboard-eyebrow">FreshBite delivery team</p><h1>Welcome, {user?.name}</h1>
        <p>Manage your assigned deliveries and keep customers updated.</p></div>
      <span className="driver-active-count">{orders.length} active {orders.length === 1 ? 'delivery' : 'deliveries'}</span>
    </section>
    <nav className="driver-dashboard-tabs" aria-label="Driver dashboard sections">
      <button className={activeView === 'deliveries' ? 'active' : ''} onClick={() => setActiveView('deliveries')}>Deliveries</button>
      <button className={activeView === 'analytics' ? 'active' : ''} onClick={() => setActiveView('analytics')}>Analytics &amp; Earnings</button>
    </nav>
    {message && activeView === 'deliveries' && <p className="driver-dashboard-message" role="status">{message}</p>}
    {activeView === 'analytics' ? <section className="driver-analytics">
      <div className="driver-section-heading"><div><h2>Analytics &amp; Earnings</h2><p>Your earnings include delivery fees and 100% of customer tips.</p></div></div>
      {analyticsLoading && !analytics ? <p role="status">Loading your earnings…</p> : analyticsError ? <p className="driver-dashboard-message" role="alert">{analyticsError}</p> : analytics && <>
        <div className="driver-kpi-grid">
          <article className="driver-kpi-card"><span>Total earnings</span><strong>{currency(analytics.total_earnings)}</strong><small>{currency(analytics.total_delivery_fees)} fees + {currency(analytics.total_tips)} tips</small></article>
          <article className="driver-kpi-card"><span>Completed deliveries</span><strong>{Number(analytics.total_completed_deliveries) || 0}</strong><small>Successfully delivered</small></article>
          <article className="driver-kpi-card"><span>Average tip</span><strong>{currency(analytics.average_tip)}</strong><small>Per completed delivery</small></article>
        </div>
        <section className="driver-earnings-chart">
          <header><div><h3>Earnings over time</h3><p>Completed deliveries and their driver earnings</p></div>
            <div className="driver-chart-switch" role="group" aria-label="Earnings time period">
              <button className={chartRange === 'daily' ? 'active' : ''} onClick={() => setChartRange('daily')}>Daily</button>
              <button className={chartRange === 'weekly' ? 'active' : ''} onClick={() => setChartRange('weekly')}>Weekly</button>
            </div>
          </header>
          {!chartRows.length ? <p className="driver-chart-empty">Completed delivery earnings will appear here.</p> : <div className="driver-chart-rows">
            {chartRows.map(row => <div className="driver-chart-row" key={row.date || row.week_start}>
              <span className="driver-chart-period">{new Date(`${row.date || row.week_start}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{chartRange === 'weekly' ? ' week' : ''}</span>
              <div className="driver-chart-track"><span style={{ width: `${Math.max(4, (Number(row.earnings) / chartMax) * 100)}%` }} /></div>
              <strong>{currency(row.earnings)}</strong><small>{row.deliveries} {row.deliveries === 1 ? 'delivery' : 'deliveries'}</small>
            </div>)}
          </div>}
        </section>
      </>}
    </section> : <>
    <div className="driver-section-heading"><div><h2>Your deliveries</h2><p>New assignments appear here automatically.</p></div></div>
    {!orders.length ? <section className="driver-empty-state"><span aria-hidden="true">🛵</span><h3>You’re all caught up</h3><p>No deliveries are assigned right now. Keep this page open for new orders.</p></section> : <div className="driver-order-list">{orders.map(order => <article className="driver-order-card" key={order.order_id}>
      <header className="driver-order-card-heading"><div><span className="driver-order-label">DELIVERY ORDER</span><h3>#{order.order_id}</h3></div>
        <span className={`driver-status-pill driver-status-pill--${order.delivery_status}`}>{order.delivery_status === 'assigned' ? 'Awaiting acceptance' : order.delivery_status === 'accepted' ? 'Awaiting pickup confirmation' : order.delivery_status === 'awaiting_otp' ? 'Awaiting customer code' : 'Picked up · en route'}</span>
      </header>
      <div className="driver-order-facts">
        <div><span>Customer</span><strong>{order.customer_name || 'Guest'}</strong></div>
        <div><span>Delivery address</span><strong>{order.address || 'Address unavailable'}</strong></div>
      </div>
      <section className="driver-route-section" aria-label={`Delivery route for order ${order.order_id}`}>
        <h4>Delivery route</h4>
        <DriverDeliveryRoute coordinates={order.coordinates} address={order.address} />
      </section>
      <div className="driver-order-items"><h4>Order items</h4><ul>{order.items.map((item, index) => <li key={`${item.title}-${index}`}><span>{item.title}</span><strong>× {item.quantity}</strong>{item.notes && <small>{item.notes}</small>}</li>)}</ul></div>
      {order.delivery_status === 'assigned' ? <div className="driver-order-actions"><p>Accept this delivery assignment.</p><button onClick={() => update(order.order_id, 'accepted')}>Accept delivery</button></div> : order.delivery_status === 'accepted' ? <p className="driver-tracking-note">Delivery accepted · waiting for admin pickup confirmation.</p> : <>
        <p className="driver-tracking-note"><span aria-hidden="true">●</span> Pickup confirmed · customer tracking is active</p>
        <div className="driver-order-actions">{order.delivery_status === 'picked_up' ? <button onClick={() => generateDeliveryOtp(order.order_id)}>Mark as Delivered</button> : <div className="driver-delivery-otp">
          <p>Share this four-digit code with the customer to confirm delivery.</p>
          {deliveryOtps[order.order_id] ? <strong className="driver-delivery-otp-code" aria-label="Delivery verification code">{deliveryOtps[order.order_id]}</strong> : <p>The code is not available in this session. Generate a new one to continue.</p>}
          {(otpExpiries[order.order_id] || order.delivery_otp_expires_at) && <small>Expires at {new Date(otpExpiries[order.order_id] || order.delivery_otp_expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.</small>}
          <button type="button" className="driver-otp-regenerate" onClick={() => generateDeliveryOtp(order.order_id)}>Regenerate OTP</button>
        </div>}
          <div className="driver-failure-action"><label htmlFor={`reason-${order.order_id}`}>If delivery fails, select a reason</label>
            <select id={`reason-${order.order_id}`} value={reasons[order.order_id] || ''} onChange={e => setReasons({ ...reasons, [order.order_id]: e.target.value })}>
              <option value="">Choose a reason</option>
              {FAILURE_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
            </select>
            <label htmlFor={`details-${order.order_id}`}>Additional failure details (optional)</label>
            <textarea id={`details-${order.order_id}`} rows="3" maxLength="2000" placeholder="Add specific details to help the team resolve this issue." value={failureDetails[order.order_id] || ''} onChange={e => setFailureDetails({ ...failureDetails, [order.order_id]: e.target.value })} />
            <button className="driver-failed-button" disabled={!reasons[order.order_id]} onClick={() => update(order.order_id, 'failed')}>Report failed delivery</button></div>
        </div>
      </>}
    </article>)}</div>}
    </>}
  </main>;
}
