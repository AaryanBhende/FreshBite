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
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('admin-default','FreshBite Admin','freshbitecafe@gmail.com','$2b$10$jBEh3Mbbz88E3itqS/Mh/OrFaHDks2e2IfsFhc04bTSjxOIAzIpRK','admin','2026-09-27 17:21:23'),('employee-1792954156765-eprtlo','Sam','sam@gmail.com','$2b$10$I9eV5qftp37wTlPj7NoOgu1L6TsccGp/DQATwhss9Jz8VCMeXjBXW','driver','2026-10-25 18:49:16'),('user-1791117866702-xyb5t','Sahil','sahil@gmail.com','$2b$10$R/7nU6O8fTlAGDyS5bihje4sCcTinirzeaYvUxmxW.NyXxWOSrGHy','user','2026-10-04 12:44:26'),('user-1791196402372-4rn4q','aaryan bhende','bhendeaaryan@gmail.com','$2b$10$Nw1xM5gBcbL3XcBDDy2bJuWsDwMl404bBrKL551Dd3JCdIMckQNDO','user','2026-10-05 10:33:22'),('user-1791522807750-q40o2','John Doe','john@example.com','$2b$10$Ylr9pZNg5RfJsGgsDnCpBOtDibXJ3HP3EN/urUrtHCYIwJyD3psLm','user','2026-10-09 05:13:27'),('user-1791523400027-f70rs','jane Doe','jane@example.com','$2b$10$MXjVAVDgYyZKgjDFDgVy4.qKFdZrPc3Q3LscxYYo16qwDBduf.H32','user','2026-10-09 05:23:20'),('user-1791523573391-8dk3d','User 11','user11@example.com','$2b$10$otWG4Qx5kSUw1xFjifYtku5yJ433vaWjRh3RnuHrPhzPOaB5A.au2','user','2026-10-09 05:26:13'),('user-1791524380129-ptx5g','{{name}}','{{email}}','$2b$10$5PsFA.0u6FlNF2adFo3abODJlc/ILyoeQtF8v4Xayj3uWXOhz4BGK','user','2026-10-09 05:39:40'),('user-1791525128252-l4sbv','Alex Johnson','alex@example.com','$2b$10$Q/Qrfd6tgtYqznivJbTyJurKyi9ZqSHH6nYqv07CE4BXd7fEB06fi','user','2026-10-09 05:52:08'),('user-1791525322765-dohiq','User 1','user1@example.com','$2b$10$i/O0FHswbwPSFBbL46UkgOY4hC3us7hOwzz9Oipi7.pgpNxYlGdfm','user','2026-10-09 05:55:22'),('user-1791525323001-pyhsf','User 2','user2@example.com','$2b$10$cBUER94uhikd5kpGIxkW/.RfbsjUJBDjrkYgHFIG.KLwnjxf2nWqi','user','2026-10-09 05:55:23'),('user-1791525323325-sy9rx','User 3','user3@example.com','$2b$10$9ohrNQqS1NaPuQkyuehwDeGPcTf/hrr7TD0X2pNqe6Y4SLx03YA52','user','2026-10-09 05:55:23'),('user-1791525323558-xe03p','User 4','user4@example.com','$2b$10$MJT9ndCluqk3OksgYF8WYu7YlABq1iYc/dZDLBHK2BgeSJpLySpMK','user','2026-10-09 05:55:23'),('user-1791525323788-rs27e','User 5','user5@example.com','$2b$10$0m4j5rVL6E8dVmCYrLTq7uVrwBANGBCCzzR4hgCmZOtu2l9883Hx.','user','2026-10-09 05:55:23'),('user-1791525324015-fztfr','User 6','user6@example.com','$2b$10$kg9bS86weav3n59GnhcgqeVlXtyXI5K9fMXolh3Z7nEW2ZB01cAgG','user','2026-10-09 05:55:24'),('user-1791525324247-zk82e','User 7','user7@example.com','$2b$10$l1QkYPTOuC8B3wpHG7n11urK4praUlGW.Sobhbp2Al3FXRvRLtGDi','user','2026-10-09 05:55:24'),('user-1791525324474-p5com','User 8','user8@example.com','$2b$10$rc2OVOpDkxQrgTR8/w8RAOxqwv344hwNZ0j6CyawUco4TtafnMZ7.','user','2026-10-09 05:55:24'),('user-1791525324709-a7m9r','User 9','user9@example.com','$2b$10$XnAXPpmmRBCvLeO47a0YkeoLNnbmMkuwLqzEYWGxkAvx.ZmnhAOpa','user','2026-10-09 05:55:24'),('user-1791525324975-3h8mn','User 10','user10@example.com','$2b$10$b92U2zTvaU.qCQxE9d4c6exybtAgpo.wrwgxlGwV5JNldF9Cosdn2','user','2026-10-09 05:55:24'),('user-1792672669872-yclc7','Tom Holland','tomholland@gmail.com','$2b$10$IEuNzqhvYc2Q9z.y7PQiS.d4xpcc98/myScuj2HhhLHh/e024KNEi','user','2026-10-22 12:37:49'),('user-1792752751184-hyh3m','Jack','jack@gmail.com','$2b$10$UYscnJ2wH3Dte/Br5bRpWuFOAyV2r5q4qT7E3SoY8wtyHV.jCZ69q','driver','2026-10-23 10:52:31'),('user-1792844682582-4aj7u','Susan','susan@gmail.com','$2b$10$4USgTjoW/YaJuMxosLYvZeogkwFkAc8HC3rYnkfs.SD13GjCcnjDy','kitchen','2026-10-24 12:24:42'),('user-1795495559567-xhmtu','Randy','randy@gmail.com','$2b$10$L1pA1Un/oUSForj6zb44LeLxzBYsyXnWsXNr4MH1nn0P3n1lJA1Pi','user','2026-11-24 04:45:59');
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

-- Dump completed on 2026-11-26 18:08:30
