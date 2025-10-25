import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Grid3x3, Hash, Palette, ArrowLeftRight, Activity } from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";
import { useStudio } from "@/contexts/StudioContext";
import { CompareSlider } from "./CompareSlider";
import { InspectionOverlay } from "./InspectionOverlay";
import { ProfilerPanel } from "./ProfilerPanel";
import { applyPaintEffect, PaintEffect } from "@/lib/postProcessing";
import { applyArtisticEffect, ArtisticEffect } from "@/lib/artisticEffects";
import { CanvasHUD } from "@/components/studio/CanvasHUD";

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

  // --- Portal vers la TopBar (si #topbar-tabs existe) ---
  const [tabsHost, setTabsHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.getElementById("topbar-tabs");
    setTabsHost(el);
  }, []);

  const getCanvasDataUrl = useMemo(() => {
    return (imageData: ImageData | null, key: string): string | null => {
      if (!imageData) return null;
      if (canvasCache.current.has(key)) {
        return canvasCache.current.get(key)!;
      }
      const canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        canvasCache.current.set(key, dataUrl);
        return dataUrl;
      }
      return null;
    };
  }, []);

  // Sync profiler toggle
  useEffect(() => {
    setProfilerEnabled(studio.settings.profilingEnabled);
  }, [studio.settings.profilingEnabled, setProfilerEnabled]);

  // Clear cache when inputs/effects change
  useEffect(() => {
    canvasCache.current.clear();
  }, [
    processedData,
    studio.settings.paintEffect,
    studio.settings.paintIntensity,
    studio.settings.artisticEffect,
    studio.settings.artisticIntensity,
  ]);

  const contoursUrl = useMemo(
    () => getCanvasDataUrl(processedData?.contours || null, "contours"),
    [processedData?.contours, getCanvasDataUrl]
  );

  const numberedUrl = useMemo(
    () => getCanvasDataUrl(processedData?.numbered || null, "numbered"),
    [processedData?.numbered, getCanvasDataUrl]
  );

  const colorizedUrl = useMemo(() => {
    if (!processedData?.colorized) return null;
    let finalImageData = processedData.colorized;

    if (studio.settings.paintEffect !== "none") {
      const paintEffect: PaintEffect = {
        type: studio.settings.paintEffect,
        intensity: studio.settings.paintIntensity,
      };
      finalImageData = measureSync(
        `Paint Effect (${studio.settings.paintEffect})`,
        () => applyPaintEffect(finalImageData, paintEffect)
      );
    }

    if (studio.settings.artisticEffect !== "none") {
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
    return getCanvasDataUrl(finalImageData, cacheKey);
  }, [
    processedData?.colorized,
    studio.settings.paintEffect,
    studio.settings.paintIntensity,
    studio.settings.artisticEffect,
    studio.settings.artisticIntensity,
    getCanvasDataUrl,
    measureSync,
  ]);

  const handleToggleProfiler = useCallback(
    (enabled: boolean) => {
      studio.updateSettings({ profilingEnabled: enabled });
    },
    [studio]
  );

  // --- Onglets (UI) : styles Figma-like, tokens Tailwind ---
const TabsBar = (
  <TabsList
    className="pill-tabs"
    aria-label="Modes d'affichage"
  >
    <TabsTrigger value="original" className="pill-tab">
      <Image className="w-4 h-4 mr-2" aria-hidden="true" /> Original
    </TabsTrigger>
    <TabsTrigger value="colorized" disabled={!processedData} className="pill-tab">
      <Palette className="w-4 h-4 mr-2" aria-hidden="true" /> Colorisé
    </TabsTrigger>
    <TabsTrigger value="contours" disabled={!processedData} className="pill-tab">
      <Grid3x3 className="w-4 h-4 mr-2" aria-hidden="true" /> Contours
    </TabsTrigger>
    <TabsTrigger value="numbered" disabled={!processedData} className="pill-tab">
      <Hash className="w-4 h-4 mr-2" aria-hidden="true" /> Numéroté
    </TabsTrigger>
    <TabsTrigger value="compare" disabled={!processedData} className="pill-tab">
      <ArrowLeftRight className="w-4 h-4 mr-2" aria-hidden="true" /> Comparer
    </TabsTrigger>
    <TabsTrigger value="profiler" className="pill-tab">
      <Activity className="w-4 h-4 mr-2" aria-hidden="true" /> Profiler
    </TabsTrigger>
  </TabsList>
);


  return (
    <Tabs
      value={studio.viewMode}
      onValueChange={(v) => studio.setViewMode(v as any)}
      className="h-full flex flex-col"
    >
      {/* --- Barre d’onglets --- 
           1) Si #topbar-tabs existe, on monte la barre dans la TopBar via portal
           2) Sinon, fallback inline sous forme de bandeau (comme avant)
      */}
      {tabsHost
        ? createPortal(TabsBar, tabsHost)
        : (
          <div className="px-6 pt-4 pb-2 border-b border-border/40 bg-card/30 backdrop-blur-sm">
            {TabsBar}
          </div>
        )
      }

      {/* --- Contenu des onglets --- */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <TabsContent value="original" className="h-full mt-0 data-[state=active]:flex">
          {originalImage ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <img
                src={originalImage}
                alt="Original"
                className="max-w-full max-h-full object-contain rounded-lg shadow"
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
      <div className="relative w-full h-full max-w-5xl">
        <img
          src={colorizedUrl}
          alt="Colorisé"
          className="max-w-full max-h-full object-contain rounded-lg shadow"
        />

        {/* === HUD posé par-dessus l'image === */}
        <CanvasHUD
          zoomPercent={studio.zoomPercent}                // voir Étape 3 ci-dessous
          canZoomIn={studio.zoomPercent < 800}
          canZoomOut={studio.zoomPercent > 10}
          onZoomIn={studio.zoomIn}
          onZoomOut={studio.zoomOut}
          onTogglePan={studio.togglePanTool}
          onPickColor={studio.pickColor}                 // si tu as une pipette ; sinon enlève cette prop
          numberedVisible={studio.overlay.numbered}      // si tu as cet état ; sinon voir Étape 3
          onToggleNumbered={(v) => studio.setOverlay({ ...studio.overlay, numbered: v })}
          overlayOpacity={studio.overlay.opacity}        // 0..100
          onChangeOverlayOpacity={(v) => studio.setOverlay({ ...studio.overlay, opacity: v })}
          onFindNumber={(n) => studio.findZoneByNumber?.(n)} // si tu as cette méthode
        />
      </div>
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
                className="max-w-full max-h-full object-contain rounded-lg shadow"
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
                className="max-w-full max-h-full object-contain rounded-lg shadow"
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
