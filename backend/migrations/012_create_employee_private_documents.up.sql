CREATE TABLE IF NOT EXISTS employee_private_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  CONSTRAINT fk_users_epd FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orgs_epd FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_epd_user_id ON employee_private_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_epd_org_id ON employee_private_documents(organization_id);

