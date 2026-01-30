-- Create document_metadata table for structured extraction data
CREATE TABLE public.document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_type TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}',
  key_facts TEXT[] DEFAULT '{}',
  extraction_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique constraint to prevent duplicate metadata per document
CREATE UNIQUE INDEX idx_document_metadata_document_id ON public.document_metadata(document_id);

-- Index for faster tenant lookups
CREATE INDEX idx_document_metadata_tenant_id ON public.document_metadata(tenant_id);

-- Enable RLS
ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policy for viewing metadata in tenant
CREATE POLICY "Users can view document_metadata in their tenant"
ON public.document_metadata
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policy for inserting metadata (edge function uses service role, but this is for future client use)
CREATE POLICY "Users can insert document_metadata in their tenant"
ON public.document_metadata
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policy for updating metadata
CREATE POLICY "Users can update document_metadata in their tenant"
ON public.document_metadata
FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policy for deleting metadata
CREATE POLICY "Users can delete document_metadata in their tenant"
ON public.document_metadata
FOR DELETE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_document_metadata_updated_at
BEFORE UPDATE ON public.document_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();