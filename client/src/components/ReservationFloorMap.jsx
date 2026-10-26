import React from 'react';
import { formatReservationSlot } from '../utils/reservationSlots';
import '../assets/style/reservationFloorMap.css';

const ZONES = [
  { key: 'Patio', title: 'Outdoor Garden Patio', description: 'Fresh air · Garden seating' },
  { key: 'Indoor', title: 'Indoor Dining · Air Conditioning', description: 'Comfortable indoor seating' },
  { key: 'Bar', title: 'Bar Counter', description: 'Counter seats' },
];

export default function ReservationFloorMap({ tables = [], selectedId, onSelect, admin = false }) {
  const grouped = tables.reduce((result, table) => {
    (result[table.zone] ||= []).push(table);
    return result;
  }, {});

  const renderTable = (table, zoneKey) => {
    const status = table.table_status || 'Free';
    const canSelect = !admin && status === 'Free';
    const isSelected = selectedId === table.id;
    const label = zoneKey === 'Bar' ? `Bar ${table.table_number}` : `Table ${table.table_number}`;
    const timeLabel = table.reservation_time ? formatReservationSlot(table.reservation_time) : '';
    return (
      <button
        type="button"
        key={table.id}
        className={`floor-table capacity-${table.capacity} ${status.toLowerCase()} ${zoneKey === 'Bar' ? 'bar-seat' : ''} ${isSelected ? 'selected' : ''} ${canSelect ? 'selectable' : ''}`}
        disabled={!canSelect}
        onClick={() => onSelect?.(table)}
        title={`${label} · ${table.capacity} ${table.capacity === 1 ? 'seat' : 'seats'} · ${status}${timeLabel ? ` · ${timeLabel}` : ''}`}
        aria-label={`${label}, ${table.capacity} ${table.capacity === 1 ? 'seat' : 'seats'}, ${status}${timeLabel ? ` at ${timeLabel}` : ''}${table.guest_name ? `, reserved by ${table.guest_name}` : ''}`}
        aria-pressed={isSelected}
      >
        <span className="floor-table-topline">
          <strong>{zoneKey === 'Bar' ? `Bar ${table.table_number}` : `Table ${table.table_number}`}</strong>
          <span className="floor-table-capacity" aria-label={`${table.capacity} seats`}>
            <span aria-hidden="true">♙</span> {table.capacity}
          </span>
        </span>
        <span className="floor-table-state">{status}</span>
        {timeLabel && <span className="floor-table-time">{timeLabel}</span>}
        {admin && table.guest_name && <span className="floor-table-guest">{table.guest_name}</span>}
      </button>
    );
  };

  return (
    <div className={`floor-map ${admin ? 'floor-map-admin' : ''}`}>
      <div className="floor-map-heading">
        <div>
          <h3>FRESHBITE · CURRENT TABLE STATUS</h3>
          <p>{admin ? 'Live table status for the selected date and hour' : 'Choose a green table to continue'}</p>
        </div>
        <div className="floor-map-legend" aria-label="Table status legend">
          <span><i className="free" />Free</span>
          <span><i className="booked" />Booked</span>
          <span><i className="occupied" />Occupied</span>
        </div>
      </div>

      <div className="floor-plan-surface">
        <section className="floor-zone floor-zone-patio" aria-labelledby="floor-patio-title">
          <header className="floor-zone-heading">
            <div><h4 id="floor-patio-title">{ZONES[0].title}</h4><p>{ZONES[0].description}</p></div>
            <span className="floor-zone-count">{(grouped.Patio || []).length} tables</span>
          </header>
          <div className="floor-table-grid patio-table-grid">
            {(grouped.Patio || []).map((table) => renderTable(table, 'Patio'))}
            {!(grouped.Patio || []).length && <p className="floor-map-empty">No patio tables configured.</p>}
          </div>
        </section>

        <div className="floor-map-lower">
          <section className="floor-zone floor-zone-indoor" aria-labelledby="floor-indoor-title">
            <header className="floor-zone-heading">
              <div><h4 id="floor-indoor-title">{ZONES[1].title}</h4><p>{ZONES[1].description}</p></div>
              <span className="floor-zone-count">{(grouped.Indoor || []).length} tables</span>
            </header>
            <div className="floor-table-grid indoor-table-grid">
              {(grouped.Indoor || []).map((table) => renderTable(table, 'Indoor'))}
              {!(grouped.Indoor || []).length && <p className="floor-map-empty">No indoor tables configured.</p>}
            </div>
          </section>

          <section className="floor-zone floor-zone-bar" aria-labelledby="floor-bar-title">
            <header className="floor-zone-heading">
              <div><h4 id="floor-bar-title">{ZONES[2].title}</h4><p>{ZONES[2].description}</p></div>
              <span className="floor-zone-count">{(grouped.Bar || []).length} seats</span>
            </header>
            <div className="bar-counter-surface">
              <div className="bar-stool-row">
                {(grouped.Bar || []).map((table) => renderTable(table, 'Bar'))}
                {!(grouped.Bar || []).length && <p className="floor-map-empty">No bar seats configured.</p>}
              </div>
              <div className="bar-counter-label">BAR COUNTER</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
