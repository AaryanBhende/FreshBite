-- Upgrade a database that already has the initial Phase 4 promotions table.
ALTER TABLE `promotions`
  DROP PRIMARY KEY,
  ADD COLUMN `id` bigint unsigned NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_promotions_code` (`code`),
  ADD COLUMN `description` text AFTER `code`,
  CHANGE COLUMN `discount_val` `discount_value` decimal(10,2) NOT NULL,
  CHANGE COLUMN `min_order` `min_order_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `max_discount_amount` decimal(10,2) DEFAULT NULL AFTER `min_order_amount`,
  ADD COLUMN `start_date` date DEFAULT NULL AFTER `max_discount_amount`,
  ADD COLUMN `usage_limit` int unsigned DEFAULT NULL AFTER `expiry_date`,
  ADD COLUMN `times_used` int unsigned NOT NULL DEFAULT '0' AFTER `usage_limit`,
  ADD COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`;

ALTER TABLE `order_promotions`
  ADD COLUMN `promotion_id` bigint unsigned DEFAULT NULL AFTER `order_id`,
  ADD COLUMN `user_id` varchar(50) DEFAULT NULL AFTER `promotion_id`,
  ADD COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE `order_promotions` op
JOIN `promotions` p ON p.code = op.promotion_code
SET op.promotion_id = p.id;

UPDATE `promotions` p
LEFT JOIN (
  SELECT promotion_id, COUNT(*) AS redemption_count
  FROM `order_promotions`
  WHERE promotion_id IS NOT NULL
  GROUP BY promotion_id
) used ON used.promotion_id = p.id
SET p.times_used = COALESCE(used.redemption_count, 0);

ALTER TABLE `order_promotions`
  ADD UNIQUE KEY `uq_promo_user_redemption` (`promotion_id`, `user_id`),
  ADD CONSTRAINT `fk_order_promo_promotion`
    FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `linked_promo_id` bigint unsigned DEFAULT NULL,
  `display_location` enum('header_banner','checkout_modal','hero_section') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_active_location` (`is_active`, `display_location`),
  CONSTRAINT `fk_announcement_promotion`
    FOREIGN KEY (`linked_promo_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
