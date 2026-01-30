-- Create function to check and increment AI usage with limits
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(p_tenant_id uuid)
RETURNS TABLE (
  current_usage int,
  usage_limit int,
  is_exceeded boolean,
  plan_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limit int;
  v_current_count int;
  v_period_start timestamptz;
BEGIN
  -- Get subscription plan and period start
  SELECT s.plan, COALESCE(s.current_period_start, date_trunc('month', now()))
  INTO v_plan, v_period_start
  FROM subscriptions s
  WHERE s.tenant_id = p_tenant_id
  LIMIT 1;
  
  -- Default to free if no subscription found
  IF v_plan IS NULL THEN
    v_plan := 'free';
    v_period_start := date_trunc('month', now());
  END IF;
  
  -- Determine limit based on plan (updated per PRD Section 3.1)
  v_limit := CASE v_plan
    WHEN 'free' THEN 25
    WHEN 'starter' THEN 100
    WHEN 'professional' THEN 500
    WHEN 'team' THEN 2000
    WHEN 'brokerage' THEN -1  -- Unlimited
    ELSE 25
  END;
  
  -- Count current period usage
  SELECT COALESCE(SUM(quantity), 0)::int
  INTO v_current_count
  FROM usage_records
  WHERE tenant_id = p_tenant_id
    AND record_type = 'ai_query'
    AND recorded_at >= v_period_start;
  
  -- Check if exceeded (skip for unlimited plans)
  IF v_limit > 0 AND v_current_count >= v_limit THEN
    RETURN QUERY SELECT v_current_count, v_limit, true, v_plan;
    RETURN;
  END IF;
  
  -- Not exceeded - return current status (don't insert here, let edge function do it)
  RETURN QUERY SELECT v_current_count, v_limit, false, v_plan;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid) TO service_role;