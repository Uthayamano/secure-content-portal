-- ====================================================================
-- SECURE CONTENT PORTAL - DATABASE SCHEMA & STORAGE SETUP
-- Run this script in the Supabase SQL Editor to initialize the database
-- ====================================================================

-- 1. Enable UUID Extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on email for fast lookups during OAuth signin
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Content Items Table
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'html')),
  storage_path TEXT NOT NULL, -- Private storage path, e.g. video/uuid-file.mp4
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_content_type ON public.content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_category ON public.content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_uploaded_by ON public.content_items(uploaded_by);

-- 4. Activity Logs Table (Audit Log for Admin Actions)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('upload', 'edit', 'delete')),
  content_item_id UUID,
  content_title TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_admin_id ON public.activity_logs(admin_id);

-- 5. View Logs Table (Viewer Consumption & Per-Item View Count)
CREATE TABLE IF NOT EXISTS public.view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  viewer_email TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_view_logs_content_id ON public.view_logs(content_item_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_viewer_id ON public.view_logs(viewer_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_viewed_at ON public.view_logs(viewed_at DESC);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_content_items_updated_at ON public.content_items;
CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp_column();

-- 7. Supabase Storage Bucket Initialization
-- Note: 'secure-content' is configured with public = false (Strictly Private Bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-content',
  'secure-content',
  false,
  209715200, -- 200MB max
  ARRAY['video/mp4', 'application/pdf', 'text/html', 'application/xhtml+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY['video/mp4', 'application/pdf', 'text/html', 'application/xhtml+xml'];

-- 8. Row Level Security (RLS) Policies
-- The Next.js backend uses the Supabase Service Role Key to perform server-side
-- validated queries and storage operations, ensuring full defense-in-depth.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to content_items" ON public.content_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to activity_logs" ON public.activity_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to view_logs" ON public.view_logs
  FOR ALL USING (auth.role() = 'service_role');
