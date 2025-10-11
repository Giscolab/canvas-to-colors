import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useImageHistory } from "@/hooks/useImageHistory";
import { Clock, Image, Palette } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ImageJobRow = Database['public']['Tables']['image_jobs']['Row'];

export const HistoryPanel = () => {
  const [jobs, setJobs] = useState<ImageJobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getRecentJobs } = useImageHistory();

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const recentJobs = await getRecentJobs(1, 5);
      setJobs(recentJobs);
      setIsLoading(false);
    };

    loadHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="p-4 bg-card border shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Historique récent</h3>
        </div>

        {isLoading ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Chargement...
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Aucun traitement récent
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Image className="h-3 w-3 text-primary flex-shrink-0" />
                        <p className="text-xs font-medium truncate">
                          {job.image_name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Palette className="h-2.5 w-2.5" />
                          {job.num_colors} couleurs
                        </span>
                        <span>•</span>
                        <span>{job.zones_count} zones</span>
                        <span>•</span>
                        <span>{formatFileSize(job.image_size)}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      {formatDate(job.created_at)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
};
