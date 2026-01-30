-- Create documents storage bucket (private for tenant isolation)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy for authenticated uploads to tenant folder
CREATE POLICY "Users can upload documents to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Policy for reading own tenant documents
CREATE POLICY "Users can read documents from their tenant folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Policy for deleting own tenant documents
CREATE POLICY "Users can delete documents from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);