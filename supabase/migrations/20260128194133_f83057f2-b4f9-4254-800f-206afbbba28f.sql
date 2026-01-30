-- Create table to track document indexing jobs with progress
CREATE TABLE public.document_indexing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  indexed_chunks INTEGER NOT NULL DEFAULT 0,
  current_batch INTEGER NOT NULL DEFAULT 0,
  total_batches INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_indexing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_indexing_jobs
CREATE POLICY "Users can view indexing jobs in their tenant"
ON public.document_indexing_jobs
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert indexing jobs in their tenant"
ON public.document_indexing_jobs
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update indexing jobs in their tenant"
ON public.document_indexing_jobs
FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete indexing jobs in their tenant"
ON public.document_indexing_jobs
FOR DELETE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add index for faster lookups by document_id
CREATE INDEX idx_document_indexing_jobs_document_id ON public.document_indexing_jobs(document_id);
CREATE INDEX idx_document_indexing_jobs_tenant_id ON public.document_indexing_jobs(tenant_id);