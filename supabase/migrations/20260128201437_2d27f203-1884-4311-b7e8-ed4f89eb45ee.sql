-- Add ai_summary column to documents table for storing auto-generated summaries
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_summary text;