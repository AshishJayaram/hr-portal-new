-- Migration: 004_add_lop_fields_to_salary_slips.up.sql
-- Description: Add LOP (Loss of Pay) fields to salary_slips table

-- Add LOP fields to salary_slips table
ALTER TABLE salary_slips ADD COLUMN lop_days REAL DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN lop_amount REAL DEFAULT 0;

