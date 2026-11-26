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
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES ('cat-1','Avocado Harvest Toast','Non-Veg','Smashed avocado, poached egg, microgreens on sourdough.',200.00,'assets/images/Avocado-Egg-Toast.png',380,14.0,34.0,22.0,9.0,1,1),('cat-10','Spicy Shakshuka','Non-Veg','Four poached eggs in a simmering spiced tomato and pepper sauce, served with warm pita.',310.00,'assets/images/1790833323331-Shakshuka.png',420,30.0,38.0,20.0,8.0,1,1),('cat-11','Sweet Potato & Black Bean Bowl','Gluten-Free, Vegan','Roasted sweet potatoes, black beans, avocado, and brown rice with cilantro-lime dressing.',330.00,'assets/images/Sweet-Potato-Bowl.png',520,15.0,85.0,14.0,16.0,0,1),('cat-12','Brioche French Toast','Vegetarian','Thick-cut brioche soaked in vanilla custard, served with whipped cream and berry compote.',280.00,'assets/images/1790532129197-French-Toast.jpg',560,12.0,68.0,26.0,3.0,1,1),('cat-13','Turkey Avocado Club','Non-Veg','Smoked turkey breast, crisp bacon, avocado, lettuce, tomato, and garlic aioli on sourdough.',360.00,'assets/images/Turkey-Club.png',620,38.0,52.0,28.0,5.0,0,1),('cat-14','Iced Vanilla Oat Milk Matcha','Vegan','Premium ceremonial grade matcha whisked with creamy oat milk and vanilla syrup.',240.00,'assets/images/Iced-Matcha.png',160,3.0,26.0,5.0,2.0,1,1),('cat-1790532487379','Falafel Bowl','Vegan, Gluten-Free','Crispy falafel, quinoa, kale, and lemon vinaigrette.',280.00,'assets/images/1790532487372-FalafelBowl.png',480,18.0,58.0,20.0,12.0,0,1),('cat-2','Signature Acai Bowl','Vegan','Organic acai, crunchy granola, seasonal berries, honey drizzle.',300.00,'assets/images/Acai-Bowl.png',410,8.0,68.0,12.0,9.0,1,1),('cat-3','Artisan Latte & Croissant','Vegetarian','Freshly brewed coffee paired with a buttery French croissant.',150.00,'assets/images/Latte-Croissant.png',400,10.0,42.0,21.0,2.0,0,1),('cat-4','Grilled Chicken Bowl','Non-Veg,Gluten-Free','Marinated chicken breast, quinoa, kale, and lemon vinaigrette.',360.00,'assets/images/Chicken-Salad.png',450,45.0,32.0,18.0,5.0,0,1),('cat-5','Truffle Mushroom Flatbread','Vegetarian','Wild mushrooms, truffle oil, mozzarella, and fresh arugula on a crispy crust.',340.00,'assets/images/Mushroom-Flatbread.png',540,20.0,52.0,28.0,4.0,1,1),('cat-6','Smoked Salmon Bagel','Non-Veg','Toasted whole-wheat bagel with cream cheese, capers, red onion, and smoked salmon.',390.00,'assets/images/Salmon-Bagel.png',490,28.0,52.0,18.0,4.0,0,1),('cat-7','Almond Butter & Banana Toast','Vegan','House-made almond butter, sliced bananas, chia seeds, and maple syrup on rustic rye.',260.00,'assets/images/Almond-Banana-Toast.png',430,11.0,52.0,21.0,9.0,0,1),('cat-8','Matcha Chia Seed Pudding','Vegan,Gluten-Free','Organic matcha infused chia pudding made with oat-milk, topped with coconut flakes and fresh mango.',290.00,'assets/images/Matcha-Chia-Pudding.png',340,9.0,38.0,17.0,11.0,0,1),('cat-9','Mediterranean Hummus Wrap','Vegetarian','Creamy hummus, cucumber, kalamata olives, feta, and roasted peppers in a spinach tortilla.',300.00,'assets/images/Hummus-Wrap.png',460,15.0,54.0,21.0,8.0,0,1);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-26 17:46:38
