import { toast } from "sonner";
import { ProcessedResult } from "@/lib/imageProcessing";
import { EXPORT } from "@/config/constants";

interface ExportParams {
  numColors: number;
  minRegionSize: number;
  smoothness: number;
}

export function useExport() {
  const exportPNG = (processedData: ProcessedResult | null) => {
    if (!processedData?.numbered) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = processedData.numbered.width;
    canvas.height = processedData.numbered.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(processedData.numbered, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = EXPORT.PNG_FILENAME;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("✅ Export PNG réussi !");
      }
    });
  };

  const exportJSON = (processedData: ProcessedResult | null, params: ExportParams) => {
    if (!processedData) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const exportData = {
      palette: processedData.palette,
      zones: processedData.zones,
      metadata: {
        numColors: params.numColors,
        minRegionSize: params.minRegionSize,
        smoothness: params.smoothness,
        exportDate: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = EXPORT.JSON_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("✅ Export JSON réussi !");
  };

  return { exportPNG, exportJSON };
}
