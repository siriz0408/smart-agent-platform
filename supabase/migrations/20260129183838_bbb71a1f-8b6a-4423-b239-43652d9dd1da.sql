-- Add unique partial indexes to saved_properties table for UPSERT support
-- These indexes enforce uniqueness only when the property ID is NOT NULL

-- Create unique index for external properties
CREATE UNIQUE INDEX IF NOT EXISTS saved_properties_user_external_unique 
ON saved_properties (user_id, external_property_id) 
WHERE external_property_id IS NOT NULL;

-- Create unique index for internal properties
CREATE UNIQUE INDEX IF NOT EXISTS saved_properties_user_internal_unique 
ON saved_properties (user_id, internal_property_id) 
WHERE internal_property_id IS NOT NULL;