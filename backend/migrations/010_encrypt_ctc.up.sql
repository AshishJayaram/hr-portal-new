-- Migration: 010_encrypt_ctc.up.sql
-- Description: Change CTC column from DECIMAL to TEXT to store encrypted values

-- For SQLite
ALTER TABLE users ADD COLUMN ctc_encrypted TEXT DEFAULT '';

-- Copy existing CTC values to encrypted column (they will be encrypted by the application)
-- Note: This is a temporary step, the application will handle encryption during updates

-- Drop the old ctc column
-- Note: SQLite doesn't support dropping columns directly, so we'll handle this in the application
