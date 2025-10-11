-- Create employee_growth table
CREATE TABLE employee_growth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL CHECK (type IN ('promotion', 'skill_development', 'certification', 'project_completion', 'achievement', 'milestone')),
    date TIMESTAMP NOT NULL,
    added_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_employee_growth_user_id ON employee_growth(user_id);
CREATE INDEX idx_employee_growth_organization_id ON employee_growth(organization_id);
CREATE INDEX idx_employee_growth_type ON employee_growth(type);
CREATE INDEX idx_employee_growth_date ON employee_growth(date);
CREATE INDEX idx_employee_growth_added_by ON employee_growth(added_by);
