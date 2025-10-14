-- Remove LOP tracking fields from leaves table
ALTER TABLE leaves DROP COLUMN lop_days;
ALTER TABLE leaves DROP COLUMN spillover_category_id;
ALTER TABLE leaves DROP COLUMN spillover_days;

-- Drop LOP tracking table
DROP TABLE IF EXISTS lop_tracking;

-- Drop indexes
DROP INDEX IF EXISTS idx_lop_tracking_user_year;
DROP INDEX IF EXISTS idx_lop_tracking_org_year;
DROP INDEX IF EXISTS idx_leaves_lop_days;
DROP INDEX IF EXISTS idx_leaves_spillover;
