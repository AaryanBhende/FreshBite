ALTER TABLE `orders` ADD COLUMN `table_ids` JSON DEFAULT NULL AFTER `table_id`;

UPDATE `orders` SET `table_ids` = JSON_ARRAY(`table_id`) WHERE `table_id` IS NOT NULL AND `table_ids` IS NULL;
