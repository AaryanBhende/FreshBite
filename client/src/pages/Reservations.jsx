import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import ReservationFloorMap from '../components/ReservationFloorMap';
import AuthModal from './AuthModal';
import { formatReservationSlot, getLocalReservationDate, isReservationSlotInPast } from '../utils/reservationSlots';
import '../assets/style/reservations.css';

export default function Reservations() {
  const { user, token } = useContext(AuthContext);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
  window.scrollTo(0, 0);
  }, []);

  // Form state
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const todayStr = getLocalReservationDate(currentTime);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [formData, setFormData] = useState({
    guest_name: user?.name || '',
    guest_email: user?.email || '',
    reservation_date: todayStr,
    time_slot: '',
    party_size: '',
    special_requests: '',
  });

  // Keep guest info updated if user signs in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        guest_name: prev.guest_name || user.name || '',
        guest_email: prev.guest_email || user.email || '',
      }));
    }
  }, [user]);

  // Availability state
  const [availability, setAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', type: '' });
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [tableAvailability, setTableAvailability] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const futureSlots = availability.filter((slot) => !isReservationSlotInPast(formData.reservation_date, slot.time_slot, currentTime));

  useEffect(() => {
    if (isReservationSlotInPast(formData.reservation_date, formData.time_slot, currentTime)) {
      setFormData((current) => ({ ...current, time_slot: '' }));
      setSelectedTable(null);
    }
  }, [formData.reservation_date, formData.time_slot, currentTime]);

  // Fetch slot availability whenever reservation_date changes
  useEffect(() => {
    fetchAvailability(formData.reservation_date);
  }, [formData.reservation_date]);

  useEffect(() => {
    setSelectedTable(null);
    setTableAvailability([]);
    if (!formData.reservation_date || !formData.time_slot) return;
    let cancelled = false;
    setLoadingTables(true);
    let firstLoad = true;
    const refreshTables = async () => {
      try {
        const res = await fetch(`/api/tables/availability?date=${encodeURIComponent(formData.reservation_date)}&time_slot=${encodeURIComponent(formData.time_slot)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load table availability.');
        if (!cancelled) {
          const nextTables = data.tables || [];
          setTableAvailability(nextTables);
          setSelectedTable((current) => current && !nextTables.some((table) => table.id === current.id && table.table_status === 'Free') ? null : current);
        }
      } catch (error) {
        if (!cancelled) setFeedback({ msg: error.message, type: 'error' });
      } finally {
        if (!cancelled && firstLoad) setLoadingTables(false);
        firstLoad = false;
      }
    };
    refreshTables();
    const refreshTimer = setInterval(refreshTables, 15000);
    return () => { cancelled = true; clearInterval(refreshTimer); };
  }, [formData.reservation_date, formData.time_slot]);

  const fetchAvailability = async (date) => {
    if (!date) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/reservations/availability?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slot availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // If date changed, reset time_slot selection
    if (name === 'reservation_date') {
      setFormData((prev) => ({ ...prev, time_slot: '' }));
    }
  };

  const handleSlotSelect = (slot) => {
    setFormData((prev) => ({ ...prev, time_slot: slot.time_slot }));
    setFeedback({ msg: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ msg: '', type: '' });

    if (!token) {
      setFeedback({ msg: 'Please log in or create an account to reserve a table.', type: 'error' });
      setIsAuthModalOpen(true);
      return;
    }

    if (!formData.time_slot) {
      setFeedback({ msg: 'Please select an available one-hour time slot.', type: 'error' });
      return;
    }
    if (!selectedTable) {
      setFeedback({ msg: 'Please choose an available table from the floor map.', type: 'error' });
      return;
    }
    if (!formData.party_size || Number(formData.party_size) < 1 || Number(formData.party_size) > Number(selectedTable.capacity)) {
      setFeedback({ msg: `Choose between 1 and ${selectedTable.capacity} guests for this table.`, type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...formData, table_id: selectedTable.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ msg: data.error || 'Failed to complete reservation.', type: 'error' });
        fetchAvailability(formData.reservation_date);
        const query = new URLSearchParams({ date: formData.reservation_date, time_slot: formData.time_slot });
        fetch(`/api/tables/availability?${query}`)
          .then(async (tableRes) => {
            const tableData = await tableRes.json();
            if (tableRes.ok) setTableAvailability(tableData.tables || []);
          })
          .catch(() => {});
        setSelectedTable(null);
      } else {
        setConfirmedBooking({
          ...data.reservation,
          table_number: selectedTable.table_number,
          table_zone: selectedTable.zone,
        });
        setFeedback({
          msg: `Table reserved successfully! Confirmation ID: ${data.reservation.id}`,
          type: 'success',
        });
        // Refresh slots
        fetchAvailability(formData.reservation_date);
      }
    } catch (err) {
      setFeedback({ msg: 'Network error. Please try again later.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="reservation-page">
      <div className="reservation-container">
        <div className="reservation-header">
          {/* <h1>Reserve Your Table</h1>
          <p>
            Experience artisan dining at FreshBite. Book your spot in real-time with instant capacity verification.
          </p> */}
        </div>

        {confirmedBooking ? (
          <div className="reservation-card reservation-confirmation">
            <div className="reservation-confirmation-icon">🎉</div>
            <h2 className="reservation-confirmation-title">Reservation Confirmed!</h2>
            <p className="reservation-confirmation-intro">
              We look forward to welcoming you, <strong>{confirmedBooking.guest_name}</strong>!
            </p>

            <div className="reservation-confirmation-details">
              <p>
                <strong>Confirmation ID:</strong> <code>{confirmedBooking.id}</code>
              </p>
              <p>
                <strong>Date &amp; Time:</strong> {confirmedBooking.reservation_date} · {formatReservationSlot(confirmedBooking.time_slot)}
              </p>
              <p>
                <strong>Party Size:</strong> {confirmedBooking.party_size} Guests
              </p>
              {confirmedBooking.table_number && (
                <p><strong>Table:</strong> {confirmedBooking.table_zone === 'Bar' ? 'Bar-' : ''}{confirmedBooking.table_number} · {confirmedBooking.table_zone}</p>
              )}
              <p className="reservation-confirmation-status">
                <strong>Status:</strong>{' '}
                <span className="res-status-badge status-Confirmed">
                  {confirmedBooking.status}
                </span>
              </p>
            </div>

            <div className="reservation-confirmation-actions">
              <button
                className="res-book-another-btn"
                onClick={() => {
                  setConfirmedBooking(null);
                  setFormData((prev) => ({ ...prev, time_slot: '', party_size: '', special_requests: '' }));
                  setSelectedTable(null);
                }}
              >
                Book Another Table
              </button>
              {user && (
                <Link to="/profile" className="tracker-back-btn reservation-profile-link">
                  View in My Profile
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="reservation-card">
          <h2>Guest Details</h2>

            <form onSubmit={handleSubmit} noValidate>
              <div className="res-form-grid">
                <div className="res-form-group">
                  <label htmlFor="guest_name">Full Name *</label>
                  <input
                    id="guest_name"
                    name="guest_name"
                    type="text"
                    required
                    placeholder="e.g. Maya Sharma"
                    value={formData.guest_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="guest_email">Email Address *</label>
                  <input
                    id="guest_email"
                    name="guest_email"
                    type="email"
                    required
                    placeholder="e.g. maya@example.com"
                    value={formData.guest_email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="reservation_date">Date of Visit *</label>
                  <input
                    id="reservation_date"
                    name="reservation_date"
                    type="date"
                    min={todayStr}
                    required
                    value={formData.reservation_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="special_requests">Special Requests / Occasion</label>
                  <input
                    id="special_requests"
                    name="special_requests"
                    type="text"
                    placeholder="e.g. Anniversary, high chair, quiet corner"
                    value={formData.special_requests}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* ── Real-Time Availability Slot Picker ── */}
              <div className="slots-section">
                <div className="slots-header">
                  <h3>
                    Select an Hour for {formData.reservation_date}
                  </h3>
                  <div className="slots-legend">
                    <span className="legend-item">
                      <span className="legend-dot available" /> Available
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot filling" /> Few Tables Left
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot full" /> Full / Unavailable
                    </span>
                  </div>
                </div>

                {loadingSlots ? (
                  <p className="reservation-slots-loading">Checking live slot availability…</p>
                ) : (
                  <div className="slots-grid">
                    {futureSlots.length ? futureSlots.map((slot) => {
                      const isSelected = formData.time_slot === slot.time_slot;
                      const isLow = slot.available > 0 && slot.available <= 3;
                      const isFull = slot.available === 0;

                      return (
                        <button
                          key={slot.time_slot}
                          type="button"
                          className={`slot-btn ${isSelected ? 'selected' : ''} ${
                            isFull ? 'slot-full' : ''
                          }`}
                          disabled={isFull}
                          onClick={() => handleSlotSelect(slot)}
                          title={`${formatReservationSlot(slot.time_slot)}: ${slot.available} tables left of ${slot.total_tables}`}
                        >
                          <span className="slot-time">{formatReservationSlot(slot.time_slot)}</span>
                          <span className={`slot-seats ${isLow ? 'low-seats' : ''}`}>
                            {slot.available === 0
                              ? 'Full'
                              : `${slot.available} table${slot.available === 1 ? '' : 's'}`}
                          </span>
                        </button>
                      );
                    }) : <p>No future time slots are available for this date.</p>}
                  </div>
                )}
              </div>

              {formData.time_slot && (
                <section className="slots-section" aria-live="polite">
                  <div className="slots-header">
                    <h3>Choose your table</h3>
                    {selectedTable && <span>Up to {selectedTable.capacity} guests</span>}
                  </div>
                  {loadingTables ? <p className="reservation-slots-loading">Loading table availability…</p> : (
                    <ReservationFloorMap
                      tables={tableAvailability}
                      selectedId={selectedTable?.id}
                      onSelect={(table) => {
                        setSelectedTable(table);
                        setFormData((prev) => ({ ...prev, party_size: 1 }));
                      }}
                    />
                  )}
                  {selectedTable && (
                    <div className="res-form-group selected-table-guests">
                      <label htmlFor="selected-table-party">Guests at {selectedTable.zone === 'Bar' ? 'Bar-' : ''}{selectedTable.table_number} (maximum {selectedTable.capacity})</label>
                      <input
                        id="selected-table-party"
                        type="number"
                        min="1"
                        max={selectedTable.capacity}
                        required
                        value={formData.party_size}
                        onChange={(event) => setFormData((prev) => ({ ...prev, party_size: event.target.value === '' ? '' : Math.min(Number(event.target.value), selectedTable.capacity) }))}
                      />
                    </div>
                  )}
                </section>
              )}

              {feedback.msg && (
                <div className={`res-feedback ${feedback.type}`}>{feedback.msg}</div>
              )}

              <button
                type="submit"
                className="res-submit-btn"
                disabled={submitting || !formData.time_slot || !selectedTable || loadingTables || !formData.party_size || formData.party_size < 1 || formData.party_size > (selectedTable?.capacity || 0)}
              >
                {submitting
                  ? 'Confirming Table…'
                  : `Reserve Table for ${formData.party_size} Guest${
                      formData.party_size > 1 ? 's' : ''
                    } at ${formData.time_slot || '...'}`}
              </button>
            </form>
          </div>
        )}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </main>
  );
}
