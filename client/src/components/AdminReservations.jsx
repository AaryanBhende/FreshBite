import React, { useState, useEffect } from 'react';
import '../assets/style/reservations.css';
import ReservationFloorMap from './ReservationFloorMap';
import { formatReservationSlot, getLocalReservationDate, RESERVATION_TIME_SLOTS } from '../utils/reservationSlots';

export default function AdminReservations({ token }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const todayStr = getLocalReservationDate(currentTime);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Filters state
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [mapSlot, setMapSlot] = useState('12:00');
  const [floorTables, setFloorTables] = useState([]);
  const [loadingFloor, setLoadingFloor] = useState(false);

  // Data state
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Walk-in modal state
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinData, setWalkinData] = useState({
    guest_name: 'Walk-in Guest',
    guest_email: 'walkin@freshbite.cafe',
    reservation_date: todayStr,
    time_slot: '12:00',
    party_size: '',
    table_id: '',
    special_requests: 'Walk-in party',
    status: 'Seated',
  });
  const [walkinFeedback, setWalkinFeedback] = useState({ msg: '', type: '' });
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinTables, setWalkinTables] = useState([]);
  const [selectedWalkinTable, setSelectedWalkinTable] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, [selectedDate, selectedStatus, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const date = selectedDate || todayStr;
    const refreshFloor = async () => {
      setLoadingFloor(true);
      try {
        const res = await fetch(`/api/tables/availability?date=${encodeURIComponent(date)}&time_slot=${encodeURIComponent(mapSlot)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load floor map.');
        if (!cancelled) setFloorTables(data.tables || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingFloor(false);
      }
    };
    refreshFloor();
    const refreshTimer = setInterval(refreshFloor, 15000);
    return () => { cancelled = true; clearInterval(refreshTimer); };
  }, [selectedDate, mapSlot, token]);

  useEffect(() => {
    if (!showWalkinModal) return;
    let cancelled = false;
    setSelectedWalkinTable(null);
    setWalkinData((prev) => ({ ...prev, table_id: '', party_size: '' }));
    setWalkinTables([]);
    if (!walkinData.reservation_date || !walkinData.time_slot) {
      return () => { cancelled = true; };
    }
    const [hour] = walkinData.time_slot.split(':').map(Number);
    const availabilitySlot = `${String(hour).padStart(2, '0')}:00`;
    fetch(`/api/tables/availability?date=${encodeURIComponent(walkinData.reservation_date)}&time_slot=${encodeURIComponent(availabilitySlot)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load table availability.');
      if (!cancelled) setWalkinTables(data.tables || []);
    }).catch((err) => { if (!cancelled) setWalkinFeedback({ msg: err.message, type: 'error' }); });
    return () => { cancelled = true; };
  }, [showWalkinModal, walkinData.reservation_date, walkinData.time_slot, token]);

  const fetchReservations = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedStatus && selectedStatus !== 'All') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/reservations/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to fetch reservations.');
      }
      const data = await res.json();
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReservations();
  };

  const handleStatusChange = async (resId, newStatus) => {
    try {
      const res = await fetch(`/api/reservations/admin/${resId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state smoothly
        setReservations((prev) =>
          prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
        );
        const mapRes = await fetch(`/api/tables/availability?date=${encodeURIComponent(selectedDate || todayStr)}&time_slot=${encodeURIComponent(mapSlot)}`, { headers: { Authorization: `Bearer ${token}` } });
        const mapData = await mapRes.json();
        if (mapRes.ok) setFloorTables(mapData.tables || []);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update status.');
      }
    } catch (err) {
      alert('Network error updating status.');
    }
  };

  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    setWalkinFeedback({ msg: '', type: '' });
    setWalkinSubmitting(true);

    try {
      const res = await fetch('/api/reservations/admin/walkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(walkinData),
      });

      const data = await res.json();
      if (!res.ok) {
        setWalkinFeedback({ msg: data.error || 'Failed to record walk-in.', type: 'error' });
      } else {
        setWalkinFeedback({ msg: 'Walk-in seated successfully!', type: 'success' });
        setTimeout(() => {
          setShowWalkinModal(false);
          setWalkinFeedback({ msg: '', type: '' });
          fetchReservations();
        }, 800);
      }
    } catch (err) {
      setWalkinFeedback({ msg: 'Network error.', type: 'error' });
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // Stats calculation
  const totalGuests = reservations
    .filter((r) => r.status !== 'Cancelled')
    .reduce((sum, r) => sum + r.party_size, 0);
  const countPending = reservations.filter((r) => r.status === 'Pending').length;
  const countConfirmed = reservations.filter((r) => r.status === 'Confirmed').length;
  const countSeated = reservations.filter((r) => r.status === 'Seated').length;
  const countCompleted = reservations.filter((r) => r.status === 'Completed').length;

  // Group by time_slot for Calendar/Timeline view
  const timeSlotGroups = {};
  for (const r of reservations) {
    if (!timeSlotGroups[r.time_slot]) {
      timeSlotGroups[r.time_slot] = [];
    }
    timeSlotGroups[r.time_slot].push(r);
  }
  const sortedSlots = Object.keys(timeSlotGroups).sort();

  return (
    <div className="admin-res-container">
      {/* ── Toolbar & Filters ── */}
      <div className="admin-res-toolbar">
        <div className="admin-res-filters">
          <div className="admin-filter-item">
            <label htmlFor="filter-date">Date:</label>
            <input
              id="filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {selectedDate && (
              <button
                type="button"
                className="btn-secondary admin-filter-clear"
                onClick={() => setSelectedDate('')}
              >
                All Dates
              </button>
            )}
          </div>

          <div className="admin-filter-item">
            <label htmlFor="filter-status">Status:</label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Seated">Seated</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="admin-res-search">
            <input
              type="text"
              placeholder="Search guest or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-res-search-input"
            />
            <button
              type="submit"
              className="btn-secondary admin-res-search-button"
            >
              Search
            </button>
          </form>
        </div>

        <div className="admin-res-actions">
          {/* View toggle */}
          <div className="admin-view-toggle">
            <button
              type="button"
              className={`admin-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List View
            </button>
            <button
              type="button"
              className={`admin-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Slot Grid
            </button>
          </div>

          {/* Action: Record Walk-in Party */}
          <button
            type="button"
            className="btn-primary admin-res-walkin-button"
            onClick={() => {
              setWalkinData((prev) => ({
                ...prev,
                reservation_date: selectedDate || todayStr,
              }));
              setShowWalkinModal(true);
            }}
          >
            + Record Walk-in
          </button>
        </div>
      </div>

      {/* ── Stats Summary Bar ── */}
      <div className="admin-res-stats">
        <div className="res-stat-card">
          <div className="res-stat-number">{reservations.length}</div>
          <div className="res-stat-label">Total Bookings</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number">{totalGuests}</div>
          <div className="res-stat-label">Total Guests</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number stat-pending">
            {countPending}
          </div>
          <div className="res-stat-label">Pending</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number stat-confirmed">
            {countConfirmed}
          </div>
          <div className="res-stat-label">Confirmed</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number stat-seated">
            {countSeated}
          </div>
          <div className="res-stat-label">Seated</div>
        </div>
        <div className="res-stat-card">
          <div className="res-stat-number stat-completed">
            {countCompleted}
          </div>
          <div className="res-stat-label">Completed</div>
        </div>
      </div>

      {loading && <p className="admin-res-loading">Loading reservations…</p>}
      {error && <p className="admin-res-error">{error}</p>}

      <section className="admin-floor-panel">
        <div className="admin-floor-heading">
          <div><h3>Restaurant floor map</h3><p>Table status for {selectedDate || todayStr}</p></div>
          <label className="admin-filter-item" htmlFor="floor-map-slot">Time slot:
            <select id="floor-map-slot" value={mapSlot} onChange={(e) => setMapSlot(e.target.value)}>
              {RESERVATION_TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{formatReservationSlot(slot)}</option>)}
            </select>
          </label>
        </div>
        {loadingFloor ? <p>Refreshing table statuses…</p> : <ReservationFloorMap tables={floorTables} admin />}
      </section>

      {/* ── View 1: List / Table View ── */}
      {!loading && viewMode === 'list' && (
        <div className="admin-table-wrapper">
          {reservations.length === 0 ? (
            <p className="admin-res-empty">
              No reservations found matching the selected filters.
            </p>
          ) : (
            <table className="admin-res-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest Name</th>
                  <th>Contact Email</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Party</th>
                  <th>Table</th>
                  <th>Requests</th>
                  <th>Status Action</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code className="admin-res-id">{r.id}</code>
                    </td>
                    <td>
                      <strong>{r.guest_name}</strong>
                    </td>
                    <td>
                      <a className="admin-res-email" href={`mailto:${r.guest_email}`}>
                        {r.guest_email}
                      </a>
                    </td>
                    <td className="admin-res-date">{r.reservation_date}</td>
                    <td>
                      <strong>{formatReservationSlot(r.time_slot)}</strong>
                    </td>
                    <td>
                      <strong>{r.party_size}</strong> {r.party_size === 1 ? 'guest' : 'guests'}
                    </td>
                    <td>{r.table_number ? `${r.table_zone === 'Bar' ? 'Bar-' : ''}${r.table_number} · ${r.table_zone}` : 'Unassigned'}</td>
                    <td className="admin-res-requests">
                      {r.special_requests || '—'}
                    </td>
                    <td>
                      <select
                        className={`status-select status-${r.status}`}
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Seated">Seated</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── View 2: Calendar / Hourly Slot Grid View ── */}
      {!loading && viewMode === 'calendar' && (
        <div className="calendar-view-container">
          <div className="calendar-day-header">
            <div>
              <h3 className="admin-res-timeline-title">
                Timeline Schedule for {selectedDate || 'All Dates'}
              </h3>
      <p className="admin-res-timeline-description">
                Visual view of booked tables organized by one-hour intervals
              </p>
            </div>
            <span className="admin-res-capacity-note">Availability is tracked by table</span>
          </div>

          {sortedSlots.length === 0 ? (
            <div className="reservation-card admin-res-empty-calendar">
              No reservations scheduled for this date.
            </div>
          ) : (
            <div className="calendar-slots-grid">
              {sortedSlots.map((slot) => {
                const parties = timeSlotGroups[slot];
                const activeParties = parties.filter((p) => ['Pending', 'Confirmed', 'Seated'].includes(p.status));
                const assignedTables = new Set(activeParties.map((party) => party.table_id).filter(Boolean));
                const slotOccupancy = assignedTables.size + activeParties.filter((party) => !party.table_id).length;

                return (
                  <div className="slot-block" key={slot}>
                    <div className="slot-block-header">
                      <span className="slot-block-time">🕒 {formatReservationSlot(slot)}</span>
                      <span className="slot-occupancy-pill">{slotOccupancy} reserved table{slotOccupancy === 1 ? '' : 's'}</span>
                    </div>

                    <div className="slot-reservations-list">
                      {parties.map((p) => (
                        <div className="slot-party-card" key={p.id}>
                          <div className="party-card-top">
                            <span className="party-guest-name">{p.guest_name}</span>
                            <select
                              className={`status-select status-${p.status} admin-res-calendar-status`}
                              value={p.status}
                              onChange={(e) => handleStatusChange(p.id, e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Seated">Seated</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div className="party-card-details">
                            <span>👥 {p.party_size} guests</span>
                            <span>• {p.table_number ? `${p.table_zone === 'Bar' ? 'Bar-' : ''}${p.table_number}` : 'Unassigned table'}</span>
                          </div>
                          {p.special_requests && (
                            <div className="admin-res-special-requests">
                              "{p.special_requests}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Walk-in Modal ── */}
      {showWalkinModal && (
        <div className="modal-backdrop">
          <div className="walkin-modal-content">
            <h3>Record Walk-in Party</h3>
            <p className="admin-res-walkin-description">
              Directly assign table capacity to walk-in guests with real-time capacity check.
            </p>

            <form onSubmit={handleWalkinSubmit}>
              <div className="res-form-grid">
                <div className="res-form-group">
                  <label htmlFor="w-name">Guest Name</label>
                  <input
                    id="w-name"
                    type="text"
                    required
                    value={walkinData.guest_name}
                    onChange={(e) => setWalkinData({ ...walkinData, guest_name: e.target.value })}
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="w-date">Date</label>
                  <input
                    id="w-date"
                    type="date"
                    required
                    min={todayStr}
                    value={walkinData.reservation_date}
                    onChange={(e) =>
                      setWalkinData({ ...walkinData, reservation_date: e.target.value })
                    }
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="w-slot">Walk-in time</label>
                  <input
                    id="w-slot"
                    type="time"
                    required
                    value={walkinData.time_slot}
                    onChange={(e) => setWalkinData({ ...walkinData, time_slot: e.target.value })}
                  />
                </div>

                <div className="res-form-group">
                  <label htmlFor="w-status">Initial Status</label>
                  <select
                    id="w-status"
                    value={walkinData.status}
                    onChange={(e) => setWalkinData({ ...walkinData, status: e.target.value })}
                  >
                    <option value="Seated">Seated (Active)</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>

                <div className="res-form-group span-full">
                  <label htmlFor="w-notes">Notes</label>
                  <input
                    id="w-notes"
                    type="text"
                    value={walkinData.special_requests}
                    onChange={(e) =>
                      setWalkinData({ ...walkinData, special_requests: e.target.value })
                    }
                  />
                </div>
              </div>

              <section className="walkin-table-selection">
                <h4>Select an available table</h4>
                <ReservationFloorMap
                  tables={walkinTables}
                  selectedId={selectedWalkinTable?.id}
                  onSelect={(table) => {
                    setSelectedWalkinTable(table);
                    setWalkinData((prev) => ({ ...prev, table_id: table.id, party_size: 1 }));
                  }}
                />
                {selectedWalkinTable && (
                  <div className="res-form-group selected-table-guests">
                    <label htmlFor="w-size">Guests at table (maximum {selectedWalkinTable.capacity})</label>
                    <input
                      id="w-size"
                      type="number"
                      min="1"
                      max={selectedWalkinTable.capacity}
                      required
                      value={walkinData.party_size}
                      onChange={(event) => setWalkinData((prev) => ({ ...prev, party_size: event.target.value === '' ? '' : Math.min(Number(event.target.value), selectedWalkinTable.capacity) }))}
                    />
                  </div>
                )}
              </section>

              {walkinFeedback.msg && (
                <div className={`res-feedback admin-res-feedback ${walkinFeedback.type}`}>
                  {walkinFeedback.msg}
                </div>
              )}

              <div className="modal-btn-row">
                <button type="submit" className="btn-primary" disabled={walkinSubmitting || !selectedWalkinTable || !walkinData.party_size || walkinData.party_size > (selectedWalkinTable?.capacity || 0)}>
                  {walkinSubmitting ? 'Recording…' : 'Confirm & Seat Walk-in'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowWalkinModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
