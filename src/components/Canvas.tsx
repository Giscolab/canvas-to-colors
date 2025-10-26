import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode, ZoomIn, Maximize2, RefreshCw } from "lucide-react";
import { useCanvasInteractions, Zone } from "@/hooks/useCanvasInteractions";
import { CanvasHUD } from "@/components/studio/CanvasHUD";
import { cn } from "@/lib/utils";

/* ===========================================================
   Canvas principal du Studio (Figma-like / Adobe-grade)
   =========================================================== */

interface CanvasProps {
  originalImage: string | null;
  processedData: {
    contours: ImageData | null;
    numbered: ImageData | null;
    colorized: ImageData | null;
    zones?: Zone[];
    labels?: Int32Array;
  } | null;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onZonesByColorReady?: (zonesByColor: Map<number, Zone[]>) => void;
  isProcessing?: boolean; // état du traitement
  globalProcessing?: boolean; // overlay global (rendu ou batch)
}

export const Canvas = ({
  originalImage,
  processedData,
  onExportPNG,
  onExportJSON,
  onZonesByColorReady,
  isProcessing = false,
  globalProcessing = false,
}: CanvasProps) => {
  const contoursCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberedCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState("original");
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* === Dessin des calques === */
  useEffect(() => {
    if (!processedData) return;

    const drawCanvas = (
      canvasRef: React.RefObject<HTMLCanvasElement>,
      data: ImageData | null
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (data) {
        canvas.width = data.width;
        canvas.height = data.height;
        ctx.putImageData(data, 0, 0);
      } else {
        canvas.width = 512;
        canvas.height = 512;
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, 512, 512);
      }
    };

    drawCanvas(contoursCanvasRef, processedData.contours);
    drawCanvas(numberedCanvasRef, processedData.numbered);

    // Fusion Preview
    if (previewCanvasRef.current && originalImage) {
      const previewCanvas = previewCanvasRef.current;
      const ctx = previewCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;

        ctx.globalAlpha = 1;
        ctx.drawImage(img, 0, 0);

        if (contoursCanvasRef.current) ctx.drawImage(contoursCanvasRef.current, 0, 0);
        if (numberedCanvasRef.current) ctx.drawImage(numberedCanvasRef.current, 0, 0);
      };

      img.src = originalImage;
    }
  }, [
    processedData?.contours,
    processedData?.numbered,
    processedData?.colorized,
    originalImage,
  ]);

  /* === Interactions === */
  const contoursInteractions = useCanvasInteractions({
    canvasRef: contoursCanvasRef,
    originalImageData: processedData?.contours || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
  });

  const numberedInteractions = useCanvasInteractions({
    canvasRef: numberedCanvasRef,
    originalImageData: processedData?.numbered || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
  });

  const previewInteractions = useCanvasInteractions({
    canvasRef: previewCanvasRef,
    originalImageData: processedData?.colorized || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
  });

  useEffect(() => {
    if (onZonesByColorReady && previewInteractions.zonesByColor.size > 0) {
      const timeout = setTimeout(() => {
        onZonesByColorReady(previewInteractions.zonesByColor);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [previewInteractions.zonesByColor, onZonesByColorReady]);

  const interactions = {
    contours: contoursInteractions,
    numbered: numberedInteractions,
    preview: previewInteractions,
  };

  const activeInteractions =
    activeTab === "original" ? null : interactions[activeTab as keyof typeof interactions];

  const zonesCount = processedData?.zones?.length || 0;

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isFullscreen]);

  return (
    <Card
      className={cn(
        "p-4 flex-1 relative bg-studio-panel border border-studio-border/60 text-studio-foreground shadow-studio-panel-right rounded-lg studio-transition overflow-hidden",
        isFullscreen && "fixed inset-4 z-50"
      )}
    >
      {/* Overlay global de traitement */}
      {globalProcessing && <GlobalProcessingOverlay />}

      <div className="space-y-3">
        {/* --- Header --- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-studio-foreground">Zone de travail</h3>
            {processedData && zonesCount > 0 && (
              <Badge variant="secondary" className="studio-status-badge studio-status-badge--primary">
                {zonesCount} zones
              </Badge>
            )}
          </div>

          <div className="flex gap-1.5">
            {activeInteractions && activeTab !== "original" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activeInteractions.resetTransform()}
                  className="studio-action-button"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="studio-action-button"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPNG}
              disabled={!processedData}
              className="studio-export-button"
            >
              <Download className="mr-2 h-4 w-4" /> PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportJSON}
              disabled={!processedData}
              className="studio-export-button"
            >
              <FileCode className="mr-2 h-4 w-4" /> JSON
            </Button>
          </div>
        </div>

        {/* --- Zoom info --- */}
        {activeInteractions && activeTab !== "original" && (
          <div className="flex items-center gap-2 text-xs text-studio-foreground/70">
            <ZoomIn className="h-3.5 w-3.5" />
            <span>Zoom: {Math.round(activeInteractions.scale * 100)}%</span>
            <span className="ml-1">• Molette = zoom • Glisser = déplacer</span>
          </div>
        )}

        {/* --- Tabs --- */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full bg-studio-panel/60 backdrop-blur-md rounded-md border border-studio-border/40 p-2 studio-transition"
        >
          <TabsList className="grid w-full grid-cols-4 bg-studio-panel/70 rounded-md border border-studio-border/40 text-xs">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData}>Contours</TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData}>Numéroté</TabsTrigger>
            <TabsTrigger value="preview" disabled={!processedData}>Aperçu</TabsTrigger>
          </TabsList>

          {/* --- Contenu dynamique --- */}
          {["original", "contours", "numbered", "preview"].map((key) => (
            <TabsContent key={key} value={key} className="mt-3 studio-transition">
              <div className="canvas-container bg-studio-canvas rounded-md shadow-studio-image flex items-center justify-center min-h-[300px] relative">
                {isProcessing ? (
                  <StudioLoading label="Traitement en cours…" />
                ) : key === "original" && originalImage ? (
                  <img src={originalImage} alt="Original" className="max-w-full h-auto" />
                ) : key === "contours" && processedData?.contours ? (
                  <canvas ref={contoursCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
                ) : key === "numbered" && processedData?.numbered ? (
                  <canvas ref={numberedCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
                ) : key === "preview" && processedData ? (
                  <canvas ref={previewCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
                ) : (
                  <div className="text-studio-foreground/60 p-6 text-sm">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* --- HUD --- */}
      {activeInteractions && activeTab !== "original" && (
        <CanvasHUD
          zoomPercent={Math.round(activeInteractions.scale * 100)}
          canZoomIn={true}
          canZoomOut={true}
          onZoomIn={() => activeInteractions.zoom(1.1)}
          onZoomOut={() => activeInteractions.zoom(0.9)}
          onTogglePan={() => activeInteractions.togglePanMode()}
          numberedVisible={true}
          onToggleNumbered={() => {}}
          overlayOpacity={80}
          onChangeOverlayOpacity={() => {}}
        />
      )}
    </Card>
  );
};

/* ===========================================================
   Mini Loader Studio
   =========================================================== */
export function StudioLoading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-studio-foreground/70">
      <div className="relative w-10 h-10 mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-studio-border/60" />
        <div
          className="absolute inset-0 rounded-full border-t-2 border-studio-accent-blue animate-spin"
          style={{ animationDuration: "1s" }}
        />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

/* ===========================================================
   Overlay global (plein écran, flou + message animé)
   =========================================================== */
export function GlobalProcessingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-studio-panel/80 backdrop-blur-[6px] text-studio-foreground/80 studio-fade-in">
      <div className="relative w-14 h-14 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-studio-border/50" />
        <div
          className="absolute inset-0 rounded-full border-t-2 border-studio-accent-blue animate-spin"
          style={{ animationDuration: "0.9s" }}
        />
      </div>
      <h4 className="text-sm font-medium tracking-wide">Rendu global en cours…</h4>
      <p className="text-[12px] mt-1 opacity-70">Optimisation et export des calques</p>
    </div>
  );
}
