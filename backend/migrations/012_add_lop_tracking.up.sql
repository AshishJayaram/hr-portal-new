-- Add LOP tracking fields to leaves table
ALTER TABLE leaves ADD COLUMN lop_days INTEGER DEFAULT 0;
ALTER TABLE leaves ADD COLUMN spillover_category_id INTEGER;
ALTER TABLE leaves ADD COLUMN spillover_days INTEGER DEFAULT 0;

-- Create LOP tracking table
CREATE TABLE IF NOT EXISTS lop_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_lop_days INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    UNIQUE(user_id, organization_id, year)
);

-- Create indexes for performance
CREATE INDEX idx_lop_tracking_user_year ON lop_tracking(user_id, year);
CREATE INDEX idx_lop_tracking_org_year ON lop_tracking(organization_id, year);
CREATE INDEX idx_leaves_lop_days ON leaves(lop_days);
CREATE INDEX idx_leaves_spillover ON leaves(spillover_category_id);
