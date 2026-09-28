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
  `category` varchar(50) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `img` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES ('cat-1','Avocado Harvest Toast','Vegetarian','Smashed avocado, poached egg, microgreens on sourdough.',200.00,'assets/images/Avocado-Egg-Toast.png'),('cat-10','Spicy Shakshuka','Vegetarian','Two poached eggs in a simmering spiced tomato and pepper sauce, served with warm pita.',310.00,'assets/images/Shakshuka.png'),('cat-11','Sweet Potato & Black Bean Bowl','Gluten-Free','Roasted sweet potatoes, black beans, avocado, and brown rice with a zesty cilantro-lime dressing.',330.00,'assets/images/Sweet-Potato-Bowl.png'),('cat-12','Brioche French Toast','Vegetarian','Thick-cut brioche soaked in vanilla custard, served with whipped cream and mixed berry compote.',280.00,'assets/images/1790532129197-French-Toast.jpg'),('cat-13','Turkey Avocado Club','None','Smoked turkey breast, crisp bacon, avocado, lettuce, tomato, and garlic aioli on sourdough.',360.00,'assets/images/Turkey-Club.png'),('cat-14','Iced Vanilla Oat Milk Matcha','Vegan','Premium ceremonial grade matcha whisked with creamy oat milk and a touch of vanilla syrup.',240.00,'assets/images/Iced-Matcha.png'),('cat-1790532487379','Falafel Bowl','Vegan','Crispy falafel, quinoa, kale, and lemon vinaigrette.',280.00,'assets/images/1790532487372-FalafelBowl.png'),('cat-2','Signature Acai Bowl','Vegan','Organic acai, crunchy granola, seasonal berries, honey drizzle.',300.00,'assets/images/Acai-Bowl.png'),('cat-3','Artisan Latte & Croissant','Vegetarian','Freshly brewed coffee paired with a buttery French croissant.',150.00,'assets/images/Latte-Croissant.png'),('cat-4','Grilled Chicken Bowl','Gluten-Free','Marinated chicken breast, quinoa, kale, and lemon vinaigrette.',350.00,'assets/images/Chicken-Salad.png'),('cat-5','Truffle Mushroom Flatbread','Vegetarian','Wild mushrooms, truffle oil, mozzarella, and fresh arugula on a crispy crust.',340.00,'assets/images/Mushroom-Flatbread.png'),('cat-6','Smoked Salmon Bagel','None','Toasted whole-wheat bagel with cream cheese, capers, red onion, and premium smoked salmon.',390.00,'assets/images/Salmon-Bagel.png'),('cat-7','Almond Butter & Banana Toast','Vegan','House-made almond butter, sliced bananas, chia seeds, and maple syrup on rustic rye.',260.00,'assets/images/Almond-Banana-Toast.png'),('cat-8','Matcha Chia Seed Pudding','Vegan','Organic matcha infused chia pudding, topped with coconut flakes and fresh mango.',290.00,'assets/images/Matcha-Chia-Pudding.png'),('cat-9','Mediterranean Hummus Wrap','Vegetarian','Creamy hummus, cucumber, kalamata olives, feta, and roasted peppers in a spinach tortilla.',300.00,'assets/images/Hummus-Wrap.png');
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
  `category` varchar(50) DEFAULT 'None',
  `price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `notes` text,
  `completed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `order_type` enum('Dine In','Takeout','Delivery') DEFAULT 'Dine In',
  `address` text,
  `coordinates` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('order-1790516137853-1lufr','group-1790516137853',NULL,'Almond Butter & Banana Toast','Vegan',260.00,1,'',0,'2026-09-27 13:35:37','Dine In',NULL,NULL),('order-1790569927980-g2318','group-1790569927980','admin-default','Sweet Potato & Black Bean Bowl','admin-default',330.00,1,'',0,'2026-09-28 04:32:07','Dine In',NULL,NULL),('order-1790572953848-q36on','group-1790572953848','admin-default','Spicy Shakshuka','Vegetarian',310.00,1,'',0,'2026-09-28 05:22:33','Takeout',NULL,NULL),('order-1790592232630-kp4xj','group-1790592232630','admin-default','Avocado Harvest Toast','Vegetarian',200.00,1,'',0,'2026-09-28 10:43:52','Delivery','Margao, KTC ','15.287937,73.956111'),('order-1790592955802-noveo','group-1790592955802','admin-default','Sweet Potato & Black Bean Bowl','Gluten-Free',330.00,1,'',0,'2026-09-28 10:55:55','Delivery','KTC, Margao','15.287937,73.956111');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

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
INSERT INTO `users` VALUES ('admin-default','FreshBite Admin','freshbitecafe@gmail.com','$2b$10$Liz9GJM0/JlnOTmP39944uOh1Zsb7mvqQVPx0bwj9awr3dY/gXaLS','admin','2026-09-27 17:21:23');
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

-- Dump completed on 2026-09-28 17:23:17
