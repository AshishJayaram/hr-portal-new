-- Add manager feedback visibility control to KRAs
ALTER TABLE kras ADD COLUMN manager_feedback_visible BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_kras_manager_feedback_visible ON kras(manager_feedback_visible);
