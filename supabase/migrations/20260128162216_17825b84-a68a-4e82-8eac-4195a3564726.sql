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

-- 3. Insert demo tenant (always created for app to work)
INSERT INTO public.tenants (id, name, slug)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Smart Agent Demo', 'smart-agent-demo')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert demo subscription for demo tenant
INSERT INTO public.subscriptions (tenant_id, plan, status)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'brokerage', 'active')
ON CONFLICT DO NOTHING;

-- Note: Profile, user_roles, and user-linked data (contacts, properties, deals)
-- will be created automatically when the first user signs up via the trigger above.
-- The handle_new_user() trigger creates all necessary records on user creation.

-- 10. Sample AI Agents (5 certified marketplace agents)
INSERT INTO public.ai_agents (name, description, icon, category, is_certified, is_public, system_prompt, usage_count)
VALUES
  ('Listing Writer Pro', 'Generate compelling property descriptions from photos and basic info, optimized for MLS and marketing.', 'pen-tool', 'marketing', true, true, 'You are an expert real estate copywriter...', 1250),
  ('CMA Analyzer', 'Analyze comparable properties and generate detailed market analysis reports with pricing recommendations.', 'bar-chart-2', 'analysis', true, true, 'You are a market analysis expert...', 890),
  ('Contract Reviewer', 'Extract key terms, identify unusual clauses, and flag potential issues in real estate contracts.', 'file-search', 'legal', true, true, 'You are a real estate contract specialist...', 675),
  ('Follow-Up Assistant', 'Draft personalized follow-up messages based on CRM context and previous interactions.', 'mail', 'communication', true, true, 'You are a communication specialist...', 1100),
  ('Social Media Manager', 'Create engaging property posts and market updates for social media platforms.', 'share-2', 'marketing', true, true, 'You are a social media marketing expert...', 780);