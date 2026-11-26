-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: freshbite_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `linked_promo_id` bigint unsigned DEFAULT NULL,
  `display_page` enum('menu') NOT NULL DEFAULT 'menu',
  `display_location` enum('header_banner','checkout_modal','hero_section') NOT NULL,
  `background_image_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_advertised` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_active_location` (`is_active`,`display_location`),
  KEY `fk_announcement_promotion` (`linked_promo_id`),
  CONSTRAINT `fk_announcement_promotion` FOREIGN KEY (`linked_promo_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client
--
-- Table structure for table `app_settings`
--
*/
DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(100) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` varchar(50) NOT NULL,
  `title` varchar(250) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'None',
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `img` varchar(255) NOT NULL,
  `calories` int DEFAULT NULL,
  `protein` decimal(5,1) DEFAULT NULL,
  `carbs` decimal(5,1) DEFAULT NULL,
  `fats` decimal(5,1) DEFAULT NULL,
  `fibre` decimal(5,1) DEFAULT NULL,
  `is_favorite` tinyint(1) NOT NULL DEFAULT '0',
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_menu_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_promotions`
--

DROP TABLE IF EXISTS `order_promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_promotions` (
  `order_id` varchar(50) NOT NULL,
  `promotion_id` bigint unsigned DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `promotion_code` varchar(50) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uq_promo_user_redemption` (`promotion_id`,`user_id`),
  CONSTRAINT `fk_order_promo_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` varchar(50) NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `title` varchar(250) NOT NULL,
  `category` varchar(100) DEFAULT 'None',
  `price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `notes` text,
  `completed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `order_type` enum('Dine In','Takeout','Delivery') DEFAULT 'Dine In',
  `address` text,
  `coordinates` varchar(100) DEFAULT NULL,
  `table_id` int DEFAULT NULL,
  `table_ids` json DEFAULT NULL,
  `driver_id` varchar(50) DEFAULT NULL,
  `delivery_status` enum('assigned','accepted','picked_up','awaiting_otp','delivered','failed') DEFAULT NULL,
  `delivery_otp_hash` binary(32) DEFAULT NULL,
  `delivery_otp_expires_at` datetime DEFAULT NULL,
  `delivery_otp_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `delivery_failure_reason` text,
  `delivery_failure_details` text,
  `delivery_failure_read_at` timestamp NULL DEFAULT NULL,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tip_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `kitchen_status` enum('pending','preparing','ready') NOT NULL DEFAULT 'pending',
  `is_cooked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`),
  KEY `idx_orders_created` (`created_at`),
  KEY `idx_orders_table` (`table_id`),
  KEY `idx_orders_driver_delivery` (`driver_id`,`delivery_status`),
  KEY `idx_orders_kitchen` (`kitchen_status`,`created_at`),
  CONSTRAINT `fk_orders_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` text,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `usage_limit` int unsigned DEFAULT NULL,
  `times_used` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_promotions_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `id` varchar(60) NOT NULL,
  `menu_item_id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `rating` tinyint unsigned NOT NULL,
  `review_text` text,
  `tags` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_moderated` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_ratings_item` (`menu_item_id`),
  KEY `idx_ratings_user` (`user_id`),
  KEY `idx_ratings_mod` (`is_moderated`),
  CONSTRAINT `fk_ratings_menu` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reservation_tables`
--

DROP TABLE IF EXISTS `reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_tables` (
  `reservation_id` varchar(60) NOT NULL,
  `table_id` int NOT NULL,
  PRIMARY KEY (`reservation_id`,`table_id`),
  KEY `idx_reservation_tables_table` (`table_id`),
  CONSTRAINT `fk_reservation_tables_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reservation_tables_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `id` varchar(60) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `guest_name` varchar(100) NOT NULL,
  `guest_email` varchar(150) NOT NULL,
  `reservation_date` date NOT NULL,
  `time_slot` varchar(10) NOT NULL COMMENT '30-min slots, e.g. 09:00, 09:30',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `party_size` tinyint unsigned NOT NULL DEFAULT '1',
  `seating_pref` enum('Indoor','Outdoor','Bar','No Preference') NOT NULL DEFAULT 'No Preference',
  `special_requests` text,
  `status` enum('Pending','Confirmed','Seated','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `table_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_res_date_slot` (`reservation_date`,`time_slot`),
  KEY `idx_res_user` (`user_id`),
  KEY `idx_res_status` (`status`),
  KEY `idx_res_table_slot` (`table_id`,`reservation_date`,`time_slot`,`status`),
  KEY `idx_res_date_range` (`reservation_date`,`start_time`,`end_time`,`status`),
  CONSTRAINT `fk_res_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_res_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tables`
--

DROP TABLE IF EXISTS `tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `table_number` varchar(20) NOT NULL,
  `zone` enum('Indoor','Patio','Bar') NOT NULL,
  `capacity` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tables_number_zone` (`table_number`,`zone`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','driver','kitchen') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-26 14:40:23


LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('admin-default','FreshBite Admin','freshbitecafe@gmail.com','$2b$10$Liz9GJM0/JlnOTmP39944uOh1Zsb7mvqQVPx0bwj9awr3dY/gXaLS','admin','2026-09-27 17:21:23'),('user-1791117866702-xyb5t','Sahil','sahil@gmail.com','$2b$10$R/7nU6O8fTlAGDyS5bihje4sCcTinirzeaYvUxmxW.NyXxWOSrGHy','user','2026-10-04 12:44:26'),('user-1791196402372-4rn4q','aaryan bhende','bhendeaaryan@gmail.com','$2b$10$Nw1xM5gBcbL3XcBDDy2bJuWsDwMl404bBrKL551Dd3JCdIMckQNDO','user','2026-10-05 10:33:22');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;