import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileImage,
  FileArchive,
  Settings,
  ChevronDown,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useStudio } from "@/contexts/StudioContext";

// @ts-ignore — import dynamique, installé via npm install jszip file-saver
import JSZip from "jszip";
import { saveAs } from "file-saver";

export function ExportBar() {
  const studio = useStudio();
  const processedData = studio.result;
  const [isExporting, setIsExporting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [scale, setScale] = useState(2);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [copied, setCopied] = useState(false);

  const disabled = !processedData;

  // === EXPORT PNG SIMPLE ===
  const handleExportPNG = useCallback(
    (scaleValue = 1) => {
      if (!processedData) return;
      try {
        studio.exportCanvasAsPNG(
          studio.viewMode || "colorized",
          `pbn-${studio.viewMode}-${new Date().toISOString().slice(0, 10)}.png`,
          scaleValue,
          backgroundColor
        );
        toast.success("Export PNG réussi 🎨");
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors de l’export PNG");
      }
    },
    [processedData, studio, backgroundColor]
  );

  // === EXPORT ZIP (3 MODES PNG) ===
  const handleExportZIP = useCallback(async () => {
    if (!processedData) return;

    setIsExporting(true);
    const zip = new JSZip();
    const date = new Date().toISOString().slice(0, 10);

    try {
      const modes = ["colorized", "contours", "numbered"] as const;
      for (const mode of modes) {
        const canvas = studio.renderToCanvas(mode, scale, backgroundColor);
        if (!canvas) continue;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png")
        );
        if (blob) zip.file(`pbn-${mode}-${date}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `pbn-export-${date}.zip`);

      toast.success("ZIP exporté avec succès 🗜️");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l’export ZIP");
    } finally {
      setIsExporting(false);
    }
  }, [studio, processedData, scale, backgroundColor]);

  // === COPIE INFO ===
  const handleCopy = useCallback(() => {
    if (!processedData) return;
    navigator.clipboard
      .writeText(`Image2Canvas export du ${new Date().toLocaleDateString()}`)
      .then(() => {
        setCopied(true);
        toast.success("Copié !");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Échec de la copie"));
  }, [processedData]);

  return (
    <TooltipProvider>
      <div className="studio-export-bar flex justify-between items-center border-t bg-card/70 backdrop-blur px-3 py-2">
        {/* Statut */}
        <div className="text-xs sm:text-sm text-muted-foreground">
          {processedData
            ? `${processedData.zones.length} zones • ${processedData.palette.length} couleurs`
            : "Aucun résultat"}
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2">
          {/* Copier */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={disabled}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copier une info</TooltipContent>
          </Tooltip>

          {/* Export PNG */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                <FileImage className="w-4 h-4" />
                PNG
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportPNG(1)}>
                Export standard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPNG(2)}>
                Export HD ×2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPNG(4)}>
                Export UHD ×4
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export ZIP */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportZIP}
            disabled={disabled || isExporting}
          >
            <FileArchive className="w-4 h-4" />
            ZIP
          </Button>

          {/* Paramètres */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDialog(true)}
            disabled={disabled}
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Bouton principal */}
          <Button
            size="sm"
            className="studio-export-button studio-export-button--primary"
            onClick={() => handleExportPNG(2)}
            disabled={disabled || isExporting}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Export...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exporter
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dialogue Export avancé */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export PNG avancé</DialogTitle>
            <DialogDescription>
              Choisissez la résolution et la couleur de fond avant l’export ou le ZIP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Échelle : {scale}x</Label>
              <Slider
                min={0.5}
                max={4}
                step={0.5}
                value={[scale]}
                onValueChange={(val) => setScale(val[0])}
              />
            </div>
            <div>
              <Label>Couleur de fond</Label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExportZIP} disabled={isExporting}>
              <FileArchive className="w-4 h-4 mr-2" /> Export ZIP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
