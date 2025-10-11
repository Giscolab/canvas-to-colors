import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ImageJobRow = Database['public']['Tables']['image_jobs']['Row'];

interface ImageJobData {
  image_name: string;
  image_size: number;
  width: number;
  height: number;
  num_colors: number;
  min_region_size: number;
  smoothness: number;
  processing_time_ms: number;
  zones_count: number;
  palette: string[];
}

export function useImageHistory() {
  const { toast } = useToast();

  const saveJob = async (data: ImageJobData): Promise<boolean> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Si pas d'utilisateur connecté, on ne sauvegarde pas
      if (!user) {
        console.log('No user logged in, skipping job save');
        return false;
      }

      const { error } = await supabase
        .from('image_jobs')
        .insert({
          user_id: user.id, // Toujours lié à l'utilisateur connecté
          image_name: data.image_name,
          image_size: data.image_size,
          width: data.width,
          height: data.height,
          num_colors: data.num_colors,
          min_region_size: data.min_region_size,
          smoothness: data.smoothness,
          processing_time_ms: data.processing_time_ms,
          zones_count: data.zones_count,
          palette: data.palette,
        });

      if (error) throw error;

      toast({
        title: "Sauvegardé ✅",
        description: "L'image a été ajoutée à votre historique.",
      });

      return true;
    } catch (error) {
      console.error('Error saving job history:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le traitement.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getRecentJobs = async (page = 1, limit = 10): Promise<ImageJobRow[]> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('image_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
        .returns<ImageJobRow[]>();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
      return [];
    }
  };

  return { saveJob, getRecentJobs };
}
