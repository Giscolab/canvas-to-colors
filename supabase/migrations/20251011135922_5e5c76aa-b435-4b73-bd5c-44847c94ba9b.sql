-- Activer Row Level Security (si pas déjà fait)
ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques publiques
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.image_jobs;
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.image_jobs;

-- Politique de lecture : utilisateurs voient seulement leurs propres jobs (ou jobs sans user_id pour rétrocompatibilité)
CREATE POLICY "Users can view own jobs"
ON public.image_jobs
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Politique d'insertion : utilisateurs créent seulement avec leur propre user_id
CREATE POLICY "Users can insert own jobs"
ON public.image_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour : utilisateurs modifient seulement leurs propres jobs
CREATE POLICY "Users can update own jobs"
ON public.image_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Politique de suppression : utilisateurs suppriment seulement leurs propres jobs
CREATE POLICY "Users can delete own jobs"
ON public.image_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- Ajouter une contrainte pour valider que palette est bien un array JSON (si pas déjà là)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'palette_is_array'
  ) THEN
    ALTER TABLE public.image_jobs
    ADD CONSTRAINT palette_is_array 
    CHECK (jsonb_typeof(palette) = 'array');
  END IF;
END $$;