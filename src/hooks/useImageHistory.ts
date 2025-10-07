import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const saveJob = async (data: ImageJobData) => {
    try {
      const { error } = await supabase
        .from('image_jobs')
        .insert({
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
    } catch (error) {
      console.error('Error saving job history:', error);
      // Silent fail - don't block user experience
    }
  };

  const getRecentJobs = async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('image_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

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
