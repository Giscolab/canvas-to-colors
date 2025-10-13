import { useMemo, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Grid3x3, Hash, Palette } from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";
import { useStudio } from "@/contexts/StudioContext";

interface EnhancedViewTabsProps {
  originalImage: string | null;
  processedData: ProcessedResult | null;
}

export function EnhancedViewTabs({ originalImage, processedData }: EnhancedViewTabsProps) {
  const { viewMode, setViewMode } = useStudio();
  const canvasCache = useRef<Map<string, string>>(new Map());

  const getCanvasDataUrl = useMemo(() => {
    return (imageData: ImageData | null, key: string): string | null => {
      if (!imageData) return null;
      
      // Check cache first
      if (canvasCache.current.has(key)) {
        return canvasCache.current.get(key)!;
      }

      // Create canvas and cache result
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        canvasCache.current.set(key, dataUrl);
        return dataUrl;
      }
      
      return null;
    };
  }, []);

  // Clear cache when processed data changes
  useEffect(() => {
    canvasCache.current.clear();
  }, [processedData]);

  const contoursUrl = useMemo(() => 
    getCanvasDataUrl(processedData?.contours || null, 'contours'),
    [processedData?.contours, getCanvasDataUrl]
  );

  const numberedUrl = useMemo(() => 
    getCanvasDataUrl(processedData?.numbered || null, 'numbered'),
    [processedData?.numbered, getCanvasDataUrl]
  );

  const colorizedUrl = useMemo(() => 
    getCanvasDataUrl(processedData?.colorized || null, 'colorized'),
    [processedData?.colorized, getCanvasDataUrl]
  );

  return (
    <Tabs 
      value={viewMode} 
      onValueChange={(v) => setViewMode(v as any)} 
      className="h-full flex flex-col"
    >
      <div className="px-6 pt-4 pb-2 border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="original" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Original
          </TabsTrigger>
          <TabsTrigger value="colorized" className="flex items-center gap-2" disabled={!processedData}>
            <Palette className="w-4 h-4" />
            Colorisé
          </TabsTrigger>
          <TabsTrigger value="contours" className="flex items-center gap-2" disabled={!processedData}>
            <Grid3x3 className="w-4 h-4" />
            Contours
          </TabsTrigger>
          <TabsTrigger value="numbered" className="flex items-center gap-2" disabled={!processedData}>
            <Hash className="w-4 h-4" />
            Numéroté
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto bg-muted/20">
        <TabsContent value="original" className="h-full mt-0 data-[state=active]:flex">
          {originalImage ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <img 
                src={originalImage} 
                alt="Original"
                className="max-w-full max-h-full object-contain rounded-lg shadow-elegant"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Chargez une image pour commencer
            </div>
          )}
        </TabsContent>

        <TabsContent value="colorized" className="h-full mt-0 data-[state=active]:flex">
          {colorizedUrl ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <img 
                src={colorizedUrl} 
                alt="Colorisé"
                className="max-w-full max-h-full object-contain rounded-lg shadow-elegant"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Traitez l'image pour voir le rendu colorisé
            </div>
          )}
        </TabsContent>

        <TabsContent value="contours" className="h-full mt-0 data-[state=active]:flex">
          {contoursUrl ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <img 
                src={contoursUrl} 
                alt="Contours"
                className="max-w-full max-h-full object-contain rounded-lg shadow-elegant"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Traitez l'image pour voir les contours
            </div>
          )}
        </TabsContent>

        <TabsContent value="numbered" className="h-full mt-0 data-[state=active]:flex">
          {numberedUrl ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <img 
                src={numberedUrl} 
                alt="Numéroté"
                className="max-w-full max-h-full object-contain rounded-lg shadow-elegant"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Traitez l'image pour voir le résultat numéroté
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
