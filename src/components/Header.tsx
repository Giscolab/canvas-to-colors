import { useState, useCallback } from "react";
import { Palette, Download, FileArchive, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStudio } from "@/contexts/StudioContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// @ts-ignore
import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Header pro Figma-like :
 * - Bouton PNG rapide
 * - Menu ZIP (3 rendus)
 * - Theme toggle à droite
 */
export const Header = () => {
  const studio = useStudio();
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async () => {
    try {
      if (!studio.result) {
        toast.error("Aucun projet à exporter");
        return;
      }

      const filename = studio.currentProject?.name
        ? studio.currentProject.name.replace(/\.[^/.]+$/, "")
        : "pbn-export";

      studio.exportCanvasAsPNG(
        "colorized",
        `${filename}-colorized-${new Date().toISOString().slice(0, 10)}.png`,
        2
      );

      toast.success("Export PNG (colorisé HD) réussi 🎨");
    } catch (err) {
      console.error(err);
      toast.error("Échec de l’export PNG");
    }
  };

  const handleExportZIP = useCallback(async () => {
    try {
      if (!studio.result) {
        toast.error("Aucun projet à exporter");
        return;
      }

      setIsExporting(true);
      const zip = new JSZip();
      const date = new Date().toISOString().slice(0, 10);
      const modes = ["colorized", "contours", "numbered"] as const;

      const filenameBase = studio.currentProject?.name
        ? studio.currentProject.name.replace(/\.[^/.]+$/, "")
        : "pbn-export";

      for (const mode of modes) {
        const canvas = studio.renderToCanvas(mode, 2, "#ffffff");
        if (!canvas) continue;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png")
        );
        if (blob) zip.file(`${filenameBase}-${mode}-${date}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${filenameBase}-bundle-${date}.zip`);
      toast.success("ZIP exporté avec succès 🗜️");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’export ZIP");
    } finally {
      setIsExporting(false);
    }
  }, [studio]);

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 h-16 bg-card/95 backdrop-blur border-b shadow-elev-1"
    >
      <div className="container h-full flex items-center gap-3">
        {/* Zone gauche : icône + titre + baseline */}
        <div className="min-w-0 flex items-center gap-2">
          <Palette aria-hidden="true" className="h-6 w-6 text-foreground/60" />
          <span className="truncate text-sm font-medium text-foreground/90">
            Image2Canvas Pro
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            – Convertissez vos visuels en modèles prêts à peindre
          </span>
        </div>

        {/* Zone centrale (onglets / placeholder) */}
        <nav
          aria-label="Modes"
          className="mx-auto hidden md:flex items-center gap-1"
        ></nav>

        {/* Zone droite : actions + theme toggle */}
        <div className="ml-auto flex items-center gap-2">
          {/* Export rapide PNG */}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleQuickExport}
            title="Exporter la version colorisée en PNG (x2)"
            disabled={!studio.result}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PNG
          </Button>

          {/* Menu ZIP */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={!studio.result || isExporting}
                title="Exporter les trois rendus (ZIP)"
              >
                <FileArchive className="w-4 h-4" />
                ZIP
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportZIP}>
                Exporter tout (colorisé + contours + numéroté)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  studio.exportCanvasAsPNG("colorized", "colorized.png", 2);
                  toast.success("Export PNG colorisé 🎨");
                }}
              >
                Seulement colorisé
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  studio.exportCanvasAsPNG("contours", "contours.png", 2);
                  toast.success("Export PNG contours ✏️");
                }}
              >
                Seulement contours
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  studio.exportCanvasAsPNG("numbered", "numbered.png", 2);
                  toast.success("Export PNG numéroté 🔢");
                }}
              >
                Seulement numéroté
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
