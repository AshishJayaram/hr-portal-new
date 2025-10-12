-- Add document_scope column to documents table
ALTER TABLE documents ADD COLUMN document_scope VARCHAR(20) DEFAULT 'user' CHECK (document_scope IN ('public', 'hr_private', 'user_private'));

-- Update existing documents based on is_public flag
UPDATE documents SET document_scope = 'public' WHERE is_public = true;
UPDATE documents SET document_scope = 'user_private' WHERE is_public = false;
