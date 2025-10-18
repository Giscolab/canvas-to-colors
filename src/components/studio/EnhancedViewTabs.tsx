import { useMemo, useRef, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Grid3x3, Hash, Palette, ArrowLeftRight, Activity } from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";
import { useStudio } from "@/contexts/StudioContext";
import { CompareSlider } from "./CompareSlider";
import { InspectionOverlay } from "./InspectionOverlay";
import { ProfilerPanel } from "./ProfilerPanel";
import { applyPaintEffect, PaintEffect } from "@/lib/postProcessing";
import { applyArtisticEffect, ArtisticEffect } from "@/lib/artisticEffects";

interface EnhancedViewTabsProps {
  originalImage: string | null;
  processedData: ProcessedResult | null;
}

export function EnhancedViewTabs({ originalImage, processedData }: EnhancedViewTabsProps) {
  const studio = useStudio();
  const canvasCache = useRef<Map<string, string>>(new Map());
  const {
    stats: profilerStats,
    setEnabled: setProfilerEnabled,
    measureSync,
    getCacheHitRatio,
    clearHistory,
  } = studio.profiler;

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

  // Synchronise le profiler avec les settings, mais uniquement si changement réel
  useEffect(() => {
    setProfilerEnabled(studio.settings.profilingEnabled);
  }, [studio.settings.profilingEnabled, setProfilerEnabled]);

  // Clear cache when processed data or paint/artistic settings change
  useEffect(() => {
    canvasCache.current.clear();
  }, [
    processedData, 
    studio.settings.paintEffect, 
    studio.settings.paintIntensity,
    studio.settings.artisticEffect,
    studio.settings.artisticIntensity
  ]);

  const contoursUrl = useMemo(() => 
    getCanvasDataUrl(processedData?.contours || null, 'contours'),
    [processedData?.contours, getCanvasDataUrl]
  );

  const numberedUrl = useMemo(() => 
    getCanvasDataUrl(processedData?.numbered || null, 'numbered'),
    [processedData?.numbered, getCanvasDataUrl]
  );

  const colorizedUrl = useMemo(() => {
    if (!processedData?.colorized) return null;
    
    // Apply effects pipeline: Paint -> Artistic
    let finalImageData = processedData.colorized;
    
    // 1. Apply paint effect if enabled
    if (studio.settings.paintEffect !== 'none') {
      const paintEffect: PaintEffect = {
        type: studio.settings.paintEffect,
        intensity: studio.settings.paintIntensity,
      };
      finalImageData = measureSync(
        `Paint Effect (${studio.settings.paintEffect})`,
        () => applyPaintEffect(finalImageData, paintEffect)
      );
    }
    
    // 2. Apply artistic effect if enabled
    if (studio.settings.artisticEffect !== 'none') {
      const artisticEffect: ArtisticEffect = {
        type: studio.settings.artisticEffect,
        intensity: studio.settings.artisticIntensity,
      };
      finalImageData = measureSync(
        `Artistic Effect (${studio.settings.artisticEffect})`,
        () => applyArtisticEffect(finalImageData, artisticEffect)
      );
    }
    
    const cacheKey = `colorized-${studio.settings.paintEffect}-${studio.settings.paintIntensity}-${studio.settings.artisticEffect}-${studio.settings.artisticIntensity}`;
    const result = getCanvasDataUrl(finalImageData, cacheKey);
    
    return result;
  }, [
    processedData?.colorized, 
    studio.settings.paintEffect, 
    studio.settings.paintIntensity,
    studio.settings.artisticEffect,
    studio.settings.artisticIntensity,
    getCanvasDataUrl,
    measureSync
  ]);

  // Callback pour gérer le toggle du profiler
  const handleToggleProfiler = useCallback(
    (enabled: boolean) => {
      studio.updateSettings({ profilingEnabled: enabled });
    },
    [studio]
  );

  return (
    <Tabs 
      value={studio.viewMode} 
      onValueChange={(v) => studio.setViewMode(v as any)} 
      className="h-full flex flex-col"
    >
      <div className="px-6 pt-4 pb-2 border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
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
          <TabsTrigger value="compare" className="flex items-center gap-2" disabled={!processedData}>
            <ArrowLeftRight className="w-4 h-4" />
            Comparer
          </TabsTrigger>
          <TabsTrigger value="profiler" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Profiler
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
          {processedData?.numbered && processedData?.labels ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <InspectionOverlay
                imageData={processedData.numbered}
                zones={processedData.zones}
                palette={processedData.palette}
                labels={processedData.labels}
                width={processedData.numbered.width}
                height={processedData.numbered.height}
              />
            </div>
          ) : numberedUrl ? (
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

        <TabsContent value="compare" className="h-full mt-0 data-[state=active]:flex">
          {originalImage && colorizedUrl ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="w-full h-full max-w-4xl">
                <CompareSlider
                  beforeImage={originalImage}
                  afterImage={colorizedUrl}
                  beforeLabel="Original"
                  afterLabel="Colorisé"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Traitez l'image pour comparer les versions
            </div>
          )}
        </TabsContent>

        {/* Profiler Tab */}
        <TabsContent value="profiler" className="h-full mt-0 data-[state=active]:flex">
          <div className="w-full h-full overflow-auto">
            <ProfilerPanel
              enabled={profilerStats.enabled}
              currentProfile={profilerStats.currentProfile}
              history={profilerStats.history}
              cacheHitRatio={getCacheHitRatio()}
              onToggleEnabled={handleToggleProfiler}
              onClearHistory={clearHistory}
            />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}