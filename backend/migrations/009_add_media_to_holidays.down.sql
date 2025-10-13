-- Remove media fields from holidays table
DROP INDEX IF EXISTS idx_holidays_media_type;
ALTER TABLE holidays DROP COLUMN IF EXISTS media_file_name;
ALTER TABLE holidays DROP COLUMN IF EXISTS media_type;
ALTER TABLE holidays DROP COLUMN IF EXISTS media_url;
