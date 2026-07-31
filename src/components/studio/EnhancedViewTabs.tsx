import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Grid3x3, Hash, Palette, ArrowLeftRight, Activity, ZoomIn, ZoomOut, Move, Pipette, Eye, EyeOff, Download, Settings, Maximize2 } from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";
import { useStudio } from "@/contexts/StudioContext";
import { CompareSlider } from "./CompareSlider";
import { InspectionOverlay } from "./InspectionOverlay";
import { CanvasViewport, CanvasViewportHandle } from "./CanvasViewport";
import { ProfilerPanel } from "./ProfilerPanel";
import { applyPaintEffect, PaintEffect } from "@/lib/postProcessing";
import { applyArtisticEffect, ArtisticEffect } from "@/lib/artisticEffects";
import { CanvasHUD } from "@/components/studio/CanvasHUD";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EnhancedViewTabsProps {
  originalImage: string | null;
  processedData: ProcessedResult | null;
}

export function EnhancedViewTabs({ originalImage, processedData }: EnhancedViewTabsProps) {
  const studio = useStudio();
  const canvasCache = useRef<Map<string, string>>(new Map());
  const [imageInfo, setImageInfo] = useState<{width: number;height: number;size: string;} | null>(null);
  // 1. Ajout de la référence de dimensions
  const [referenceDimensions, setReferenceDimensions] = useState<{width: number;height: number;} | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<CanvasViewportHandle>(null);
  const [viewportScroll, setViewportScroll] = useState({ left: 0, top: 0 });

  const {
    stats: profilerStats,
    setEnabled: setProfilerEnabled,
    measureSync,
    getCacheHitRatio,
    clearHistory
  } = studio.profiler;

  // --- Portal vers la TopBar (si #topbar-tabs existe) ---
  const [tabsHost, setTabsHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("topbar-tabs");
    if (el) {
      setTabsHost(el);
    }
  }, []);


  // Récupérer les informations de l'image
  useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.onload = () => {
        // Estimer la taille du fichier (approximation)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const dataSize = canvas.toDataURL('image/jpeg', 0.8).length * 0.75;
          const sizeInKB = (dataSize / 1024).toFixed(2);
          setImageInfo({ width: img.width, height: img.height, size: `${sizeInKB} KB` });
        }
      };
      img.src = originalImage;
    }
  }, [originalImage]);

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
  studio.settings.artisticIntensity]
  );

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
        intensity: studio.settings.paintIntensity
      };
      finalImageData = measureSync(
        `Paint Effect (${studio.settings.paintEffect})`,
        () => applyPaintEffect(finalImageData, paintEffect)
      );
    }

    if (studio.settings.artisticEffect !== "none") {
      const artisticEffect: ArtisticEffect = {
        type: studio.settings.artisticEffect,
        intensity: studio.settings.artisticIntensity
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
  measureSync]
  );

  // 2. Capturer automatiquement les dimensions du rendu colorisé
  useEffect(() => {
    if (processedData?.colorized) {
      setReferenceDimensions({
        width: processedData.colorized.width,
        height: processedData.colorized.height
      });
    }
  }, [processedData?.colorized]);

  useEffect(() => {
    if (referenceDimensions) {
      viewportRef.current?.fitToScreen();
    }
  }, [referenceDimensions?.height, referenceDimensions?.width]);

  const handleToggleProfiler = useCallback(
    (enabled: boolean) => {
      studio.updateSettings({ profilingEnabled: enabled });
    },
    [studio]
  );

  const handleDownloadImage = useCallback((imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen && imageContainerRef.current) {
        // Entrée en plein écran
        if (imageContainerRef.current.requestFullscreen) {
          await imageContainerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else if (isFullscreen) {
        // Sortie en plein écran
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          return;
        }
      }
    } catch (err) {
      console.error("[Studio] Erreur toggleFullscreen :", err);
    }
  }, [isFullscreen]);
  // Synchroniser l'état plein écran avec les événements natifs du navigateur
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleZoomIn = useCallback(() => {
    viewportRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    viewportRef.current?.zoomOut();
  }, []);

  const handleResetView = useCallback(() => {
    viewportRef.current?.reset();
  }, []);

  const handleFitToScreen = useCallback(() => {
    viewportRef.current?.fitToScreen();
  }, []);


  // --- Onglets (UI) : styles Figma-like, tokens Tailwind ---
  const TabsBar = useMemo(() =>
  <TabsList
    className="studio-pill-tabs"
    aria-label="Modes d'affichage">

      <TabsTrigger value="original" className="studio-pill-tab" aria-label="Voir l'image originale">
        <ImageIcon className="w-4 h-4 mr-2" aria-hidden="true" /> Original
      </TabsTrigger>
      <TabsTrigger value="colorized" disabled={!processedData} className="studio-pill-tab" aria-label="Voir l'image colorisée">
        <Palette className="w-4 h-4 mr-2" aria-hidden="true" /> Colorisé
      </TabsTrigger>
      <TabsTrigger value="contours" disabled={!processedData} className="studio-pill-tab" aria-label="Voir les contours de l'image">
        <Grid3x3 className="w-4 h-4 mr-2" aria-hidden="true" /> Contours
      </TabsTrigger>
      <TabsTrigger value="numbered" disabled={!processedData} className="studio-pill-tab" aria-label="Voir les zones numérotées">
        <Hash className="w-4 h-4 mr-2" aria-hidden="true" /> Numéroté
      </TabsTrigger>
      <TabsTrigger value="compare" disabled={!processedData} className="studio-pill-tab" aria-label="Comparer l'original et le colorisé">
        <ArrowLeftRight className="w-4 h-4 mr-2" aria-hidden="true" /> Comparer
      </TabsTrigger>
      <TabsTrigger value="profiler" className="studio-pill-tab" aria-label="Afficher le profil de performance">
        <Activity className="w-4 h-4 mr-2" aria-hidden="true" /> Profiler
      </TabsTrigger>
    </TabsList>,
  [processedData]);

  return (
    <TooltipProvider>
      <Tabs
        value={studio.viewMode}
        onValueChange={(v) => studio.setViewMode(v as any)}
        className="h-full flex flex-col">

        {/* --- Barre d'onglets --- 
                 1) Si #topbar-tabs existe, on monte la barre dans la TopBar via portal
                 2) Sinon, fallback inline sous forme de bandeau (comme avant)
             */}
        {tabsHost ?
        createPortal(TabsBar, tabsHost) :

        <div className="px-6 pt-4 pb-2 border-b border-studio-border/40 bg-studio-panel-header/50 backdrop-blur-sm">
              {TabsBar}
            </div>

        }

        {/* --- Contenu des onglets --- */}
        <div className="flex-1 overflow-auto bg-studio-workspace">
          <TabsContent value="original" className="h-full mt-0 data-[state=active]:flex">
            {originalImage ?
            <div className="w-full h-full flex flex-col">
                {/* Barre d'outils d'image */}
                <div className="studio-panel-toolbar border-b border-studio-border/40 bg-studio-panel-header/60 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    {imageInfo &&
                  <span className="text-xs text-studio-foreground/70">
                        {imageInfo.width} × {imageInfo.height} • {imageInfo.size}
                      </span>
                  }
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom avant" className="studio-action-button" onClick={handleZoomIn}>
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom avant</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom arrière" className="studio-action-button" onClick={handleZoomOut}>
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom arrière</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => studio.togglePanTool()}>
                          <Move className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Outil de déplacement</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ajuster l'image à l'écran" className="studio-action-button" onClick={handleFitToScreen}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ajuster à l'écran</p></TooltipContent>
                    </Tooltip>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => handleDownloadImage(originalImage, "original.png")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Télécharger l'image</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Basculer en plein écran" className="studio-action-button" onClick={toggleFullscreen}>
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Plein écran</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Conteneur d'image */}
                <div ref={imageContainerRef} className="flex-1 relative" onDoubleClick={handleResetView}>
                  <CanvasViewport
                  ref={viewportRef}
                  width={imageInfo?.width ?? referenceDimensions?.width ?? 0}
                  height={imageInfo?.height ?? referenceDimensions?.height ?? 0}
                  zoomPercent={studio.zoomPercent}
                  onZoomChange={studio.setZoomPercent}
                  panTool={studio.panTool}
                  initialScroll={viewportScroll}
                  onScrollChange={setViewportScroll}>

                    <div className="relative w-full h-full">
                      <img
                      src={originalImage}
                      alt="Image originale du projet"
                      className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-studio-image"
                      draggable={false} />

                    </div>
                  </CanvasViewport>
                </div>
              </div> :

            <div className="h-full border-dotted border-primary border-2 flex-row py-0 flex items-center justify-center gap-0 bg-sidebar-border text-[studio-canvas-header] text-primary px-[150px] mx-0 my-0">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-studio-foreground/70">Chargez une image pour commencer</p>
                </div>
              </div>
            }
          </TabsContent>

          <TabsContent value="colorized" className="h-full mt-0 data-[state=active]:flex">
            {colorizedUrl ?
            <div className="w-full h-full flex flex-col">
                {/* Barre d'outils d'image */}
                <div className="studio-panel-toolbar border-b border-studio-border/40 bg-studio-panel-header/60 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    {imageInfo &&
                  <span className="text-xs text-studio-foreground/70">
                        {imageInfo.width} × {imageInfo.height}
                      </span>
                  }
                    {studio.settings.paintEffect !== "none" &&
                  <span className="studio-status-badge studio-status-badge--success">
                        {studio.settings.paintEffect}
                      </span>
                  }
                    {studio.settings.artisticEffect !== "none" &&
                  <span className="studio-status-badge studio-status-badge--success">
                        {studio.settings.artisticEffect}
                      </span>
                  }
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom avant" className="studio-action-button" onClick={handleZoomIn}>
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom avant</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom arrière" className="studio-action-button" onClick={handleZoomOut}>
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom arrière</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => studio.togglePanTool()}>
                          <Move className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Outil de déplacement</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        


                      </TooltipTrigger>
                      <TooltipContent><p>Pipette à couleurs</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ajuster l'image à l'écran" className="studio-action-button" onClick={handleFitToScreen}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ajuster à l'écran</p></TooltipContent>
                    </Tooltip>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => handleDownloadImage(colorizedUrl, "colorized.png")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Télécharger l'image</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Basculer en plein écran" className="studio-action-button" onClick={toggleFullscreen}>
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Plein écran</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Conteneur d'image */}
                <div ref={imageContainerRef} className="flex-1 relative" onDoubleClick={handleResetView}>
                  <CanvasViewport
                  ref={viewportRef}
                  width={referenceDimensions?.width ?? processedData?.colorized?.width ?? 0}
                  height={referenceDimensions?.height ?? processedData?.colorized?.height ?? 0}
                  zoomPercent={studio.zoomPercent}
                  onZoomChange={studio.setZoomPercent}
                  panTool={studio.panTool}
                  initialScroll={viewportScroll}
                  onScrollChange={setViewportScroll}>

                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 bg-studio-canvas-pattern opacity-5 pointer-events-none" />
                      <img
                      src={colorizedUrl}
                      alt="Image colorisée avec effets appliqués"
                      className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-studio-image"
                      draggable={false} />

                    </div>
                  </CanvasViewport>

                  <CanvasHUD
                  zoomPercent={studio.zoomPercent}
                  canZoomIn={studio.zoomPercent < 800}
                  canZoomOut={studio.zoomPercent > 10}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onTogglePan={studio.togglePanTool}
                  onPickColor={studio.pickColor}
                  numberedVisible={studio.overlay.numbered}
                  onToggleNumbered={(v) => studio.setOverlay({ ...studio.overlay, numbered: v })}
                  overlayOpacity={studio.overlay.opacity}
                  onChangeOverlayOpacity={(v) => studio.setOverlay({ ...studio.overlay, opacity: v })}
                  onFindNumber={(n) => studio.findZoneByNumber?.(n)} />

                </div>
              </div> :

            <div className="h-full flex items-center justify-center text-studio-foreground/50 py-[10px] my-0 px-[250px]">
                <div className="text-center">
                  <Palette className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-studio-foreground/70">Traitez l'image pour voir le rendu colorisé</p>
                </div>
              </div>
            }
          </TabsContent>

          <TabsContent value="contours" className="h-full mt-0 data-[state=active]:flex">
            {contoursUrl ?
            <div className="w-full h-full flex flex-col">
                {/* Barre d'outils d'image */}
                <div className="studio-panel-toolbar border-b border-studio-border/40 bg-studio-panel-header/60 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    {imageInfo &&
                  <span className="text-xs text-studio-foreground/70">
                        {imageInfo.width} × {imageInfo.height}
                      </span>
                  }
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom avant" className="studio-action-button" onClick={handleZoomIn}>
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom avant</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom arrière" className="studio-action-button" onClick={handleZoomOut}>
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom arrière</p></TooltipContent>
                    </Tooltip>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ajuster l'image à l'écran" className="studio-action-button" onClick={handleFitToScreen}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ajuster à l'écran</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => handleDownloadImage(contoursUrl, "contours.png")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Télécharger l'image</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Conteneur d'image */}
                <div ref={imageContainerRef} className="flex-1 relative" onDoubleClick={handleResetView}>
                  <CanvasViewport
                  ref={viewportRef}
                  width={referenceDimensions?.width ?? processedData?.contours?.width ?? 0}
                  height={referenceDimensions?.height ?? processedData?.contours?.height ?? 0}
                  zoomPercent={studio.zoomPercent}
                  onZoomChange={studio.setZoomPercent}
                  panTool={studio.panTool}
                  initialScroll={viewportScroll}
                  onScrollChange={setViewportScroll}>

                    <div className="relative w-full h-full">
                      <img
                      src={contoursUrl}
                      alt="Contours extraits de l'image"
                      className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-studio-image"
                      draggable={false} />

                    </div>
                  </CanvasViewport>
                </div>
              </div> :

            <div className="h-full flex items-center justify-center text-studio-foreground/50">
                <div className="text-center">
                  <Grid3x3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-studio-foreground/70">Traitez l'image pour voir les contours</p>
                </div>
              </div>
            }
          </TabsContent>

          <TabsContent value="numbered" className="h-full mt-0 data-[state=active]:flex">
            {processedData?.numbered && processedData?.labels ?
            <div className="w-full h-full flex flex-col">
                {/* Barre d'outils d'image */}
                <div className="studio-panel-toolbar border-b border-studio-border/40 bg-studio-panel-header/60 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    {imageInfo &&
                  <span className="text-xs text-studio-foreground/70">
                        {imageInfo.width} × {imageInfo.height}
                      </span>
                  }
                    <span className="studio-status-badge studio-status-badge--warning">
                      {processedData.zones.length} zones
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="studio-action-button"
                        onClick={() => studio.setOverlay({ ...studio.overlay, numbered: !studio.overlay.numbered })}>

                          {studio.overlay.numbered ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Afficher/Masquer les numéros</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom avant" className="studio-action-button" onClick={handleZoomIn}>
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom avant</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom arrière" className="studio-action-button" onClick={handleZoomOut}>
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom arrière</p></TooltipContent>
                    </Tooltip>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ajuster l'image à l'écran" className="studio-action-button" onClick={handleFitToScreen}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ajuster à l'écran</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => handleDownloadImage(numberedUrl || "", "numbered.png")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Télécharger l'image</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Conteneur d'image */}
                <div ref={imageContainerRef} className="flex-1 relative" onDoubleClick={handleResetView}>
                  <CanvasViewport
                  ref={viewportRef}
                  width={referenceDimensions?.width ?? processedData.numbered.width}
                  height={referenceDimensions?.height ?? processedData.numbered.height}
                  zoomPercent={studio.zoomPercent}
                  onZoomChange={studio.setZoomPercent}
                  panTool={studio.panTool}
                  initialScroll={viewportScroll}
                  onScrollChange={setViewportScroll}>

                    <div className="relative w-full h-full">
                      <InspectionOverlay
                      imageData={processedData.numbered}
                      zones={processedData.zones}
                      palette={processedData.palette}
                      labels={processedData.labels}
                      width={referenceDimensions?.width || processedData.numbered.width}
                      height={referenceDimensions?.height || processedData.numbered.height} />

                    </div>
                  </CanvasViewport>
                </div>
              </div> :
            numberedUrl ?
            <div className="w-full h-full flex flex-col">
                {/* Barre d'outils d'image */}
                <div className="studio-panel-toolbar border-b border-studio-border/40 bg-studio-panel-header/60 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    {imageInfo &&
                  <span className="text-xs text-studio-foreground/70">
                        {imageInfo.width} × {imageInfo.height}
                      </span>
                  }
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom avant" className="studio-action-button" onClick={handleZoomIn}>
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom avant</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Zoom arrière" className="studio-action-button" onClick={handleZoomOut}>
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Zoom arrière</p></TooltipContent>
                    </Tooltip>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ajuster l'image à l'écran" className="studio-action-button" onClick={handleFitToScreen}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ajuster à l'écran</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => handleDownloadImage(numberedUrl, "numbered.png")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Télécharger l'image</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Conteneur d'image */}
                <div ref={imageContainerRef} className="flex-1 relative" onDoubleClick={handleResetView}>
                  <CanvasViewport
                  ref={viewportRef}
                  width={referenceDimensions?.width ?? processedData?.numbered?.width ?? 0}
                  height={referenceDimensions?.height ?? processedData?.numbered?.height ?? 0}
                  zoomPercent={studio.zoomPercent}
                  onZoomChange={studio.setZoomPercent}
                  panTool={studio.panTool}
                  initialScroll={viewportScroll}
                  onScrollChange={setViewportScroll}>

                    <div className="relative w-full h-full">
                      <img
                      src={numberedUrl}
                      alt="Image avec zones numérotées"
                      className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-studio-image"
                      draggable={false} />

                    </div>
                  </CanvasViewport>
                </div>
              </div> :

            <div className="h-full flex items-center justify-center text-studio-foreground/50">
                <div className="text-center">
                  <Hash className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-studio-foreground/70">Traitez l'image pour voir le résultat numéroté</p>
                </div>
              </div>
            }
          </TabsContent>

          <TabsContent value="compare" className="h-full mt-0 data-[state=active]:flex">
            {originalImage && colorizedUrl ?
            <div className="w-full h-full flex flex-col">
                {/* Barre d'outils de comparaison */}
                <div className="studio-panel-toolbar border-b border-studio-border/40 bg-studio-panel-header/60 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    {imageInfo &&
                  <span className="text-xs text-studio-foreground/70">
                        {imageInfo.width} × {imageInfo.height}
                      </span>
                  }
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="studio-action-button" onClick={() => handleDownloadImage(colorizedUrl, "colorized.png")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Télécharger l'image colorisée</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Basculer en plein écran" className="studio-action-button" onClick={toggleFullscreen}>
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Plein écran</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Conteneur de comparaison */}
                <div ref={imageContainerRef} className="flex-1 flex items-center justify-center p-8 overflow-auto">
                  <div
                  className="w-full h-full max-w-4xl"
                  style={{
                    width: referenceDimensions?.width || "auto",
                    height: referenceDimensions?.height || "auto"
                  }}>

                    <CompareSlider
                    beforeImage={originalImage}
                    afterImage={colorizedUrl}
                    beforeLabel="Original"
                    afterLabel="Colorisé"
                    showHandleHint
                    width={referenceDimensions?.width}
                    height={referenceDimensions?.height} />

                  </div>
                </div>
              </div> :

            <div className="h-full flex items-center justify-center text-studio-foreground/50">
                <div className="text-center">
                  <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-studio-foreground/70">Traitez l'image pour comparer les versions</p>
                </div>
              </div>
            }
          </TabsContent>

          <TabsContent value="profiler" className="h-full mt-0 data-[state=active]:flex">
            <div className="w-full h-full overflow-auto">
              <ProfilerPanel
                enabled={profilerStats.enabled}
                currentProfile={profilerStats.currentProfile}
                history={profilerStats.history}
                cacheHitRatio={getCacheHitRatio()}
                onToggleEnabled={handleToggleProfiler}
                onClearHistory={clearHistory} />

            </div>
          </TabsContent>
        </div>
      </Tabs>
    </TooltipProvider>);

}