ALTER TABLE users
  MODIFY role ENUM('user', 'admin', 'driver') DEFAULT 'user';

ALTER TABLE orders
  ADD COLUMN driver_id VARCHAR(50) NULL,
  ADD COLUMN delivery_status ENUM('assigned', 'accepted', 'delivered', 'failed') NULL,
  ADD COLUMN delivery_failure_reason TEXT NULL,
  ADD KEY idx_orders_driver_delivery (driver_id, delivery_status),
  ADD CONSTRAINT fk_orders_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
