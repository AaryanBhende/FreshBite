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
  PRIMARY KEY (`id`),
  KEY `idx_menu_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES ('cat-1','Avocado Harvest Toast','Non-Veg','Smashed avocado, poached egg, microgreens on sourdough.',200.00,'assets/images/Avocado-Egg-Toast.png',380,14.0,34.0,22.0,9.0,1),('cat-10','Spicy Shakshuka','Non-Veg','Four poached eggs in a simmering spiced tomato and pepper sauce, served with warm pita.',310.00,'assets/images/1790833323331-Shakshuka.png',420,22.0,38.0,20.0,8.0,1),('cat-11','Sweet Potato & Black Bean Bowl','Gluten-Free, Vegan','Roasted sweet potatoes, black beans, avocado, and brown rice with cilantro-lime dressing.',330.00,'assets/images/Sweet-Potato-Bowl.png',520,15.0,85.0,14.0,16.0,0),('cat-12','Brioche French Toast','Vegetarian','Thick-cut brioche soaked in vanilla custard, served with whipped cream and berry compote.',280.00,'assets/images/1790532129197-French-Toast.jpg',560,12.0,68.0,26.0,3.0,1),('cat-13','Turkey Avocado Club','Non-Veg','Smoked turkey breast, crisp bacon, avocado, lettuce, tomato, and garlic aioli on sourdough.',360.00,'assets/images/Turkey-Club.png',620,38.0,52.0,28.0,5.0,0),('cat-14','Iced Vanilla Oat Milk Matcha','Vegan','Premium ceremonial grade matcha whisked with creamy oat milk and vanilla syrup.',240.00,'assets/images/Iced-Matcha.png',160,3.0,26.0,5.0,2.0,1),('cat-1790532487379','Falafel Bowl','Vegan, Gluten-Free','Crispy falafel, quinoa, kale, and lemon vinaigrette.',280.00,'assets/images/1790532487372-FalafelBowl.png',480,18.0,58.0,20.0,12.0,0),('cat-2','Signature Acai Bowl','Vegan','Organic acai, crunchy granola, seasonal berries, honey drizzle.',300.00,'assets/images/Acai-Bowl.png',410,8.0,68.0,12.0,9.0,1),('cat-3','Artisan Latte & Croissant','Vegetarian','Freshly brewed coffee paired with a buttery French croissant.',150.00,'assets/images/Latte-Croissant.png',400,10.0,42.0,21.0,2.0,0),('cat-4','Grilled Chicken Bowl','Non-Veg,Gluten-Free','Marinated chicken breast, quinoa, kale, and lemon vinaigrette.',360.00,'assets/images/Chicken-Salad.png',450,45.0,32.0,18.0,5.0,0),('cat-5','Truffle Mushroom Flatbread','Vegetarian','Wild mushrooms, truffle oil, mozzarella, and fresh arugula on a crispy crust.',340.00,'assets/images/Mushroom-Flatbread.png',540,20.0,52.0,28.0,4.0,1),('cat-6','Smoked Salmon Bagel','Non-Veg','Toasted whole-wheat bagel with cream cheese, capers, red onion, and smoked salmon.',390.00,'assets/images/Salmon-Bagel.png',490,28.0,52.0,18.0,4.0,0),('cat-7','Almond Butter & Banana Toast','Vegan','House-made almond butter, sliced bananas, chia seeds, and maple syrup on rustic rye.',260.00,'assets/images/Almond-Banana-Toast.png',430,11.0,52.0,21.0,9.0,0),('cat-8','Matcha Chia Seed Pudding','Vegan,Gluten-Free','Organic matcha infused chia pudding made with oat-milk, topped with coconut flakes and fresh mango.',290.00,'assets/images/Matcha-Chia-Pudding.png',340,9.0,38.0,17.0,11.0,0),('cat-9','Mediterranean Hummus Wrap','Vegetarian','Creamy hummus, cucumber, kalamata olives, feta, and roasted peppers in a spinach tortilla.',300.00,'assets/images/Hummus-Wrap.png',460,15.0,54.0,21.0,8.0,0);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`),
  KEY `idx_orders_created` (`created_at`),
  CONSTRAINT `fk_orders_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('ord-101','grp-101',NULL,'Test Burger','None',12.99,1,'',0,'2026-10-07 05:31:39','Dine In',NULL,NULL),('order-1790854692758-0pal0','group-1790854692758','admin-default','Avocado Harvest Toast','Vegetarian',200.00,1,'',1,'2026-10-01 11:38:12','Dine In',NULL,NULL),('order-1790854692758-affh2','group-1790854692758','admin-default','Spicy Shakshuka','Vegetarian',310.00,1,'',1,'2026-10-01 11:38:12','Dine In',NULL,NULL),('order-1791094517330-30p6r','group-1791094517330','admin-default','Almond Butter & Banana Toast','Vegan',260.00,1,'',1,'2026-10-04 06:15:17','Dine In',NULL,NULL),('order-1791094517330-9gyqn','group-1791094517330','admin-default','Smoked Salmon Bagel','Non-Veg',390.00,1,'',1,'2026-10-04 06:15:17','Dine In',NULL,NULL),('order-1791094517330-crh8a','group-1791094517330','admin-default','Truffle Mushroom Flatbread','Vegetarian',340.00,1,'',1,'2026-10-04 06:15:17','Dine In',NULL,NULL),('order-1791118199960-m9w4c','group-1791118199960','admin-default','Sweet Potato & Black Bean Bowl','Gluten-Free, Vegan',330.00,1,'',0,'2026-10-04 12:50:00','Dine In',NULL,NULL),('order-1791118221897-bspsa','group-1791118221897','admin-default','Spicy Shakshuka','Vegetarian',310.00,1,'',0,'2026-10-04 12:50:21','Dine In',NULL,NULL),('order-1791182242967-5h43q','group-1791182242967','admin-default','Sweet Potato & Black Bean Bowl','Gluten-Free, Vegan',330.00,1,'extra dressing',0,'2026-10-05 06:37:22','Dine In',NULL,NULL),('order-1791289365844-7l26c','group-1791289365843','user-1791196402372-4rn4q','Spicy Shakshuka','Non-Veg',310.00,1,'',0,'2026-10-06 12:22:45','Dine In',NULL,NULL),('order-1791289365844-ndayd','group-1791289365843','user-1791196402372-4rn4q','Sweet Potato & Black Bean Bowl','Gluten-Free, Vegan',330.00,1,'',0,'2026-10-06 12:22:45','Dine In',NULL,NULL),('order-1791350909732-861s3','group-1791350909732','user-1791196402372-4rn4q','Sweet Potato & Black Bean Bowl','Gluten-Free, Vegan',330.00,1,'',0,'2026-10-07 05:28:29','Dine In',NULL,NULL),('order-1791350909732-ezad6','group-1791350909732','user-1791196402372-4rn4q','Spicy Shakshuka','Non-Veg',310.00,1,'',0,'2026-10-07 05:28:29','Dine In',NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

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
  `time_slot` varchar(10) NOT NULL,
  `party_size` tinyint unsigned NOT NULL DEFAULT '1',
  `seating_pref` enum('Indoor','Outdoor','Bar','No Preference') NOT NULL DEFAULT 'No Preference',
  `special_requests` text,
  `status` enum('Pending','Confirmed','Seated','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_res_date_slot` (`reservation_date`,`time_slot`),
  KEY `idx_res_user` (`user_id`),
  KEY `idx_res_status` (`status`),
  CONSTRAINT `fk_res_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('admin-default','FreshBite Admin','freshbitecafe@gmail.com','$2b$10$Liz9GJM0/JlnOTmP39944uOh1Zsb7mvqQVPx0bwj9awr3dY/gXaLS','admin','2026-09-27 17:21:23'),('user-1791117866702-xyb5t','Sahil','sahil@gmail.com','$2b$10$R/7nU6O8fTlAGDyS5bihje4sCcTinirzeaYvUxmxW.NyXxWOSrGHy','user','2026-10-04 12:44:26'),('user-1791196402372-4rn4q','aaryan bhende','bhendeaaryan@gmail.com','$2b$10$Nw1xM5gBcbL3XcBDDy2bJuWsDwMl404bBrKL551Dd3JCdIMckQNDO','user','2026-10-05 10:33:22');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-07 11:15:18
