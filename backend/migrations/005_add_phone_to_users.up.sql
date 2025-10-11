-- Migration: 005_add_phone_to_users.up.sql
-- Description: Add phone field to users table for WhatsApp notifications

-- Add phone field to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

