-- Migration: 001_initial_schema.up.sql
-- Description: Create initial database schema for HR Portal

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Employee', 'HR', 'Admin')),
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ctc DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraints
    UNIQUE(username, organization_id) WHERE deleted_at IS NULL,
    UNIQUE(email, organization_id) WHERE deleted_at IS NULL
);

-- Create leave_categories table
CREATE TABLE leave_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    max_days_per_year INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create leave_allocations table
CREATE TABLE leave_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES leave_categories(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_name VARCHAR(50) NOT NULL,
    total_days INTEGER NOT NULL,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint for user-category-year combination
    UNIQUE(user_id, category_id, year) WHERE deleted_at IS NULL
);

-- Create leaves table
CREATE TABLE leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES leave_categories(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    reason TEXT,
    from_date TIMESTAMP WITH TIME ZONE NOT NULL,
    to_date TIMESTAMP WITH TIME ZONE NOT NULL,
    days DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create salary_slips table
CREATE TABLE salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint for user-month-year combination
    UNIQUE(user_id, month, year) WHERE deleted_at IS NULL
);

-- Create holidays table
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date DATE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('holiday', 'event', 'notice')),
    description TEXT,
    is_calendar_event BOOLEAN DEFAULT true,
    color VARCHAR(7) DEFAULT '#ef4444',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create company_settings table
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_users_organization_role ON users(organization_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_manager ON users(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_department ON users(organization_id, department) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;

CREATE INDEX idx_leaves_user_status ON leaves(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leaves_organization ON leaves(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leaves_date_range ON leaves(from_date, to_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leaves_approver ON leaves(approved_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_leaves_category ON leaves(category_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_leave_allocations_user_year ON leave_allocations(user_id, year) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_allocations_category ON leave_allocations(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_allocations_organization ON leave_allocations(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_documents_user_category ON documents(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_organization ON documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_public ON documents(is_public) WHERE deleted_at IS NULL;

CREATE INDEX idx_salary_slips_user_month_year ON salary_slips(user_id, month, year) WHERE deleted_at IS NULL;
CREATE INDEX idx_salary_slips_organization ON salary_slips(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_holidays_organization_date ON holidays(organization_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_holidays_type ON holidays(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_holidays_calendar_event ON holidays(is_calendar_event) WHERE deleted_at IS NULL;

CREATE INDEX idx_leave_categories_organization ON leave_categories(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_categories_active ON leave_categories(is_active) WHERE deleted_at IS NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_categories_updated_at BEFORE UPDATE ON leave_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_allocations_updated_at BEFORE UPDATE ON leave_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salary_slips_updated_at BEFORE UPDATE ON salary_slips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate remaining days in leave allocations
CREATE OR REPLACE FUNCTION calculate_remaining_days()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_days = NEW.total_days - NEW.used_days;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically calculate remaining days
CREATE TRIGGER calculate_leave_allocation_remaining_days BEFORE INSERT OR UPDATE ON leave_allocations FOR EACH ROW EXECUTE FUNCTION calculate_remaining_days();
