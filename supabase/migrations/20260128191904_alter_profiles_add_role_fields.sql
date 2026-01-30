-- Migration: Alter profiles table to add role fields
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.5

-- Add primary_role column to profiles
ALTER TABLE public.profiles ADD COLUMN primary_role public.app_role DEFAULT 'agent';

-- Add can_switch_roles flag for users with multiple roles
ALTER TABLE public.profiles ADD COLUMN can_switch_roles BOOLEAN DEFAULT false;

-- Add is_platform_user flag to distinguish platform users (buyers/sellers) from tenant users (agents)
ALTER TABLE public.profiles ADD COLUMN is_platform_user BOOLEAN DEFAULT false;

-- Create index for role-based queries
CREATE INDEX idx_profiles_primary_role ON public.profiles(primary_role);
CREATE INDEX idx_profiles_platform_users ON public.profiles(is_platform_user) WHERE is_platform_user = true;

-- Comment on new columns
COMMENT ON COLUMN public.profiles.primary_role IS 'The user''s primary active role for navigation and permissions';
COMMENT ON COLUMN public.profiles.can_switch_roles IS 'Whether the user can switch between multiple roles';
COMMENT ON COLUMN public.profiles.is_platform_user IS 'True for independent buyers/sellers, false for agent tenant users';
