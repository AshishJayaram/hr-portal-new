CREATE TABLE IF NOT EXISTS `document_acknowledgments` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `created_at` datetime,
    `updated_at` datetime,
    `deleted_at` datetime,
    `document_id` integer NOT NULL,
    `user_id` integer NOT NULL,
    `organization_id` integer NOT NULL,
    `acknowledged_at` datetime NOT NULL,
    CONSTRAINT `fk_documents_document_acknowledgments` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`),
    CONSTRAINT `fk_users_document_acknowledgments` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    CONSTRAINT `fk_organizations_document_acknowledgments` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`)
);

CREATE INDEX `idx_document_acknowledgments_deleted_at` ON `document_acknowledgments` (`deleted_at`);
CREATE INDEX `idx_document_acknowledgments_document_id` ON `document_acknowledgments` (`document_id`);
CREATE INDEX `idx_document_acknowledgments_user_id` ON `document_acknowledgments` (`user_id`);
CREATE INDEX `idx_document_acknowledgments_organization_id` ON `document_acknowledgments` (`organization_id`);

-- Unique constraint to prevent duplicate acknowledgments
CREATE UNIQUE INDEX `idx_document_acknowledgments_unique` ON `document_acknowledgments` (`document_id`, `user_id`) WHERE `deleted_at` IS NULL;
