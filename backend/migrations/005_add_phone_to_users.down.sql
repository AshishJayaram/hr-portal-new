-- Migration: 005_add_phone_to_users.down.sql
-- Description: Remove phone field from users table

-- Remove phone field from users table
ALTER TABLE users DROP COLUMN phone;

