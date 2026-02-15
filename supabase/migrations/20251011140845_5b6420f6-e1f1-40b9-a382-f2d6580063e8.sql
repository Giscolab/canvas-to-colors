-- ============================================
-- Security Fix: Restrict Anonymous Job Visibility
-- ============================================
-- Issue: The current "Users can view own jobs" policy allows 
-- authenticated users to view ALL jobs with user_id IS NULL,
-- exposing anonymous user data to everyone.
-- 
-- Solution: Split into two strict policies:
-- 1. Authenticated users see ONLY their own jobs
-- 2. Anonymous users see ONLY anonymous jobs
-- ============================================

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Users can view own jobs" ON public.image_jobs;

-- ✅ Policy 1: Authenticated users can ONLY view their own jobs
CREATE POLICY "Users can view own jobs"
ON public.image_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ✅ Policy 2: Anonymous users can view unowned jobs only
CREATE POLICY "Anonymous users can view unowned jobs"
ON public.image_jobs
FOR SELECT
TO anon
USING (user_id IS NULL);