-- Revert birthday fields

ALTER TABLE users
    DROP COLUMN IF EXISTS birthday_visible,
    DROP COLUMN IF EXISTS birthday;


