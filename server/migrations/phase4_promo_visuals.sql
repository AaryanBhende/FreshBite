-- Apply after phase4_promotions_advertising.sql.
ALTER TABLE `promotions`
  ADD COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT '0' AFTER `is_active`;

ALTER TABLE `announcements`
  ADD COLUMN `display_page` enum('menu') NOT NULL DEFAULT 'menu' AFTER `linked_promo_id`,
  ADD COLUMN `background_image_url` varchar(500) DEFAULT NULL AFTER `display_location`;

UPDATE `announcements` SET `display_page` = 'menu';
