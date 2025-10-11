-- Add currency field to company_settings table
ALTER TABLE company_settings ADD COLUMN currency VARCHAR(10) DEFAULT 'INR';

-- Update existing records to use INR as default
UPDATE company_settings SET currency = 'INR' WHERE currency IS NULL;
