import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, FileCode, Grid3x3, X, ZoomIn, ZoomOut, Maximize2, RefreshCw } from "lucide-react";
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
}

export const Canvas = ({ originalImage, processedData, onExportPNG, onExportJSON }: CanvasProps) => {
  const contoursCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberedCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorizedCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [activeTab, setActiveTab] = useState("original");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const contoursInteractions = useCanvasInteractions({
    canvasRef: contoursCanvasRef,
    originalImageData: processedData?.contours || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
    onZoneSelect: setSelectedZone,
  });

  const numberedInteractions = useCanvasInteractions({
    canvasRef: numberedCanvasRef,
    originalImageData: processedData?.numbered || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
    onZoneSelect: setSelectedZone,
  });

  const colorizedInteractions = useCanvasInteractions({
    canvasRef: colorizedCanvasRef,
    originalImageData: processedData?.colorized || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
    onZoneSelect: setSelectedZone,
  });

  // Initialize canvas when data is available or tab changes
  useEffect(() => {
    if (processedData?.contours && contoursCanvasRef.current) {
      const canvas = contoursCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = processedData.contours.width;
        canvas.height = processedData.contours.height;
        ctx.putImageData(processedData.contours, 0, 0);
      }
    }
  }, [processedData?.contours, activeTab]);

  useEffect(() => {
    if (processedData?.numbered && numberedCanvasRef.current) {
      const canvas = numberedCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = processedData.numbered.width;
        canvas.height = processedData.numbered.height;
        ctx.putImageData(processedData.numbered, 0, 0);
      }
    }
  }, [processedData?.numbered, activeTab]);

  useEffect(() => {
    if (processedData?.colorized && colorizedCanvasRef.current) {
      const canvas = colorizedCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = processedData.colorized.width;
        canvas.height = processedData.colorized.height;
        ctx.putImageData(processedData.colorized, 0, 0);
      }
    }
  }, [processedData?.colorized, activeTab]);

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
    <Card className={`p-6 flex-1 relative glass hover-lift ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Zone de travail</h3>
            {processedData && zonesCount > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                {zonesCount} zones
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {activeInteractions && activeTab !== "original" && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => activeInteractions.resetTransform()}
                  className="hover-lift"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="hover-lift"
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
              className="hover-lift hover:border-primary"
            >
              <Download className="mr-2 h-4 w-4" />
              PNG
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportJSON}
              disabled={!processedData}
              className="hover-lift hover:border-primary"
            >
              <FileCode className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        {activeInteractions && activeTab !== "original" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ZoomIn className="h-4 w-4" />
            <span>Zoom: {Math.round(activeInteractions.scale * 100)}%</span>
            <span className="text-xs ml-2">• Molette pour zoomer • Glisser pour déplacer</span>
          </div>
        )}

        {selectedZone && (
          <div className="absolute top-20 right-8 glass shadow-xl rounded-xl p-4 z-10 min-w-[220px] animate-scale-in border border-primary/20">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                Zone #{selectedZone.colorIdx + 1}
                <Badge variant="outline" className="text-xs">
                  ID: {selectedZone.id}
                </Badge>
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/10"
                onClick={() => setSelectedZone(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-border shadow-md hover:scale-110 transition-transform"
                  style={{ backgroundColor: selectedZone.hex }}
                />
                <div>
                  <span className="font-mono text-xs text-muted-foreground block">
                    {selectedZone.hex}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Couleur #{selectedZone.colorIdx + 1}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface:</span>
                  <span className="font-medium">{selectedZone.area.toLocaleString()} px</span>
                </div>
                {selectedZone.percent !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Part:</span>
                    <span className="font-medium">{selectedZone.percent.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="original" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <ImageIcon className="mr-2 h-4 w-4" />
              Original
            </TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Contours
            </TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Numéroté
            </TabsTrigger>
            <TabsTrigger value="colorized" disabled={!processedData} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <ImageIcon className="mr-2 h-4 w-4" />
              Aperçu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-4">
            <div className="bg-secondary rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {originalImage ? (
                <img 
                  src={originalImage} 
                  alt="Original" 
                  className="w-auto h-auto max-w-full max-h-full object-contain transition-transform hover:scale-105"
                />
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune image chargée</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">Uploadez une image pour commencer</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contours" className="mt-4">
            <div className="bg-white rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {processedData?.contours ? (
                <canvas 
                  ref={contoursCanvasRef}
                  className="cursor-move"
                  style={{ touchAction: 'none' }}
                />
              ) : (
                <div className="text-center p-8">
                  <Grid3x3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Traitez d'abord une image</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="numbered" className="mt-4">
            <div className="bg-white rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {processedData?.numbered ? (
                <canvas 
                  ref={numberedCanvasRef}
                  className="cursor-move"
                  style={{ touchAction: 'none' }}
                />
              ) : (
                <div className="text-center p-8">
                  <Grid3x3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Traitez d'abord une image</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="colorized" className="mt-4">
            <div className="bg-white rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {processedData?.colorized ? (
                <canvas 
                  ref={colorizedCanvasRef}
                  className="cursor-move"
                  style={{ touchAction: 'none' }}
                />
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Traitez d'abord une image</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
