-- Migration: 011_add_logo_to_organizations.up.sql
-- Description: Add logo field to organizations table

ALTER TABLE organizations ADD COLUMN logo TEXT DEFAULT '';
