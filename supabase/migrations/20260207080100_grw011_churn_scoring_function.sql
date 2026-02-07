-- GRW-011: Churn Risk Scoring Function
-- Computes churn risk scores for users based on activity patterns

-- ============================================================
-- Function: assess_churn_risk
-- Computes comprehensive churn risk score for a user/workspace
-- ============================================================
CREATE OR REPLACE FUNCTION public.assess_churn_risk(
  p_user_id uuid,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
  risk_level text,
  risk_score numeric,
  login_recency_score numeric,
  feature_usage_score numeric,
  subscription_health_score numeric,
  onboarding_score numeric,
  engagement_trend_score numeric,
  days_since_last_activity integer,
  last_activity_date date,
  assessment_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk_score numeric(5,2) := 0;
  v_login_recency_score numeric(5,2) := 0;
  v_feature_usage_score numeric(5,2) := 0;
  v_subscription_health_score numeric(5,2) := 0;
  v_onboarding_score numeric(5,2) := 0;
  v_engagement_trend_score numeric(5,2) := 0;
  v_risk_level text := 'low';
  v_days_since_last_activity integer := 0;
  v_last_activity_date date;
  v_assessment_notes text := '';
  
  -- Activity metrics
  v_last_login_date date;
  v_days_since_login integer;
  v_activity_last_7d integer := 0;
  v_activity_last_30d integer := 0;
  v_total_ai_queries integer := 0;
  v_total_documents integer := 0;
  v_total_contacts integer := 0;
  
  -- Subscription metrics
  v_subscription_status text;
  v_subscription_plan text;
  v_trial_end_date date;
  v_days_until_trial_end integer;
  v_is_trialing boolean := false;
  
  -- Onboarding metrics
  v_profile_complete boolean := false;
  v_has_contacts boolean := false;
  v_has_documents boolean := false;
  v_onboarding_complete boolean := false;
BEGIN
  -- Get last activity date
  SELECT MAX(activity_date)
  INTO v_last_activity_date
  FROM public.user_activity_log
  WHERE user_id = p_user_id
    AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id);
  
  IF v_last_activity_date IS NULL THEN
    v_last_activity_date := CURRENT_DATE - INTERVAL '90 days'; -- Default to old date if no activity
  END IF;
  
  v_days_since_last_activity := CURRENT_DATE - v_last_activity_date;
  
  -- Get login recency (from activity log)
  SELECT MAX(activity_date)
  INTO v_last_login_date
  FROM public.user_activity_log
  WHERE user_id = p_user_id
    AND login_count > 0
    AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id);
  
  IF v_last_login_date IS NULL THEN
    v_last_login_date := CURRENT_DATE - INTERVAL '90 days';
  END IF;
  
  v_days_since_login := CURRENT_DATE - v_last_login_date;
  
  -- Calculate login recency score (0-30 points)
  -- More days = higher risk
  IF v_days_since_login <= 1 THEN
    v_login_recency_score := 0; -- Active today/yesterday
  ELSIF v_days_since_login <= 7 THEN
    v_login_recency_score := 5; -- Active this week
  ELSIF v_days_since_login <= 14 THEN
    v_login_recency_score := 15; -- 2 weeks inactive
  ELSIF v_days_since_login <= 30 THEN
    v_login_recency_score := 25; -- 1 month inactive
  ELSE
    v_login_recency_score := 30; -- >1 month inactive
  END IF;
  
  -- Get activity metrics (last 30 days)
  SELECT 
    COALESCE(SUM(ai_queries_made), 0),
    COALESCE(SUM(documents_uploaded), 0),
    COALESCE(SUM(contacts_created), 0),
    COUNT(DISTINCT activity_date) FILTER (WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days'),
    COUNT(DISTINCT activity_date) FILTER (WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days')
  INTO 
    v_total_ai_queries,
    v_total_documents,
    v_total_contacts,
    v_activity_last_7d,
    v_activity_last_30d
  FROM public.user_activity_log
  WHERE user_id = p_user_id
    AND activity_date >= CURRENT_DATE - INTERVAL '30 days'
    AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id);
  
  -- Calculate feature usage score (0-25 points)
  -- Low usage = higher risk
  IF v_total_ai_queries = 0 AND v_total_documents = 0 AND v_total_contacts = 0 THEN
    v_feature_usage_score := 25; -- No usage at all
  ELSIF v_total_ai_queries < 5 AND v_total_documents < 3 AND v_total_contacts < 3 THEN
    v_feature_usage_score := 20; -- Very low usage
  ELSIF v_total_ai_queries < 20 AND v_total_documents < 10 AND v_total_contacts < 10 THEN
    v_feature_usage_score := 10; -- Low usage
  ELSIF v_activity_last_7d = 0 THEN
    v_feature_usage_score := 15; -- No activity this week
  ELSE
    v_feature_usage_score := 0; -- Good usage
  END IF;
  
  -- Get subscription status
  SELECT s.status, s.plan, s.trial_end
  INTO v_subscription_status, v_subscription_plan, v_trial_end_date
  FROM public.subscriptions s
  WHERE s.workspace_id = COALESCE(p_workspace_id, (
    SELECT active_workspace_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1
  ))
  LIMIT 1;
  
  v_is_trialing := (v_subscription_status = 'trialing');
  
  IF v_trial_end_date IS NOT NULL THEN
    v_days_until_trial_end := v_trial_end_date::date - CURRENT_DATE;
  END IF;
  
  -- Calculate subscription health score (0-20 points)
  IF v_subscription_status = 'canceled' THEN
    v_subscription_health_score := 20; -- Already canceled
  ELSIF v_subscription_status = 'past_due' THEN
    v_subscription_health_score := 15; -- Payment issue
  ELSIF v_is_trialing AND v_days_until_trial_end <= 3 AND v_days_until_trial_end >= 0 THEN
    v_subscription_health_score := 10; -- Trial ending soon + low activity
  ELSIF v_subscription_plan = 'free' AND v_days_since_login > 14 THEN
    v_subscription_health_score := 5; -- Free plan + inactive
  ELSE
    v_subscription_health_score := 0; -- Healthy subscription
  END IF;
  
  -- Check onboarding completion
  SELECT 
    (full_name IS NOT NULL AND full_name != '') AS profile_complete,
    EXISTS(SELECT 1 FROM public.contacts WHERE workspace_id = COALESCE(p_workspace_id, (SELECT active_workspace_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1)) LIMIT 1) AS has_contacts,
    EXISTS(SELECT 1 FROM public.documents WHERE workspace_id = COALESCE(p_workspace_id, (SELECT active_workspace_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1)) LIMIT 1) AS has_documents
  INTO v_profile_complete, v_has_contacts, v_has_documents
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  v_onboarding_complete := v_profile_complete AND (v_has_contacts OR v_has_documents);
  
  -- Calculate onboarding score (0-15 points)
  -- Incomplete onboarding = higher risk
  IF NOT v_profile_complete THEN
    v_onboarding_score := 15; -- Profile not complete
  ELSIF NOT v_has_contacts AND NOT v_has_documents THEN
    v_onboarding_score := 10; -- No data added
  ELSIF v_days_since_login > 7 AND NOT v_onboarding_complete THEN
    v_onboarding_score := 8; -- Incomplete + inactive
  ELSE
    v_onboarding_score := 0; -- Onboarding complete
  END IF;
  
  -- Calculate engagement trend score (0-10 points)
  -- Declining activity = higher risk
  IF v_activity_last_7d = 0 AND v_activity_last_30d > 0 THEN
    v_engagement_trend_score := 10; -- Was active, now inactive
  ELSIF v_activity_last_7d < (v_activity_last_30d / 4) THEN
    v_engagement_trend_score := 5; -- Declining trend
  ELSE
    v_engagement_trend_score := 0; -- Stable or improving
  END IF;
  
  -- Calculate total risk score (0-100)
  v_risk_score := v_login_recency_score + v_feature_usage_score + 
                  v_subscription_health_score + v_onboarding_score + 
                  v_engagement_trend_score;
  
  -- Determine risk level
  IF v_risk_score >= 70 THEN
    v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'high';
  ELSIF v_risk_score >= 30 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;
  
  -- Build assessment notes
  v_assessment_notes := format(
    'Last activity: %s days ago. Login recency: %s days. Activity (7d/30d): %s/%s days. AI queries: %s, Documents: %s, Contacts: %s. Subscription: %s/%s. Onboarding: %s.',
    v_days_since_last_activity,
    v_days_since_login,
    v_activity_last_7d,
    v_activity_last_30d,
    v_total_ai_queries,
    v_total_documents,
    v_total_contacts,
    v_subscription_status,
    v_subscription_plan,
    CASE WHEN v_onboarding_complete THEN 'complete' ELSE 'incomplete' END
  );
  
  -- Return results
  RETURN QUERY SELECT
    v_risk_level,
    v_risk_score,
    v_login_recency_score,
    v_feature_usage_score,
    v_subscription_health_score,
    v_onboarding_score,
    v_engagement_trend_score,
    v_days_since_last_activity,
    v_last_activity_date,
    v_assessment_notes;
END;
$$;

COMMENT ON FUNCTION public.assess_churn_risk IS 'Assesses churn risk for a user/workspace based on activity patterns, subscription status, and onboarding completion';

-- ============================================================
-- Function: assess_all_users_churn_risk
-- Batch assesses churn risk for all active users
-- ============================================================
CREATE OR REPLACE FUNCTION public.assess_all_users_churn_risk()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_workspace_record RECORD;
  v_assessed_count integer := 0;
  v_assessment_result RECORD;
BEGIN
  -- Loop through all users with active subscriptions
  FOR v_user_record IN
    SELECT DISTINCT p.user_id, p.active_workspace_id
    FROM public.profiles p
    INNER JOIN public.subscriptions s ON s.workspace_id = p.active_workspace_id
    WHERE s.status IN ('active', 'trialing')
  LOOP
    -- Assess risk for user's active workspace
    SELECT * INTO v_assessment_result
    FROM public.assess_churn_risk(v_user_record.user_id, v_user_record.active_workspace_id);
    
    -- Upsert assessment
    INSERT INTO public.churn_risk_assessments (
      user_id,
      workspace_id,
      risk_level,
      risk_score,
      login_recency_score,
      feature_usage_score,
      subscription_health_score,
      onboarding_score,
      engagement_trend_score,
      days_since_last_activity,
      last_activity_date,
      assessment_notes,
      assessed_at
    )
    VALUES (
      v_user_record.user_id,
      v_user_record.active_workspace_id,
      v_assessment_result.risk_level,
      v_assessment_result.risk_score,
      v_assessment_result.login_recency_score,
      v_assessment_result.feature_usage_score,
      v_assessment_result.subscription_health_score,
      v_assessment_result.onboarding_score,
      v_assessment_result.engagement_trend_score,
      v_assessment_result.days_since_last_activity,
      v_assessment_result.last_activity_date,
      v_assessment_result.assessment_notes,
      NOW()
    )
    ON CONFLICT (user_id, workspace_id)
    DO UPDATE SET
      risk_level = EXCLUDED.risk_level,
      risk_score = EXCLUDED.risk_score,
      login_recency_score = EXCLUDED.login_recency_score,
      feature_usage_score = EXCLUDED.feature_usage_score,
      subscription_health_score = EXCLUDED.subscription_health_score,
      onboarding_score = EXCLUDED.onboarding_score,
      engagement_trend_score = EXCLUDED.engagement_trend_score,
      days_since_last_activity = EXCLUDED.days_since_last_activity,
      last_activity_date = EXCLUDED.last_activity_date,
      assessment_notes = EXCLUDED.assessment_notes,
      assessed_at = EXCLUDED.assessed_at,
      updated_at = NOW();
    
    v_assessed_count := v_assessed_count + 1;
  END LOOP;
  
  RETURN v_assessed_count;
END;
$$;

COMMENT ON FUNCTION public.assess_all_users_churn_risk IS 'Batch assesses churn risk for all users with active subscriptions. Returns count of users assessed.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.assess_churn_risk(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assess_all_users_churn_risk() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assess_churn_risk(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.assess_all_users_churn_risk() TO service_role;
