/**
 * GRW-012: Onboarding A/B Testing Infrastructure
 *
 * Creates tables and functions for:
 * - Experiment definitions
 * - User variant assignments
 * - Conversion tracking
 * - Results aggregation
 */

-- Experiments table: defines A/B tests
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'onboarding' CHECK (type IN ('onboarding', 'pricing', 'feature', 'ui')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variants JSONB NOT NULL DEFAULT '[]',
  -- Each variant: { "id": "control", "name": "Control", "weight": 50, "config": {} }
  traffic_allocation INTEGER NOT NULL DEFAULT 100 CHECK (traffic_allocation BETWEEN 0 AND 100),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  goal_metric TEXT NOT NULL DEFAULT 'onboarding_completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Experiment variant assignments: tracks which user got which variant
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

-- Experiment conversions: tracks when users complete the goal
CREATE TABLE IF NOT EXISTS public.experiment_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  conversion_type TEXT NOT NULL, -- 'primary' or 'secondary'
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(experiment_id, user_id, conversion_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment ON public.experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON public.experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_experiment ON public.experiment_conversions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_user ON public.experiment_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON public.experiments(type);

-- Enable RLS
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_conversions ENABLE ROW LEVEL SECURITY;

-- RLS policies for experiments (admin read, system write)
CREATE POLICY experiments_select ON public.experiments
  FOR SELECT TO authenticated
  USING (true); -- All authenticated users can view experiments

CREATE POLICY experiments_insert ON public.experiments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY experiments_update ON public.experiments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS policies for assignments (user can see own, admin can see all)
CREATE POLICY assignments_select_own ON public.experiment_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  ));

CREATE POLICY assignments_insert ON public.experiment_assignments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS policies for conversions (user can see own, admin can see all)
CREATE POLICY conversions_select_own ON public.experiment_conversions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  ));

CREATE POLICY conversions_insert ON public.experiment_conversions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function: Get or assign variant for a user
CREATE OR REPLACE FUNCTION public.get_or_assign_experiment_variant(
  p_experiment_name TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  experiment_id UUID,
  variant_id TEXT,
  variant_config JSONB,
  is_new_assignment BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment RECORD;
  v_assignment RECORD;
  v_variant JSONB;
  v_random FLOAT;
  v_cumulative FLOAT;
  v_selected_variant TEXT;
  v_variant_config JSONB;
BEGIN
  -- Get the experiment
  SELECT * INTO v_experiment
  FROM public.experiments e
  WHERE e.name = p_experiment_name
    AND e.status = 'running'
    AND (e.start_date IS NULL OR e.start_date <= NOW())
    AND (e.end_date IS NULL OR e.end_date >= NOW());

  -- Return null if experiment not found or not running
  IF v_experiment IS NULL THEN
    RETURN;
  END IF;

  -- Check for existing assignment
  SELECT * INTO v_assignment
  FROM public.experiment_assignments ea
  WHERE ea.experiment_id = v_experiment.id
    AND ea.user_id = p_user_id;

  IF v_assignment IS NOT NULL THEN
    -- Return existing assignment
    SELECT va.value INTO v_variant_config
    FROM jsonb_array_elements(v_experiment.variants) va
    WHERE va.value->>'id' = v_assignment.variant_id
    LIMIT 1;

    RETURN QUERY SELECT
      v_experiment.id,
      v_assignment.variant_id,
      COALESCE(v_variant_config->'config', '{}'::JSONB),
      FALSE;
    RETURN;
  END IF;

  -- Check traffic allocation (random assignment)
  v_random := random() * 100;
  IF v_random > v_experiment.traffic_allocation THEN
    -- User not in experiment, assign to control
    v_selected_variant := 'control';
  ELSE
    -- Weighted random selection of variant
    v_random := random() * 100;
    v_cumulative := 0;

    FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.variants)
    LOOP
      v_cumulative := v_cumulative + COALESCE((v_variant.value->>'weight')::FLOAT, 0);
      IF v_random <= v_cumulative THEN
        v_selected_variant := v_variant.value->>'id';
        v_variant_config := v_variant.value->'config';
        EXIT;
      END IF;
    END LOOP;

    -- Fallback to first variant if none selected
    IF v_selected_variant IS NULL THEN
      v_selected_variant := (v_experiment.variants->0->>'id');
      v_variant_config := (v_experiment.variants->0->'config');
    END IF;
  END IF;

  -- Create assignment
  INSERT INTO public.experiment_assignments (experiment_id, user_id, variant_id)
  VALUES (v_experiment.id, p_user_id, v_selected_variant);

  RETURN QUERY SELECT
    v_experiment.id,
    v_selected_variant,
    COALESCE(v_variant_config, '{}'::JSONB),
    TRUE;
END;
$$;

-- Function: Record a conversion
CREATE OR REPLACE FUNCTION public.record_experiment_conversion(
  p_experiment_name TEXT,
  p_user_id UUID,
  p_conversion_type TEXT DEFAULT 'primary',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment RECORD;
  v_assignment RECORD;
BEGIN
  -- Get the experiment
  SELECT * INTO v_experiment
  FROM public.experiments e
  WHERE e.name = p_experiment_name;

  IF v_experiment IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get the user's assignment
  SELECT * INTO v_assignment
  FROM public.experiment_assignments ea
  WHERE ea.experiment_id = v_experiment.id
    AND ea.user_id = p_user_id;

  IF v_assignment IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Record conversion (on conflict, update metadata)
  INSERT INTO public.experiment_conversions (
    experiment_id,
    user_id,
    variant_id,
    conversion_type,
    metadata
  )
  VALUES (
    v_experiment.id,
    p_user_id,
    v_assignment.variant_id,
    p_conversion_type,
    p_metadata
  )
  ON CONFLICT (experiment_id, user_id, conversion_type)
  DO UPDATE SET
    metadata = p_metadata,
    converted_at = NOW();

  RETURN TRUE;
END;
$$;

-- Function: Get experiment results
CREATE OR REPLACE FUNCTION public.get_experiment_results(
  p_experiment_name TEXT
)
RETURNS TABLE (
  variant_id TEXT,
  variant_name TEXT,
  total_assigned BIGINT,
  total_converted BIGINT,
  conversion_rate NUMERIC,
  avg_time_to_convert INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment RECORD;
BEGIN
  -- Get the experiment
  SELECT * INTO v_experiment
  FROM public.experiments e
  WHERE e.name = p_experiment_name;

  IF v_experiment IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH variants AS (
    SELECT
      (v.value->>'id') as vid,
      (v.value->>'name') as vname
    FROM jsonb_array_elements(v_experiment.variants) v
  ),
  assignment_counts AS (
    SELECT
      ea.variant_id,
      COUNT(*) as assigned_count
    FROM public.experiment_assignments ea
    WHERE ea.experiment_id = v_experiment.id
    GROUP BY ea.variant_id
  ),
  conversion_counts AS (
    SELECT
      ec.variant_id,
      COUNT(*) as converted_count,
      AVG(ec.converted_at - ea.assigned_at) as avg_time
    FROM public.experiment_conversions ec
    JOIN public.experiment_assignments ea
      ON ea.experiment_id = ec.experiment_id
      AND ea.user_id = ec.user_id
    WHERE ec.experiment_id = v_experiment.id
      AND ec.conversion_type = 'primary'
    GROUP BY ec.variant_id
  )
  SELECT
    v.vid,
    v.vname,
    COALESCE(ac.assigned_count, 0),
    COALESCE(cc.converted_count, 0),
    CASE
      WHEN COALESCE(ac.assigned_count, 0) = 0 THEN 0
      ELSE ROUND(COALESCE(cc.converted_count, 0)::NUMERIC / ac.assigned_count * 100, 2)
    END,
    cc.avg_time
  FROM variants v
  LEFT JOIN assignment_counts ac ON ac.variant_id = v.vid
  LEFT JOIN conversion_counts cc ON cc.variant_id = v.vid
  ORDER BY v.vid;
END;
$$;

-- Insert default onboarding A/B test experiment
INSERT INTO public.experiments (
  name,
  description,
  type,
  status,
  variants,
  traffic_allocation,
  goal_metric
)
VALUES (
  'onboarding-flow-v1',
  'Test different onboarding flow configurations to optimize completion rate',
  'onboarding',
  'running',
  '[
    {
      "id": "control",
      "name": "Control (Standard)",
      "weight": 34,
      "config": {
        "flow": "standard",
        "steps": ["welcome", "profile", "role", "completion"],
        "showProgress": true,
        "allowSkip": true
      }
    },
    {
      "id": "streamlined",
      "name": "Streamlined (2-Step)",
      "weight": 33,
      "config": {
        "flow": "streamlined",
        "steps": ["welcome-combined", "completion"],
        "showProgress": true,
        "allowSkip": false
      }
    },
    {
      "id": "guided",
      "name": "Guided Tour",
      "weight": 33,
      "config": {
        "flow": "guided",
        "steps": ["welcome", "profile", "role", "first-action", "completion"],
        "showProgress": true,
        "allowSkip": true,
        "showTooltips": true
      }
    }
  ]'::JSONB,
  100,
  'onboarding_completed'
)
ON CONFLICT (name) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_assign_experiment_variant TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_experiment_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_experiment_results TO authenticated;

-- Update timestamp trigger
CREATE TRIGGER experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
