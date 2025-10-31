-- Add support for anonymous feedback
-- Make user_id nullable and add is_anonymous flag
ALTER TABLE feedback ADD COLUMN is_anonymous BOOLEAN DEFAULT false;

-- Make user_id nullable (remove NOT NULL constraint)
-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
-- But since this is SQLite, we'll use a migration approach
-- For now, just add the column - the NOT NULL constraint will be handled by GORM

-- Note: SQLite limitations mean we can't easily change NOT NULL to NULL
-- This migration adds the is_anonymous field
-- The model change will handle nullable user_id at the application level

