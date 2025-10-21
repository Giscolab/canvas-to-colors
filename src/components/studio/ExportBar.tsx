import { Button } from "@/components/ui/button";
import { Download, FileJson, FileImage, FileCode } from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";
import { toast } from "sonner";

interface ExportBarProps {
  processedData: ProcessedResult | null;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportSVG?: () => void;
}

export function ExportBar({
  processedData,
  onExportPNG,
  onExportJSON,
  onExportSVG,
}: ExportBarProps) {
  const isDisabled = !processedData;

  const safeExportSVG = () => {
    if (!processedData?.svg) {
      toast.error("Aucun SVG disponible");
      return;
    }
    try {
      const blob = new Blob([processedData.svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pbn-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Révoquer après le click (prochain tick) pour éviter les races
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("SVG exporté avec succès");
    } catch (e) {
      toast.error("Erreur lors de l’export SVG");
    }
  };

  return (
    <div
      className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 justify-between
                 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      role="contentinfo"
      aria-label="Barre d’export"
    >
      {/* Statut / métriques */}
      <div className="flex items-center gap-3 min-w-0">
        <output
          aria-live="polite"
          className="text-xs sm:text-sm text-muted-foreground truncate"
        >
          {processedData ? (
            <>
              <span className="font-medium text-foreground tabular-nums">
                {processedData.zones.length}
              </span>{" "}
              zones •{" "}
              <span className="font-medium text-foreground tabular-nums">
                {processedData.palette.length}
              </span>{" "}
              couleurs
            </>
          ) : (
            "Aucun résultat"
          )}
        </output>
      </div>

      {/* Actions d’export */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPNG}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className="gap-2"
        >
          <FileImage className="w-4 h-4" />
          PNG
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportSVG ?? safeExportSVG}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className="gap-2"
        >
          <FileCode className="w-4 h-4" />
          SVG
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportJSON}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className="gap-2"
        >
          <FileJson className="w-4 h-4" />
          JSON
        </Button>

        <Button
          size="sm"
          onClick={onExportPNG}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className="gap-2 bg-primary text-primary-foreground shadow hover:opacity-90 disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          Exporter tout
        </Button>
      </div>
    </div>
  );
}
