CREATE TABLE IF NOT EXISTS `reservation_tables` (
  `reservation_id` varchar(60) NOT NULL,
  `table_id` int NOT NULL,
  PRIMARY KEY (`reservation_id`, `table_id`),
  KEY `idx_reservation_tables_table` (`table_id`),
  CONSTRAINT `fk_reservation_tables_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reservation_tables_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `reservation_tables` (`reservation_id`, `table_id`)
SELECT `id`, `table_id` FROM `reservations` WHERE `table_id` IS NOT NULL;
