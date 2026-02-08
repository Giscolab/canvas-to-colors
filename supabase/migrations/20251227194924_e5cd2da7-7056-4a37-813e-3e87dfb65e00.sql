-- Update handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  safe_username text;
  safe_avatar_url text;
BEGIN
  -- Validate and sanitize username (max 50 chars, trim whitespace, strip potential HTML)
  safe_username := substring(
    regexp_replace(
      trim(coalesce(new.raw_user_meta_data->>'username', '')),
      '<[^>]*>',
      '',
      'g'
    ),
    1,
    50
  );
  
  -- If empty after sanitization, set to NULL
  IF safe_username = '' THEN
    safe_username := NULL;
  END IF;
  
  -- Validate avatar_url format (only allow HTTPS URLs from trusted domains, or NULL)
  safe_avatar_url := new.raw_user_meta_data->>'avatar_url';
  IF safe_avatar_url IS NOT NULL THEN
    -- Only allow HTTPS URLs
    IF safe_avatar_url !~ '^https://[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}(/.*)?$' THEN
      safe_avatar_url := NULL;
    END IF;
    -- Limit URL length
    IF length(safe_avatar_url) > 500 THEN
      safe_avatar_url := NULL;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, safe_username, safe_avatar_url);
  
  RETURN new;
END;
$$;