-- Migration: Add helper functions for migration verification tests
-- These functions allow TypeScript tests to verify migration success

-- Function to check if an index exists
CREATE OR REPLACE FUNCTION public.check_index_exists(
  p_table_name text,
  p_index_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = p_table_name
      AND indexname = p_index_name
  );
END;
$$;

-- Function to check if multiple indexes exist
CREATE OR REPLACE FUNCTION public.check_multiple_indexes_exist(
  p_table_name text,
  p_index_names text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  index_name text;
BEGIN
  FOREACH index_name IN ARRAY p_index_names
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = p_table_name
        AND indexname = index_name
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION public.check_column_exists(
  p_table_name text,
  p_column_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  );
END;
$$;

-- Function to check if a column has NOT NULL constraint
CREATE OR REPLACE FUNCTION public.check_column_not_null(
  p_table_name text,
  p_column_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
      AND is_nullable = 'NO'
  );
END;
$$;

-- Function to check if a view exists
CREATE OR REPLACE FUNCTION public.check_view_exists(
  p_view_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = p_view_name
  );
END;
$$;

-- Function to check if a function exists
CREATE OR REPLACE FUNCTION public.check_function_exists(
  p_function_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = p_function_name
  );
END;
$$;

-- Function to get RLS policy definition
CREATE OR REPLACE FUNCTION public.get_policy_definition(
  p_table_name text,
  p_policy_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_def text;
BEGIN
  SELECT pg_get_expr(pol.polqual, pol.polrelid)
  INTO policy_def
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  WHERE cls.relname = p_table_name
    AND pol.polname = p_policy_name;

  RETURN policy_def;
END;
$$;

-- Function to explain a query (returns EXPLAIN output)
CREATE OR REPLACE FUNCTION public.explain_query(
  p_query text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  explain_output text;
BEGIN
  EXECUTE 'EXPLAIN ' || p_query INTO explain_output;
  RETURN explain_output;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_index_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_multiple_indexes_exist(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_column_not_null(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_view_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_function_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_policy_definition(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.explain_query(text) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.check_index_exists IS
  'Helper function for migration verification tests - checks if an index exists';
COMMENT ON FUNCTION public.check_view_exists IS
  'Helper function for migration verification tests - checks if a view exists';
COMMENT ON FUNCTION public.explain_query IS
  'Helper function for performance validation - returns EXPLAIN output for a query';
