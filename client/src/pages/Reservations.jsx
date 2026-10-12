import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import '../assets/style/reservations.css';

export default function Reservations() {
  const { user, token } = useContext(AuthContext);

  useEffect(() => {
  window.scrollTo(0, 0);
  }, []);

  // Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    guest_name: user?.name || '',
    guest_email: user?.email || '',
    reservation_date: todayStr,
    time_slot: '',
    party_size: 2,
    seating_pref: 'No Preference',
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

  // Fetch slot availability whenever reservation_date changes
  useEffect(() => {
    fetchAvailability(formData.reservation_date);
  }, [formData.reservation_date]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'party_size' ? parseInt(value, 10) || 1 : value,
    }));
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

    if (!formData.time_slot) {
      setFeedback({ msg: 'Please select an available 30-minute time slot.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ msg: data.error || 'Failed to complete reservation.', type: 'error' });
        // Refresh availability in case capacity changed
        fetchAvailability(formData.reservation_date);
      } else {
        setConfirmedBooking(data.reservation);
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

  // Check if selected slot has enough seats for the requested party_size
  const selectedSlotObj = availability.find((s) => s.time_slot === formData.time_slot);
  const exceedsCapacity =
    selectedSlotObj && formData.party_size > selectedSlotObj.available;

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
                <strong>Date &amp; Time:</strong> {confirmedBooking.reservation_date} at {confirmedBooking.time_slot}
              </p>
              <p>
                <strong>Party Size:</strong> {confirmedBooking.party_size} Guests
              </p>
              <p>
                <strong>Seating Preference:</strong> {confirmedBooking.seating_pref}
              </p>
              <p className="reservation-confirmation-status">
                <strong>Status:</strong>{' '}
                <span className="res-status-badge status-Confirmed">
                  {confirmedBooking.status}
                </span>
              </p>
            </div>

            <div className="reservation-confirmation-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setConfirmedBooking(null);
                  setFormData((prev) => ({ ...prev, time_slot: '', special_requests: '' }));
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
            <h2>Guest &amp; Party Details</h2>

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
                  <label htmlFor="party_size">Number of Guests (1–20) *</label>
                  <input
                    id="party_size"
                    name="party_size"
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.party_size}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="seating_pref">Seating Area Preference</label>
                  <select
                    id="seating_pref"
                    name="seating_pref"
                    value={formData.seating_pref}
                    onChange={handleInputChange}
                  >
                    <option value="No Preference">No Preference</option>
                    <option value="Indoor">Indoor (Air-Conditioned)</option>
                    <option value="Outdoor">Outdoor Garden Patio</option>
                    <option value="Bar">Bar Counter</option>
                  </select>
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
                    Select 30-Minute Time Slot for {formData.reservation_date}
                  </h3>
                  <div className="slots-legend">
                    <span className="legend-item">
                      <span className="legend-dot available" /> Available
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot filling" /> Limited Seats
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
                    {availability.map((slot) => {
                      const isSelected = formData.time_slot === slot.time_slot;
                      const hasRoom = slot.available >= formData.party_size;
                      const isLow = slot.available > 0 && slot.available <= 6;
                      const isFull = slot.available === 0 || !hasRoom;

                      return (
                        <button
                          key={slot.time_slot}
                          type="button"
                          className={`slot-btn ${isSelected ? 'selected' : ''} ${
                            isFull ? 'slot-full' : ''
                          }`}
                          disabled={isFull}
                          onClick={() => handleSlotSelect(slot)}
                          title={`${slot.time_slot}: ${slot.available} seats left of ${slot.capacity}`}
                        >
                          <span className="slot-time">{slot.time_slot}</span>
                          <span className={`slot-seats ${isLow ? 'low-seats' : ''}`}>
                            {slot.available === 0
                              ? 'Full'
                              : `${slot.available} seat${slot.available === 1 ? '' : 's'}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {exceedsCapacity && (
                <div className="capacity-warning">
                  ⚠️ The selected time slot ({formData.time_slot}) has only {selectedSlotObj.available} seats
                  available, which is less than your party of {formData.party_size}. Please select another slot.
                </div>
              )}

              {feedback.msg && (
                <div className={`res-feedback ${feedback.type}`}>{feedback.msg}</div>
              )}

              <button
                type="submit"
                className="res-submit-btn"
                disabled={submitting || !formData.time_slot || exceedsCapacity}
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
    </main>
  );
}
