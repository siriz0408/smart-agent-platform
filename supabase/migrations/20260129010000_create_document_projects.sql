-- Create document_projects table for organizing documents into folders
CREATE TABLE IF NOT EXISTS document_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for tenant filtering
CREATE INDEX idx_document_projects_tenant ON document_projects(tenant_id);
CREATE INDEX idx_document_projects_created_by ON document_projects(created_by);

-- Enable RLS
ALTER TABLE document_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies: Tenant-based access
CREATE POLICY "Users can view projects in their tenant"
  ON document_projects FOR SELECT
  USING (tenant_id IN (
    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can create projects in their tenant"
  ON document_projects FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can update their own projects"
  ON document_projects FOR UPDATE
  USING (created_by = auth.uid() OR tenant_id IN (
    SELECT p.tenant_id FROM profiles p
    WHERE p.id = auth.uid()
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin'))
  ));

CREATE POLICY "Users can delete their own projects"
  ON document_projects FOR DELETE
  USING (created_by = auth.uid() OR tenant_id IN (
    SELECT p.tenant_id FROM profiles p
    WHERE p.id = auth.uid()
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin'))
  ));

-- Create document_project_members junction table
CREATE TABLE IF NOT EXISTS document_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES document_projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, document_id)
);

-- Create indexes
CREATE INDEX idx_doc_project_members_project ON document_project_members(project_id);
CREATE INDEX idx_doc_project_members_document ON document_project_members(document_id);

-- Enable RLS
ALTER TABLE document_project_members ENABLE ROW LEVEL SECURITY;

-- RLS policies: Based on project access
CREATE POLICY "Users can view members of projects they can access"
  ON document_project_members FOR SELECT
  USING (project_id IN (
    SELECT dp.id FROM document_projects dp
    WHERE dp.tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
  ));

CREATE POLICY "Users can add documents to projects they can access"
  ON document_project_members FOR INSERT
  WITH CHECK (project_id IN (
    SELECT dp.id FROM document_projects dp
    WHERE dp.tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
  ));

CREATE POLICY "Users can remove documents from projects they can access"
  ON document_project_members FOR DELETE
  USING (project_id IN (
    SELECT dp.id FROM document_projects dp
    WHERE dp.tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    )
  ));

-- Add project_id column to documents table for quick filtering
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES document_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
