import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, FileCode, Grid3x3, X } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useCanvasInteractions, Zone } from "@/hooks/useCanvasInteractions";

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

  useEffect(() => {
    if (processedData?.contours && contoursCanvasRef.current) {
      const ctx = contoursCanvasRef.current.getContext('2d');
      if (ctx) {
        contoursCanvasRef.current.width = processedData.contours.width;
        contoursCanvasRef.current.height = processedData.contours.height;
        ctx.putImageData(processedData.contours, 0, 0);
      }
    }
  }, [processedData?.contours]);

  useEffect(() => {
    if (processedData?.numbered && numberedCanvasRef.current) {
      const ctx = numberedCanvasRef.current.getContext('2d');
      if (ctx) {
        numberedCanvasRef.current.width = processedData.numbered.width;
        numberedCanvasRef.current.height = processedData.numbered.height;
        ctx.putImageData(processedData.numbered, 0, 0);
      }
    }
  }, [processedData?.numbered]);

  useEffect(() => {
    if (processedData?.colorized && colorizedCanvasRef.current) {
      const ctx = colorizedCanvasRef.current.getContext('2d');
      if (ctx) {
        colorizedCanvasRef.current.width = processedData.colorized.width;
        colorizedCanvasRef.current.height = processedData.colorized.height;
        ctx.putImageData(processedData.colorized, 0, 0);
      }
    }
  }, [processedData?.colorized]);

  return (
    <Card className="p-6 flex-1 relative">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Zone de travail</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportPNG}
              disabled={!processedData}
            >
              <Download className="mr-2 h-4 w-4" />
              PNG
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportJSON}
              disabled={!processedData}
            >
              <FileCode className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        {selectedZone && (
          <div className="absolute top-20 right-8 bg-card border border-border shadow-lg rounded-lg p-4 z-10 min-w-[200px] animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-sm">Zone #{selectedZone.id}</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedZone(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: selectedZone.hex }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedZone.hex}
                </span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Surface:</span> {selectedZone.area} px
              </div>
              {selectedZone.percent !== undefined && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Part:</span> {selectedZone.percent.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="original">
              <ImageIcon className="mr-2 h-4 w-4" />
              Original
            </TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData}>
              <Grid3x3 className="mr-2 h-4 w-4" />
              Contours
            </TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData}>
              <Grid3x3 className="mr-2 h-4 w-4" />
              Numéroté
            </TabsTrigger>
            <TabsTrigger value="colorized" disabled={!processedData}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Aperçu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-4">
            <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
              {originalImage ? (
                <img 
                  src={originalImage} 
                  alt="Original" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-muted-foreground">Aucune image chargée</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contours" className="mt-4">
            <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
              {processedData?.contours ? (
                <canvas 
                  ref={contoursCanvasRef}
                  className="max-w-full max-h-full cursor-move"
                  style={{ touchAction: 'none' }}
                />
              ) : (
                <p className="text-muted-foreground">Traitez d'abord une image</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="numbered" className="mt-4">
            <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
              {processedData?.numbered ? (
                <canvas 
                  ref={numberedCanvasRef}
                  className="max-w-full max-h-full cursor-move"
                  style={{ touchAction: 'none' }}
                />
              ) : (
                <p className="text-muted-foreground">Traitez d'abord une image</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="colorized" className="mt-4">
            <div className="bg-secondary rounded-lg aspect-video flex items-center justify-center overflow-hidden">
              {processedData?.colorized ? (
                <canvas 
                  ref={colorizedCanvasRef}
                  className="max-w-full max-h-full cursor-move"
                  style={{ touchAction: 'none' }}
                />
              ) : (
                <p className="text-muted-foreground">Traitez d'abord une image</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
