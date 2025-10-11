-- Migration: 004_add_lop_fields_to_salary_slips.down.sql
-- Description: Remove LOP (Loss of Pay) fields from salary_slips table

-- Remove LOP fields from salary_slips table
ALTER TABLE salary_slips DROP COLUMN lop_days;
ALTER TABLE salary_slips DROP COLUMN lop_amount;

