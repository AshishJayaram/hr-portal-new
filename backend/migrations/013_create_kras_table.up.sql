-- Create KRAs table
CREATE TABLE IF NOT EXISTS kras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    weight REAL NOT NULL DEFAULT 0,
    target_value TEXT,
    measurement_unit TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    set_by INTEGER NOT NULL,
    set_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actual_value TEXT,
    rating REAL,
    comments TEXT,
    evaluated_by INTEGER,
    evaluated_at DATETIME,
    employee_comments TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (set_by) REFERENCES users(id),
    FOREIGN KEY (evaluated_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kras_user_id ON kras(user_id);
CREATE INDEX IF NOT EXISTS idx_kras_organization_id ON kras(organization_id);
CREATE INDEX IF NOT EXISTS idx_kras_year ON kras(year);
CREATE INDEX IF NOT EXISTS idx_kras_status ON kras(status);
CREATE INDEX IF NOT EXISTS idx_kras_set_by ON kras(set_by);
CREATE INDEX IF NOT EXISTS idx_kras_evaluated_by ON kras(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_kras_deleted_at ON kras(deleted_at);
