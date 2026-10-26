ALTER TABLE users
  MODIFY COLUMN role ENUM('user','admin','driver','kitchen') DEFAULT 'user';

ALTER TABLE menu_items
  ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE orders
  ADD COLUMN kitchen_status ENUM('pending','preparing','ready') NOT NULL DEFAULT 'pending',
  ADD COLUMN is_cooked TINYINT(1) NOT NULL DEFAULT 0,
  ADD KEY idx_orders_kitchen (kitchen_status, created_at);
