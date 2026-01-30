-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-photos', 'property-photos', true);

-- RLS Policy: Anyone can view property photos (public bucket)
CREATE POLICY "Anyone can view property photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

-- RLS Policy: Authenticated users can upload property photos
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- RLS Policy: Users can update their own uploads
CREATE POLICY "Users can update their own property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);