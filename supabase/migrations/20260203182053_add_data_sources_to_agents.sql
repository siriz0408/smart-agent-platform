-- Add data_sources column to ai_agents table
-- This allows agents to specify which data sources they need (property, contact, document, deal)
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';

-- Update existing agents with their appropriate data sources based on their purpose
UPDATE public.ai_agents 
SET data_sources = ARRAY['property']
WHERE name IN ('Listing Writer Pro', 'CMA Analyzer');

UPDATE public.ai_agents 
SET data_sources = ARRAY['contact']
WHERE name = 'Follow-Up Assistant';

UPDATE public.ai_agents 
SET data_sources = ARRAY['document']
WHERE name = 'Contract Reviewer';

UPDATE public.ai_agents 
SET data_sources = ARRAY['deal']
WHERE name ILIKE '%offer%' OR name ILIKE '%analyzer%';

-- Add comment for documentation
COMMENT ON COLUMN public.ai_agents.data_sources IS 'Array of data source types the agent requires: property, contact, document, deal';
