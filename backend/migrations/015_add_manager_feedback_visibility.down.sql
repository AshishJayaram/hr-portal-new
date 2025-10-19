-- Remove manager feedback visibility control from KRAs
DROP INDEX IF EXISTS idx_kras_manager_feedback_visible;
ALTER TABLE kras DROP COLUMN manager_feedback_visible;
