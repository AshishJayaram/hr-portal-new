-- Migration: 006_create_off_sites_table.up.sql
-- Description: Create off_sites table for tracking off-site work

-- Create off_sites table
CREATE TABLE off_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    user_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('training','meeting','conference','client_visit','other')),
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_off_sites_user_id ON off_sites(user_id);
CREATE INDEX idx_off_sites_organization_id ON off_sites(organization_id);
CREATE INDEX idx_off_sites_start_date ON off_sites(start_date);
CREATE INDEX idx_off_sites_end_date ON off_sites(end_date);
CREATE INDEX idx_off_sites_type ON off_sites(type);
CREATE INDEX idx_off_sites_status ON off_sites(status);
CREATE INDEX idx_off_sites_deleted_at ON off_sites(deleted_at);

