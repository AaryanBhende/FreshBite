import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  announceDeliveryArrival,
  DELIVERY_TRIP_DURATION_MS,
  ensureDeliveryTripStarted,
  readDeliveryTrip,
} from '../utils/deliveryTrip';

export default function GlobalDeliveryNotification() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [noticeOrderId, setNoticeOrderId] = useState(null);

  const refreshTrips = useCallback(async () => {
    if (!user || !token) return;
    try {
      const response = await fetch('/api/orders/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const orders = await response.json();
      orders.forEach((order) => {
        if (String(order.order_type).toLowerCase() !== 'delivery' || order.stage !== 'out_for_delivery') return;
        const savedTrip = readDeliveryTrip(order.order_id);
        if (!savedTrip && Date.now() - new Date(order.created_at).getTime() > 4 * 60 * 60 * 1000) return;
        const trip = savedTrip || ensureDeliveryTripStarted(order.order_id);
        if (Date.now() - trip.startedAt >= DELIVERY_TRIP_DURATION_MS) {
          announceDeliveryArrival(order.order_id);
        }
      });
    } catch {
      // Poll again on the next interval or when the tab becomes visible.
    }
  }, [user, token]);

  useEffect(() => {
    const onArrival = (event) => setNoticeOrderId(event.detail?.orderId || null);
    const onStorage = (event) => {
      if (!event.key?.startsWith('freshbite_delivery_trip_')) return;
      try {
        const trip = JSON.parse(event.newValue || 'null');
        if (trip?.arrivalNotified) setNoticeOrderId(event.key.slice('freshbite_delivery_trip_'.length));
      } catch {
        // Ignore malformed values from another browser tab.
      }
    };
    window.addEventListener('freshbite:delivery-arrived', onArrival);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('freshbite:delivery-arrived', onArrival);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!user || !token) return undefined;
    refreshTrips();
    const interval = window.setInterval(refreshTrips, 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshTrips();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, token, refreshTrips]);

  if (!noticeOrderId) return null;

  return (
    <div className="global-delivery-notice" role="status" aria-live="polite">
      <button
        className="global-delivery-notice__action"
        type="button"
        onClick={() => {
          navigate(`/track/${encodeURIComponent(noticeOrderId)}`);
          setNoticeOrderId(null);
        }}
      >
        <span aria-hidden="true">🛵</span>
        <span>Your delivery driver has arrived! <small>View order tracking</small></span>
      </button>
      <button
        className="global-delivery-notice__close"
        type="button"
        aria-label="Dismiss delivery arrival notification"
        onClick={() => setNoticeOrderId(null)}
      >
        ×
      </button>
    </div>
  );
}
