import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useImageHistory } from "@/hooks/useImageHistory";
import { toast } from "sonner";
import {
  Clock,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Download,
  Ruler,
  Hash,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ImageJobRow = Database["public"]["Tables"]["image_jobs"]["Row"];

export const HistoryPanel = () => {
  const { getRecentJobs } = useImageHistory();

  const PAGE = 1;
  const PAGE_SIZE = 8;

  const [jobs, setJobs] = useState<ImageJobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const recent = await getRecentJobs(PAGE, PAGE_SIZE);
      setJobs(recent ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger l’historique");
    } finally {
      setIsLoading(false);
    }
  }, [getRecentJobs]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const total = jobs.length;

  const formatRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "À l’instant";
    if (mins < 60) return `Il y a ${mins} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    return `Il y a ${days} j`;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const skeletons = useMemo(() => Array.from({ length: 4 }), []);

  const handleExportJSON = (job: ImageJobRow) => {
    try {
      const safeName =
        (job.image_name || "job").toString().replace(/[^\w\-]+/g, "_") +
        "-" +
        new Date(job.created_at).toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(job, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export JSON prêt");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l’export");
    }
  };

  return (
    <Card className="p-4 bg-card/60 backdrop-blur border">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-sm">Historique récent</h3>
        <Badge variant="secondary" className="ml-1">
          {total}
        </Badge>

        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-8 px-2 gap-2"
          onClick={loadHistory}
          aria-label="Rafraîchir l’historique"
          title="Rafraîchir"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Rafraîchir</span>
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {skeletons.map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-md border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <div
          className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Aucun traitement récent.
        </div>
      ) : (
        <ScrollArea className="max-h-[260px] pr-1">
          <ul role="list" className="space-y-2">
            {jobs.map((job) => {
              const dims =
                job.width && job.height ? `${job.width}×${job.height}` : "—";
              const size = formatFileSize(job.image_size);
              const nbColors = job.num_colors ?? "—";
              const zones = job.zones_count ?? "—";
              return (
                <li
                  key={job.id}
                  role="listitem"
                  className="group p-2.5 rounded-md border bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Miniature placeholder (pas d'URL image ici) */}
                    <div
                      className="h-10 w-14 rounded-md bg-secondary border flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium truncate">
                          {job.image_name || "Sans titre"}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                          title={new Date(job.created_at).toLocaleString("fr-FR")}
                        >
                          {formatRelative(job.created_at)}
                        </Badge>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          {nbColors} couleurs
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {zones} zones
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          {dims}
                        </span>
                        <span>• {size}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleExportJSON(job)}
                        aria-label={`Exporter ${job.image_name || "ce traitement"} en JSON`}
                        title="Exporter en JSON"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
};
