ALTER TABLE `orders`
  ADD COLUMN `table_id` int DEFAULT NULL,
  ADD KEY `idx_orders_table` (`table_id`),
  ADD CONSTRAINT `fk_orders_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
