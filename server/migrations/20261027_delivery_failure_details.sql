ALTER TABLE orders
  ADD COLUMN delivery_failure_details TEXT NULL AFTER delivery_failure_reason;
