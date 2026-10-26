CREATE TABLE `tables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `table_number` varchar(20) NOT NULL,
  `zone` enum('Indoor','Patio','Bar') NOT NULL,
  `capacity` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tables_number_zone` (`table_number`,`zone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `tables` (`table_number`, `zone`, `capacity`) VALUES
('1','Indoor',2),('2','Indoor',2),('3','Indoor',4),('4','Indoor',4),('5','Indoor',6),('6','Indoor',8),
('1','Patio',2),('2','Patio',4),('3','Patio',4),('4','Patio',6),('5','Patio',8),
('1','Bar',1),('2','Bar',1),('3','Bar',1),('4','Bar',1);

ALTER TABLE `reservations`
  ADD COLUMN `table_id` int DEFAULT NULL,
  ADD KEY `idx_res_table_slot` (`table_id`,`reservation_date`,`time_slot`,`status`),
  ADD CONSTRAINT `fk_res_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
