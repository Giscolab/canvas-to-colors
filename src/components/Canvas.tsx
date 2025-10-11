import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileCode,
  ZoomIn,
  Maximize2,
  RefreshCw
} from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
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

export const Canvas = ({ originalImage, processedData, onExportPNG, onExportJSON, onZonesByColorReady }: CanvasProps) => {
  const contoursCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberedCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorizedCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState("original");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Draw canvases once when data is available
  useEffect(() => {
    if (processedData?.contours && contoursCanvasRef.current) {
      const canvas = contoursCanvasRef.current;
      canvas.width = processedData.contours.width;
      canvas.height = processedData.contours.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) ctx.putImageData(processedData.contours, 0, 0);
    }
  }, [processedData?.contours]);

  useEffect(() => {
    if (processedData?.numbered && numberedCanvasRef.current) {
      const canvas = numberedCanvasRef.current;
      canvas.width = processedData.numbered.width;
      canvas.height = processedData.numbered.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) ctx.putImageData(processedData.numbered, 0, 0);
    }
  }, [processedData?.numbered]);

  useEffect(() => {
    if (processedData?.colorized && colorizedCanvasRef.current) {
      const canvas = colorizedCanvasRef.current;
      canvas.width = processedData.colorized.width;
      canvas.height = processedData.colorized.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) ctx.putImageData(processedData.colorized, 0, 0);
    }
  }, [processedData?.colorized]);

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

  const colorizedInteractions = useCanvasInteractions({
    canvasRef: colorizedCanvasRef,
    originalImageData: processedData?.colorized || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
  });

  // Expose zonesByColor to parent when available
  useEffect(() => {
    if (onZonesByColorReady && colorizedInteractions.zonesByColor.size > 0) {
      onZonesByColorReady(colorizedInteractions.zonesByColor);
    }
  }, [colorizedInteractions.zonesByColor, onZonesByColorReady]);

  const getActiveInteractions = () => {
    switch (activeTab) {
      case "contours": return contoursInteractions;
      case "numbered": return numberedInteractions;
      case "colorized": return colorizedInteractions;
      default: return null;
    }
  };

  const activeInteractions = getActiveInteractions();
  const zonesCount = processedData?.zones?.length || 0;

  return (
    <Card className={`p-4 flex-1 relative border bg-card text-card-foreground shadow-sm ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
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
                <Button variant="outline" size="sm" onClick={() => activeInteractions.resetTransform()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onExportPNG} disabled={!processedData}>
              <Download className="mr-2 h-4 w-4" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={onExportJSON} disabled={!processedData}>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-md border bg-muted/50 text-xs">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData}>Contours</TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData}>Numéroté</TabsTrigger>
            <TabsTrigger value="colorized" disabled={!processedData}>Aperçu</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-3">
            <div className="canvas-container bg-secondary rounded-md shadow-inner">
              {originalImage ? (
                <img src={originalImage} alt="Original" />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">Aucune image chargée</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contours" className="mt-3">
            <div className="canvas-container bg-white rounded-md shadow-inner">
              {processedData?.contours ? (
                <canvas ref={contoursCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">Traitez d'abord une image</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="numbered" className="mt-3">
            <div className="canvas-container bg-white rounded-md shadow-inner">
              {processedData?.numbered ? (
                <canvas ref={numberedCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">Traitez d'abord une image</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="colorized" className="mt-3">
            <div className="canvas-container bg-white rounded-md shadow-inner">
              {processedData?.colorized ? (
                <canvas ref={colorizedCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
              ) : (
                <div className="text-muted-foreground p-6 text-sm">Traitez d'abord une image</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
