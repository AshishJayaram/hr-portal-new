-- Add default_days column to leave_categories table
ALTER TABLE leave_categories ADD COLUMN default_days INTEGER DEFAULT 0;

-- Update existing categories with default values based on max_days_per_year
UPDATE leave_categories SET default_days = max_days_per_year WHERE default_days IS NULL OR default_days = 0;
