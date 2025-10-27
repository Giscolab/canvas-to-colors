import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode, ZoomIn, ZoomOut, Maximize2, RefreshCw, Hand } from "lucide-react";
import { useCanvasInteractions, Zone } from "@/hooks/useCanvasInteractions";
import { cn } from "@/lib/utils";
import { useStudio } from "@/contexts/StudioContext";

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
  const studio = useStudio();

  const [activeTab, setActiveTab] = useState("original");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

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
        setCanvasDimensions({ width: data.width, height: data.height });
      } else {
        canvas.width = 512;
        canvas.height = 512;
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, 512, 512);
        setCanvasDimensions({ width: 512, height: 512 });
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
        setCanvasDimensions({ width: img.width, height: img.height });

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

  // Synchronisation du zoom entre studio et les interactions du canvas
  useEffect(() => {
    if (activeInteractions) {
      activeInteractions.setScale(studio.zoomPercent / 100);
    }
  }, [studio.zoomPercent, activeInteractions]);

  const zonesCount = processedData?.zones?.length || 0;

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isFullscreen]);

  // Rendu du contenu du canvas selon l'onglet actif
  const renderCanvasContent = () => {
    if (isProcessing) {
      return <StudioLoading label="Traitement en cours…" />;
    }

    switch (activeTab) {
      case "original":
        return originalImage ? (
          <img src={originalImage} alt="Original" className="max-w-full h-auto" />
        ) : (
          <div className="text-studio-foreground/60 p-6 text-sm">
            Aucune image originale
          </div>
        );
      case "contours":
        return processedData?.contours ? (
          <canvas ref={contoursCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
        ) : (
          <div className="text-studio-foreground/60 p-6 text-sm">
            Aucune donnée de contours
          </div>
        );
      case "numbered":
        return processedData?.numbered ? (
          <canvas ref={numberedCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
        ) : (
          <div className="text-studio-foreground/60 p-6 text-sm">
            Aucune donnée numérotée
          </div>
        );
      case "preview":
        return processedData ? (
          <canvas ref={previewCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
        ) : (
          <div className="text-studio-foreground/60 p-6 text-sm">
            Aucune donnée d'aperçu
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-studio-canvas text-studio-foreground overflow-hidden">
      {/* Overlay global de traitement */}
      {globalProcessing && <GlobalProcessingOverlay />}

      {/* Toolbar fixe en haut */}
      <div className="h-10 bg-studio-panel-header border-b border-studio-border/40 flex items-center justify-between px-3">
        {/* Left: View selector and info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-studio-panel/60 rounded-md p-0.5">
            <Button
              size="sm"
              variant={activeTab === "original" ? "default" : "ghost"}
              onClick={() => setActiveTab("original")}
              className="h-7 px-2 text-xs"
            >
              Original
            </Button>
            <Button
              size="sm"
              variant={activeTab === "contours" ? "default" : "ghost"}
              onClick={() => setActiveTab("contours")}
              disabled={!processedData}
              className="h-7 px-2 text-xs"
            >
              Contours
            </Button>
            <Button
              size="sm"
              variant={activeTab === "numbered" ? "default" : "ghost"}
              onClick={() => setActiveTab("numbered")}
              disabled={!processedData}
              className="h-7 px-2 text-xs"
            >
              Numéroté
            </Button>
            <Button
              size="sm"
              variant={activeTab === "preview" ? "default" : "ghost"}
              onClick={() => setActiveTab("preview")}
              disabled={!processedData}
              className="h-7 px-2 text-xs"
            >
              Aperçu
            </Button>
          </div>
          
          {processedData && zonesCount > 0 && (
            <Badge variant="secondary" className="studio-status-badge studio-status-badge--primary text-xs">
              {zonesCount} zones
            </Badge>
          )}
        </div>

        {/* Center: Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={studio.zoomOut}
            disabled={studio.zoomPercent <= 10}
            className="h-7 w-7"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-studio-foreground/70 w-10 text-center">{studio.zoomPercent}%</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={studio.zoomIn}
            disabled={studio.zoomPercent >= 800}
            className="h-7 w-7"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={studio.togglePanTool}
            className={cn("h-7 w-7", studio.panTool && "bg-studio-accent-blue/20")}
          >
            <Hand className="w-4 h-4" />
          </Button>
          {activeInteractions && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                activeInteractions.resetTransform();
                studio.resetZoom();
              }}
              className="h-7 w-7"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Right: Export and fullscreen */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onExportPNG}
            disabled={!processedData}
            className="h-7 px-2 text-xs"
          >
            <Download className="mr-1 h-3 w-3" /> PNG
          </Button>
          <Button
            size="sm"
            onClick={onExportJSON}
            disabled={!processedData}
            className="h-7 px-2 text-xs"
          >
            <FileCode className="mr-1 h-3 w-3" /> JSON
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Zone centrale scrollable isolée avec gradient Figma-style */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-studio-canvas via-studio-panel/40 to-studio-canvas relative">
        <div className="flex items-center justify-center min-h-full p-8">
          <div
            className="relative bg-studio-panel shadow-2xl"
            style={{
              transform: `scale(${studio.zoomPercent / 100})`,
              transformOrigin: "center",
              transition: "transform 0.1s ease-out",
            }}
            onDoubleClick={() => studio.resetZoom()}
          >
            {/* Damier background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%, transparent)",
                backgroundSize: "40px 40px",
              }}
            />
            
            {/* Canvas content */}
            <div className="relative">
              {renderCanvasContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Status bar fixe en bas */}
      <div className="h-6 bg-studio-panel-header border-t border-studio-border/40 flex items-center justify-between px-3 text-xs text-studio-foreground/70">
        <div className="flex items-center gap-4">
          <span>{canvasDimensions.width} × {canvasDimensions.height} px</span>
          <span className="text-studio-foreground/50">|</span>
          <span>RVB/8</span>
          {processedData && zonesCount > 0 && (
            <>
              <span className="text-studio-foreground/50">|</span>
              <span>{zonesCount} zones détectées</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>Zoom: {studio.zoomPercent}%</span>
          <span className="text-green-400">Ready</span>
        </div>
      </div>
    </div>
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