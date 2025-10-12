import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileCode, ZoomIn, Maximize2, RefreshCw } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useCanvasInteractions, Zone } from "@/hooks/useCanvasInteractions";
import { Badge } from "@/components/ui/badge";

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
}

export const Canvas = ({
  originalImage,
  processedData,
  onExportPNG,
  onExportJSON,
  onZonesByColorReady
}: CanvasProps) => {
  const contoursCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberedCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState("original");
  const [isFullscreen, setIsFullscreen] = useState(false);

// Draw the image and layers once data is available
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

    // Efface tout avant redessin
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data) {
      // ✅ Fixe la taille avant d’afficher l’image
      canvas.width = data.width;
      canvas.height = data.height;
      ctx.putImageData(data, 0, 0);
    } else {
      // Fond neutre si pas encore de data
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, 512, 512);
    }
  };

  // Dessine les calques de base
  drawCanvas(contoursCanvasRef, processedData.contours);
  drawCanvas(numberedCanvasRef, processedData.numbered);

  // === Fusion en "aperçu" ===
  if (previewCanvasRef.current && originalImage) {
    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous"; // évite les erreurs CORS avec fichiers locaux

    img.onload = () => {
      previewCanvas.width = img.width;
      previewCanvas.height = img.height;

      // Étape 1 : Image originale
      ctx.globalAlpha = 1;
      ctx.drawImage(img, 0, 0);

      // Étape 2 : Contours
      if (contoursCanvasRef.current) {
        ctx.globalAlpha = 1;
        ctx.drawImage(contoursCanvasRef.current, 0, 0);
      }

      // Étape 3 : Numéros
      if (numberedCanvasRef.current) {
        ctx.globalAlpha = 1;
        ctx.drawImage(numberedCanvasRef.current, 0, 0);
      }
    };

    img.src = originalImage;
  }
}, [
  processedData?.contours,
  processedData?.numbered,
  processedData?.colorized,
  originalImage,
]);

// === Canvas Interactions ===
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


  // Emit zones by color when ready
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
      className={`p-4 flex-1 relative border bg-card text-card-foreground shadow-sm ${
        isFullscreen ? "fixed inset-4 z-50" : ""
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">Zone de travail</h3>
            {processedData && zonesCount > 0 && (
              <Badge variant="secondary">{zonesCount} zones</Badge>
            )}
          </div>
          <div className="flex gap-1.5">
            {activeInteractions && activeTab !== "original" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => activeInteractions.resetTransform()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
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
            >
              <Download className="mr-2 h-4 w-4" /> PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportJSON}
              disabled={!processedData}
            >
              <FileCode className="mr-2 h-4 w-4" /> JSON
            </Button>
          </div>
        </div>

        {/* Zoom info */}
        {activeInteractions && activeTab !== "original" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ZoomIn className="h-3.5 w-3.5" />
            <span>Zoom: {Math.round(activeInteractions.scale * 100)}%</span>
            <span className="ml-1">• Molette = zoom • Glisser = déplacer</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 rounded-md border bg-muted/50 text-xs">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData}>
              Contours
            </TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData}>
              Numéroté
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!processedData}>
              Aperçu
            </TabsTrigger>
          </TabsList>

          {/* Original */}
          <TabsContent
            value="original"
            className="mt-3 transition-opacity duration-300 ease-in-out"
          >
            <div className="canvas-container bg-secondary rounded-md shadow-inner">
              {originalImage ? (
                <img src={originalImage} alt="Original" />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">
                  Aucune image chargée
                </div>
              )}
            </div>
          </TabsContent>

          {/* Contours */}
          <TabsContent
            value="contours"
            className="mt-3 transition-opacity duration-300 ease-in-out"
          >
            <div className="canvas-container bg-white rounded-md shadow-inner">
              {processedData?.contours ? (
                <canvas
                  ref={contoursCanvasRef}
                  className="cursor-move"
                  style={{ touchAction: "none" }}
                />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">
                  Traitez d'abord une image
                </div>
              )}
            </div>
          </TabsContent>

          {/* Numbered */}
          <TabsContent
            value="numbered"
            className="mt-3 transition-opacity duration-300 ease-in-out"
          >
            <div className="canvas-container bg-white rounded-md shadow-inner">
              {processedData?.numbered ? (
                <canvas
                  ref={numberedCanvasRef}
                  className="cursor-move"
                  style={{ touchAction: "none" }}
                />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">
                  Traitez d'abord une image
                </div>
              )}
            </div>
          </TabsContent>

          {/* Preview */}
          <TabsContent
            value="preview"
            className="mt-3 transition-opacity duration-300 ease-in-out"
          >
            <div className="canvas-container bg-white rounded-md shadow-inner">
              {processedData ? (
                <canvas
                  ref={previewCanvasRef}
                  className="cursor-move"
                  style={{ touchAction: "none" }}
                />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">
                  Traitez d'abord une image
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
