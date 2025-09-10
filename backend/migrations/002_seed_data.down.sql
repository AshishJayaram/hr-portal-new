-- Migration: 002_seed_data.down.sql
-- Description: Remove seed data for HR Portal

-- Remove company settings
DELETE FROM company_settings WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove holidays
DELETE FROM holidays WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove leave allocations
DELETE FROM leave_allocations WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove leave categories
DELETE FROM leave_categories WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove users
DELETE FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove organization
DELETE FROM organizations WHERE id = '550e8400-e29b-41d4-a716-446655440000';
