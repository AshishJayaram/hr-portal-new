-- Migration: 002_seed_data.up.sql
-- Description: Insert initial seed data for HR Portal

-- Insert demo organization
INSERT INTO organizations (id, name, domain, settings, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Company', 'demo.com', '{"payrollSettings": {"basicSalary": {"mode": "percentage", "value": 40}, "hra": {"mode": "percentage", "value": 20}, "da": {"mode": "percentage", "value": 15}, "pf": {"mode": "percentage", "value": 12}, "esi": {"mode": "percentage", "value": 0.75}, "tds": {"mode": "percentage", "value": 10}}, "defaultLeaveCategories": [{"name": "Sick Leave", "maxDays": 12, "requiresApproval": true}, {"name": "Casual Leave", "maxDays": 12, "requiresApproval": true}, {"name": "Professional Leave", "maxDays": 5, "requiresApproval": true}]}', true);

-- Insert demo users
INSERT INTO users (id, organization_id, username, email, password_hash, name, designation, department, role, ctc, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@demo.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4j5Kz8Kz8K', 'Admin User', 'System Administrator', 'IT', 'Admin', 1200000, true),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'hr', 'hr@demo.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4j5Kz8Kz8K', 'HR Manager', 'HR Manager', 'HR', 'HR', 800000, true),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'manager', 'manager@demo.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4j5Kz8Kz8K', 'Team Manager', 'Project Manager', 'Engineering', 'Manager', 900000, true),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'employee', 'employee@demo.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4j5Kz8Kz8K', 'John Doe', 'Software Developer', 'Engineering', 'Employee', 600000, true);

-- Update manager relationships
UPDATE users SET manager_id = '550e8400-e29b-41d4-a716-446655440003' WHERE id = '550e8400-e29b-41d4-a716-446655440004';

-- Insert leave categories
INSERT INTO leave_categories (id, organization_id, name, description, max_days_per_year, requires_approval, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Sick Leave', 'Leave for illness or medical appointments', 12, true, true),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Casual Leave', 'General purpose leave', 12, true, true),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Professional Leave', 'Leave for professional development', 5, true, true),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Annual Leave', 'Annual vacation leave', 21, true, true);

-- Insert leave allocations for current year
INSERT INTO leave_allocations (user_id, category_id, organization_id, category_name, total_days, used_days, remaining_days, year) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Sick Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Casual Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Professional Leave', 5, 0, 5, 2024),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Annual Leave', 21, 0, 21, 2024),

('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Sick Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Casual Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Professional Leave', 5, 0, 5, 2024),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Annual Leave', 21, 0, 21, 2024),

('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Sick Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Casual Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Professional Leave', 5, 0, 5, 2024),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Annual Leave', 21, 0, 21, 2024),

('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Sick Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Casual Leave', 12, 0, 12, 2024),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Professional Leave', 5, 0, 5, 2024),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Annual Leave', 21, 0, 21, 2024);

-- Insert sample holidays
INSERT INTO holidays (id, organization_id, name, date, type, description, is_calendar_event, color) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'New Year', '2024-01-01', 'holiday', 'New Year Day', true, '#ef4444'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'Republic Day', '2024-01-26', 'holiday', 'Republic Day of India', true, '#ef4444'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'Independence Day', '2024-08-15', 'holiday', 'Independence Day of India', true, '#ef4444'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', 'Gandhi Jayanti', '2024-10-02', 'holiday', 'Birthday of Mahatma Gandhi', true, '#ef4444'),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440000', 'Diwali', '2024-11-01', 'holiday', 'Festival of Lights', true, '#f59e0b'),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440000', 'Christmas', '2024-12-25', 'holiday', 'Christmas Day', true, '#10b981'),
('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440000', 'Company Annual Meeting', '2024-03-15', 'event', 'Annual company meeting', true, '#f59e0b'),
('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440000', 'Important Notice', NULL, 'notice', 'Please update your emergency contact information', false, '#8b5cf6');

-- Insert company settings
INSERT INTO company_settings (id, organization_id, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '{"payrollSettings": {"basicSalary": {"mode": "percentage", "value": 40}, "hra": {"mode": "percentage", "value": 20}, "da": {"mode": "percentage", "value": 15}, "pf": {"mode": "percentage", "value": 12}, "esi": {"mode": "percentage", "value": 0.75}, "tds": {"mode": "percentage", "value": 10}}, "defaultLeaveCategories": [{"name": "Sick Leave", "maxDays": 12, "requiresApproval": true}, {"name": "Casual Leave", "maxDays": 12, "requiresApproval": true}, {"name": "Professional Leave", "maxDays": 5, "requiresApproval": true}]}');
