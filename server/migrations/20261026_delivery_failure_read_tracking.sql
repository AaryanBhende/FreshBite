ALTER TABLE orders
  ADD COLUMN delivery_failure_read_at TIMESTAMP NULL DEFAULT NULL AFTER delivery_failure_reason;
