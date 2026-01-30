-- Add user_id column to contacts table to link CRM contacts with platform accounts
ALTER TABLE public.contacts ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for efficient lookups
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);