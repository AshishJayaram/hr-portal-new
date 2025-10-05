-- Add date_range column to holidays table for multi-day events
ALTER TABLE holidays ADD COLUMN date_range TEXT;

-- Create index for better query performance
CREATE INDEX idx_holidays_date_range ON holidays(date_range);
