-- Preserve announcement copy when a promotion is temporarily unadvertised.
ALTER TABLE `announcements`
  ADD COLUMN `is_advertised` tinyint(1) NOT NULL DEFAULT '1' AFTER `is_active`;
