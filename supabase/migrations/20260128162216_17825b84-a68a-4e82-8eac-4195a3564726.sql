-- 1. Create SECURITY DEFINER function for auto-setup on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  tenant_slug text;
  user_name text;
BEGIN
  -- Generate tenant slug from email
  tenant_slug := lower(split_part(NEW.email, '@', 1));
  tenant_slug := regexp_replace(tenant_slug, '[^a-z0-9]', '-', 'g');
  tenant_slug := tenant_slug || '-' || floor(extract(epoch from now()))::text;
  
  -- Get user's name from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (user_name || '''s Team', tenant_slug)
  RETURNING id INTO new_tenant_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
  VALUES (NEW.id, new_tenant_id, NEW.email, user_name);

  -- Create user role (default: admin for first user)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'admin');

  -- Create subscription (default: free)
  INSERT INTO public.subscriptions (tenant_id, plan, status)
  VALUES (new_tenant_id, 'free', 'active');

  RETURN NEW;
END;
$$;

-- 2. Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Insert tenant for super admin
INSERT INTO public.tenants (id, name, slug)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Smart Agent Demo', 'smart-agent-demo');

-- 4. Insert profile for super admin
INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
VALUES (
  '0dc552c6-1b65-4803-a162-25eaa41d392e',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'siriz0408@gmail.com',
  'Samuel Irizarry'
);

-- 5. Insert super_admin role
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES (
  '0dc552c6-1b65-4803-a162-25eaa41d392e',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'super_admin'
);

-- 6. Insert brokerage subscription (full access)
INSERT INTO public.subscriptions (tenant_id, plan, status)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'brokerage',
  'active'
);

-- 7. Sample Contacts (5)
INSERT INTO public.contacts (tenant_id, first_name, last_name, email, phone, contact_type, status, tags)
VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'John', 'Martinez', 'john.martinez@email.com', '(512) 555-0101', 'buyer', 'active', ARRAY['first-time-buyer', 'pre-approved']),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Sarah', 'Thompson', 'sarah.t@email.com', '(512) 555-0102', 'seller', 'active', ARRAY['relocation', 'urgent']),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Michael', 'Chen', 'mchen@email.com', '(512) 555-0103', 'lead', 'active', ARRAY['investor']),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Emily', 'Rodriguez', 'emily.r@email.com', '(512) 555-0104', 'buyer', 'active', ARRAY['luxury', 'cash-buyer']),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'David', 'Wilson', 'dwilson@email.com', '(512) 555-0105', 'seller', 'active', ARRAY['downsizing']);

-- 8. Sample Properties (3)
INSERT INTO public.properties (tenant_id, address, city, state, zip_code, property_type, status, price, bedrooms, bathrooms, square_feet, year_built, description, listing_agent_id)
VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '123 Oak Lane', 'Austin', 'TX', '78701', 'single_family', 'active', 485000, 3, 2, 1850, 2018, 'Beautiful modern home in downtown Austin with open floor plan.', '0dc552c6-1b65-4803-a162-25eaa41d392e'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '456 River View Dr', 'Austin', 'TX', '78702', 'condo', 'pending', 325000, 2, 2, 1200, 2020, 'Luxury condo with stunning river views and resort-style amenities.', '0dc552c6-1b65-4803-a162-25eaa41d392e'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '789 Hill Country Blvd', 'Austin', 'TX', '78704', 'single_family', 'active', 725000, 4, 3, 2800, 2015, 'Spacious Hill Country home with pool and panoramic views.', '0dc552c6-1b65-4803-a162-25eaa41d392e');

-- 9. Sample Deals (4)
INSERT INTO public.deals (tenant_id, deal_type, stage, estimated_value, commission_rate, expected_close_date, agent_id)
VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'buyer', 'showing', 450000, 3.0, '2026-03-15', '0dc552c6-1b65-4803-a162-25eaa41d392e'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'seller', 'under_contract', 485000, 2.5, '2026-02-28', '0dc552c6-1b65-4803-a162-25eaa41d392e'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'buyer', 'offer', 325000, 3.0, '2026-03-01', '0dc552c6-1b65-4803-a162-25eaa41d392e'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'seller', 'lead', 600000, 2.5, NULL, '0dc552c6-1b65-4803-a162-25eaa41d392e');

-- 10. Sample AI Agents (5 certified marketplace agents)
INSERT INTO public.ai_agents (name, description, icon, category, is_certified, is_public, system_prompt, usage_count)
VALUES
  ('Listing Writer Pro', 'Generate compelling property descriptions from photos and basic info, optimized for MLS and marketing.', 'pen-tool', 'marketing', true, true, 'You are an expert real estate copywriter...', 1250),
  ('CMA Analyzer', 'Analyze comparable properties and generate detailed market analysis reports with pricing recommendations.', 'bar-chart-2', 'analysis', true, true, 'You are a market analysis expert...', 890),
  ('Contract Reviewer', 'Extract key terms, identify unusual clauses, and flag potential issues in real estate contracts.', 'file-search', 'legal', true, true, 'You are a real estate contract specialist...', 675),
  ('Follow-Up Assistant', 'Draft personalized follow-up messages based on CRM context and previous interactions.', 'mail', 'communication', true, true, 'You are a communication specialist...', 1100),
  ('Social Media Manager', 'Create engaging property posts and market updates for social media platforms.', 'share-2', 'marketing', true, true, 'You are a social media marketing expert...', 780);