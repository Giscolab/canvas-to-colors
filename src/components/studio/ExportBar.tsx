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

export function ExportBar({ processedData, onExportPNG, onExportJSON, onExportSVG }: ExportBarProps) {
  const handleExportSVG = () => {
    if (!processedData?.svg) {
      toast.error("Aucun SVG disponible");
      return;
    }

    const blob = new Blob([processedData.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pbn-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SVG exporté avec succès");
  };

  const isDisabled = !processedData;

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {processedData ? (
            <>
              <span className="font-medium text-foreground">{processedData.zones.length}</span> zones • 
              <span className="font-medium text-foreground ml-1">{processedData.palette.length}</span> couleurs
            </>
          ) : (
            "Aucun résultat"
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPNG}
          disabled={isDisabled}
          className="gap-2"
        >
          <FileImage className="w-4 h-4" />
          PNG
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportSVG || handleExportSVG}
          disabled={isDisabled}
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
          className="gap-2"
        >
          <FileJson className="w-4 h-4" />
          JSON
        </Button>

        <Button
          size="sm"
          onClick={onExportPNG}
          disabled={isDisabled}
          className="gap-2 bg-gradient-to-r from-primary to-primary-glow"
        >
          <Download className="w-4 h-4" />
          Exporter tout
        </Button>
      </div>
    </div>
  );
}
