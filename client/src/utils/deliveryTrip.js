export const DELIVERY_TRIP_DURATION_MS = 45000;

const tripKey = (orderId) => `freshbite_delivery_trip_${orderId}`;

export function readDeliveryTrip(orderId) {
  if (!orderId || typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(tripKey(orderId)) || 'null');
    return Number.isFinite(value?.startedAt) ? value : null;
  } catch {
    return null;
  }
}

export function ensureDeliveryTripStarted(orderId) {
  const existing = readDeliveryTrip(orderId);
  if (existing) return existing;
  const trip = { startedAt: Date.now(), arrivalNotified: false };
  try {
    window.localStorage.setItem(tripKey(orderId), JSON.stringify(trip));
  } catch {
    // The current tab can still animate if browser storage is unavailable.
  }
  return trip;
}

export function announceDeliveryArrival(orderId) {
  if (!orderId || typeof window === 'undefined') return;
  const trip = ensureDeliveryTripStarted(orderId);
  if (trip.arrivalNotified) return;
  const updatedTrip = { ...trip, arrivalNotified: true };
  try {
    window.localStorage.setItem(tripKey(orderId), JSON.stringify(updatedTrip));
  } catch {
    // Dispatching remains useful for the current page if storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent('freshbite:delivery-arrived', { detail: { orderId } }));
}
