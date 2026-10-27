ALTER TABLE orders
  MODIFY COLUMN delivery_status ENUM('assigned', 'accepted', 'picked_up', 'awaiting_otp', 'delivered', 'failed') NULL DEFAULT NULL,
  ADD COLUMN delivery_otp_hash BINARY(32) NULL DEFAULT NULL AFTER delivery_status,
  ADD COLUMN delivery_otp_expires_at DATETIME NULL DEFAULT NULL AFTER delivery_otp_hash,
  ADD COLUMN delivery_otp_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER delivery_otp_expires_at;