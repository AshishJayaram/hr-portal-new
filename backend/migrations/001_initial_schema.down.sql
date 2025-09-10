-- Migration: 001_initial_schema.down.sql
-- Description: Drop initial database schema for HR Portal

-- Drop triggers
DROP TRIGGER IF EXISTS calculate_leave_allocation_remaining_days ON leave_allocations;
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
DROP TRIGGER IF EXISTS update_salary_slips_updated_at ON salary_slips;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_leaves_updated_at ON leaves;
DROP TRIGGER IF EXISTS update_leave_allocations_updated_at ON leave_allocations;
DROP TRIGGER IF EXISTS update_leave_categories_updated_at ON leave_categories;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_remaining_days();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS salary_slips;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS leaves;
DROP TABLE IF EXISTS leave_allocations;
DROP TABLE IF EXISTS leave_categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
