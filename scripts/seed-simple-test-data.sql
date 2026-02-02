-- Seed simple test data for search functionality
-- Run this in Supabase SQL Editor while authenticated as a user

-- First, get your tenant_id (user ID)
-- SELECT auth.uid();

-- Replace YOUR_TENANT_ID with the result from above query

-- Create test contacts (will auto-generate embeddings via triggers)
INSERT INTO contacts (first_name, last_name, email, phone, company, contact_type, notes, tenant_id)
VALUES
  ('John', 'Denver', 'john.denver@realestate.com', '555-0101', 'Denver Real Estate Partners', 'buyer',
   'Looking for properties in Denver metro area. Budget: $500k-750k', auth.uid()),
  ('Sarah', 'Johnson', 'sarah.j@example.com', '555-0102', 'Johnson Properties LLC', 'seller',
   'Selling investment property at 922 Sharondale Dr', auth.uid()),
  ('Michael', 'Smith', 'michael.smith@gmail.com', '555-0103', NULL, 'buyer',
   'First-time homebuyer, interested in Amherst area', auth.uid());

-- Create test properties (will auto-generate embeddings via triggers)
INSERT INTO properties (address, city, state, zip_code, price, bedrooms, bathrooms, square_feet, property_type, status, description, tenant_id)
VALUES
  ('922 Sharondale Dr', 'Amherst', 'OH', '44001', 240000, 3, 3, 2000, 'Single Family', 'active',
   'Beautiful single family home in Amherst. Features 3 bedrooms, 3 bathrooms, and attached garage.', auth.uid()),
  ('1234 Denver Street', 'Denver', 'CO', '80202', 675000, 4, 3, 2800, 'Single Family', 'active',
   'Spacious home in Denver metro area with mountain views. Perfect for families.', auth.uid()),
  ('456 Main Street', 'Amherst', 'OH', '44001', 189000, 2, 2, 1500, 'Condo', 'pending',
   'Modern condo in downtown Amherst. Low maintenance living.', auth.uid());

-- Wait a moment for triggers to complete, then verify embeddings
SELECT 'Checking if embeddings were generated...' as status;

-- Check contacts
SELECT
  first_name,
  last_name,
  CASE
    WHEN embedding IS NOT NULL THEN '✅ HAS EMBEDDING'
    ELSE '❌ NO EMBEDDING'
  END as embedding_status,
  embedding_indexed_at
FROM contacts
WHERE tenant_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Check properties
SELECT
  address,
  city,
  CASE
    WHEN embedding IS NOT NULL THEN '✅ HAS EMBEDDING'
    ELSE '❌ NO EMBEDDING'
  END as embedding_status,
  embedding_indexed_at
FROM properties
WHERE tenant_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Get counts
SELECT
  'contacts' as table_name,
  COUNT(*) as total,
  COUNT(embedding) as with_embedding,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) || '%' as percentage
FROM contacts
WHERE tenant_id = auth.uid()

UNION ALL

SELECT
  'properties',
  COUNT(*),
  COUNT(embedding),
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) || '%'
FROM properties
WHERE tenant_id = auth.uid();
