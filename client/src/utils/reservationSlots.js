export const RESERVATION_TIME_SLOTS = Array.from({ length: 13 }, (_, index) => `${String(index + 9).padStart(2, '0')}:00`);

export const getLocalReservationDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isReservationSlotInPast = (date, slot, now = new Date()) => {
  if (!date || !slot) return false;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = slot.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
};

const formatMinutes = (minutes) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const value = hour % 12 || 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${value}:${String(minute).padStart(2, '0')} ${period}`;
};

export const formatReservationSlot = (slot) => {
  return formatReservationRange(slot, addReservationHours(slot, 1));
};

export const addReservationHours = (slot, hours = 1) => {
  const [hour] = slot.split(':').map(Number);
  return `${String(hour + Number(hours)).padStart(2, '0')}:00`;
};

export const getReservationRange = (slot, durationHours = 1) => ({ start: slot, end: addReservationHours(slot, durationHours) });

export const formatReservationRange = (start, end) => {
  const toMinutes = (value) => value.split(':').map(Number).reduce((h, m) => h * 60 + m);
  return `${formatMinutes(toMinutes(start))} – ${formatMinutes(toMinutes(end))}`;
};
