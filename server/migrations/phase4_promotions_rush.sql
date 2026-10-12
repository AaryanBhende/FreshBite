-- Additive migration for existing FreshBite databases.
CREATE TABLE IF NOT EXISTS `promotions` (
  `code` varchar(50) NOT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_val` decimal(10,2) NOT NULL,
  `min_order` decimal(10,2) NOT NULL DEFAULT '0.00',
  `expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(100) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('rush_override', 'automatic');

CREATE TABLE IF NOT EXISTS `order_promotions` (
  `order_id` varchar(50) NOT NULL,
  `promotion_code` varchar(50) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
