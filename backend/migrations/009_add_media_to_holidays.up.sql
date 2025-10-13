-- Add media fields to holidays table for Events/Notices
ALTER TABLE holidays ADD COLUMN media_url TEXT;
ALTER TABLE holidays ADD COLUMN media_type VARCHAR(20) CHECK (media_type IN ('image', 'video'));
ALTER TABLE holidays ADD COLUMN media_file_name VARCHAR(255);

-- Create index for media queries
CREATE INDEX idx_holidays_media_type ON holidays(media_type) WHERE media_type IS NOT NULL;
