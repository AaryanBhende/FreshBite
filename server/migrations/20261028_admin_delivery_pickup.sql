ALTER TABLE orders
  MODIFY COLUMN delivery_status ENUM('assigned', 'accepted', 'picked_up', 'delivered', 'failed') NULL DEFAULT NULL;