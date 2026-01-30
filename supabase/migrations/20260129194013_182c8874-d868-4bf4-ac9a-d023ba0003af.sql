-- Create property_searches table for saved property searches
CREATE TABLE property_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  search_name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  notification_frequency TEXT NOT NULL DEFAULT 'daily',
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  last_checked TIMESTAMPTZ,
  last_results TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own saved searches
CREATE POLICY "Users can manage their own saved searches"
  ON property_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_property_searches_updated_at
  BEFORE UPDATE ON property_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();