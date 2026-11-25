ALTER TABLE reservations
  ADD COLUMN start_time TIME NULL AFTER time_slot,
  ADD COLUMN end_time TIME NULL AFTER start_time,
  ADD KEY idx_res_date_range (reservation_date, start_time, end_time, status);

UPDATE reservations
SET start_time = COALESCE(start_time, TIME(time_slot)),
    end_time = COALESCE(end_time, ADDTIME(TIME(time_slot), '01:00:00'))
WHERE start_time IS NULL OR end_time IS NULL;