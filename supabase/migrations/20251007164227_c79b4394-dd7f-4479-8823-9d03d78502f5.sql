-- Create table for image processing jobs history
CREATE TABLE IF NOT EXISTS public.image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  image_name TEXT NOT NULL,
  image_size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  num_colors INTEGER NOT NULL,
  min_region_size INTEGER NOT NULL,
  smoothness INTEGER NOT NULL,
  processing_time_ms INTEGER,
  zones_count INTEGER,
  palette JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (no auth required for this app)
CREATE POLICY "Anyone can view jobs" 
ON public.image_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create jobs" 
ON public.image_jobs 
FOR INSERT 
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_image_jobs_created_at ON public.image_jobs(created_at DESC);
CREATE INDEX idx_image_jobs_user_id ON public.image_jobs(user_id) WHERE user_id IS NOT NULL;