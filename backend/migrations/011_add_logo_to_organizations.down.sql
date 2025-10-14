-- Migration: 011_add_logo_to_organizations.down.sql
-- Description: Remove logo field from organizations table

ALTER TABLE organizations DROP COLUMN logo;
