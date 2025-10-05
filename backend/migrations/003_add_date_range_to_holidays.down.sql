-- Remove date_range column from holidays table
DROP INDEX IF EXISTS idx_holidays_date_range;
ALTER TABLE holidays DROP COLUMN date_range;
