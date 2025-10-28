-- Add birthday fields to users and backfill dummy birthdays

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birthday DATE,
    ADD COLUMN IF NOT EXISTS birthday_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill a random dummy birthday between 1970-01-01 and ~2020-12-31
-- 18250 ~ 50 years * 365 days
UPDATE users
SET birthday = (DATE '1970-01-01' + (FLOOR(random() * 18250))::INT)
WHERE birthday IS NULL;


