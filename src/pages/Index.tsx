import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { ParametersPanel } from "@/components/ParametersPanel";
import { ColorPalette } from "@/components/ColorPalette";
import { PalettePanel } from "@/components/PalettePanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AuthPanel } from "@/components/AuthPanel";
import { ColorAnalysisPanel } from "@/components/ColorAnalysisPanel";
import { ResizableStudioLayout } from "@/components/studio/ResizableStudioLayout";
import { EnhancedViewTabs } from "@/components/studio/EnhancedViewTabs";
import { ExportBar } from "@/components/studio/ExportBar";
import { DebugPanel } from "@/components/studio/DebugPanel";
import { EnhancedProjectManager } from "@/components/studio/EnhancedProjectManager";
import { StudioProvider, useStudio } from "@/contexts/StudioContext";
import { analyzeImageColors } from "@/lib/imageProcessing";
import { processImageWithWorker } from "@/lib/imageProcessingWorker";
import { resizeForDisplay } from "@/lib/imageNormalization";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import { useImageHistory } from "@/hooks/useImageHistory";
import { useExport } from "@/hooks/useExport";
import { useAuth } from "@/hooks/useAuth";
import { Zone } from "@/hooks/useCanvasInteractions";
import { IMAGE_PROCESSING, UI } from "@/config/constants";
import { useAutoSave } from "@/hooks/useAutoSave";

function IndexContent() {
  const studio = useStudio();
  const { startProfiling, recordStage, endProfiling, clearHistory } = studio.profiler;
  useAutoSave();

  // REF sûre du dernier file pour fallback
  const lastFileRef = useRef<File | null>(null);

  // UI state (non source de vérité)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zonesByColor, setZonesByColor] = useState<Map<number, Zone[]>>(new Map());
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);

  const { width = 0, height = 0 } = useWindowSize() ?? {};
  const { saveJob } = useImageHistory();
  const { exportPNG, exportJSON, exportSVG } = useExport();
  const { user } = useAuth();

  useEffect(() => {
    if (studio.result) {
      // si tu veux recalculer zonesByColor depuis studio.result
    }
  }, [studio.result]);

  // ============== SÉLECTION D’IMAGE : projet créé immédiatement ==============
  const handleImageSelect = async (file: File) => {
    try {
      lastFileRef.current = file;

      // anti-race pour sélections rapides
      const selectionId = Date.now();
      (handleImageSelect as any)._lastSelectionId = selectionId;

      // 1) Aperçu instantané (temp blob)
      const tempUrl = URL.createObjectURL(file);
      setSelectedImageUrl(tempUrl);

      // 2) Crée le projet IMMÉDIATEMENT (imageFile dispo pour le traitement)
      const initialProject = {
        id: Date.now().toString(),
        name: file.name,
        timestamp: Date.now(),
        imageUrl: tempUrl,   // on met le blob tout de suite
        imageFile: file,     // ← **clé** : prêt pour handleProcess dès maintenant
        settings: studio.settings,
      };
      studio.setResult(null);
      studio.setCurrentProject(initialProject);
      setZonesByColor(new Map());
      setSelectedColorIdx(null);
      toast.success("Image chargée (aperçu)", { description: "Normalisation en cours…" });

      // 3) Normalisation en arrière-plan, puis on remplace uniquement l’URL
      const normalizedUrl = await resizeForDisplay(file, IMAGE_PROCESSING.MAX_DISPLAY_WIDTH);

      if ((handleImageSelect as any)._lastSelectionId !== selectionId) {
        // une autre image a été choisie entre-temps
        URL.revokeObjectURL(tempUrl);
        return;
      }

      setSelectedImageUrl(normalizedUrl);
      // on RE-sauve le projet avec la même imageFile mais une URL propre
      studio.setCurrentProject({
        ...initialProject,
        imageUrl: normalizedUrl,
      });
      URL.revokeObjectURL(tempUrl);

      // 4) Analyse des couleurs (recommendations)
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeImageColors(file, () => {});
        studio.setAnalysis(analysis);
        studio.updateSettings({
          numColors: analysis.recommendedNumColors,
          minRegionSize: analysis.recommendedMinRegionSize,
          mergeTolerance: analysis.mode === "vector" ? 10 : 5,
          smoothness: analysis.mode === "vector" ? 0 : 50,
        });
        toast.success(`✨ ${analysis.uniqueColorsCount} couleurs détectées — recommandations appliquées`);
      } catch (err) {
        console.error("Color analysis error:", err);
        toast.error("Erreur lors de l'analyse des couleurs");
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error("Image selection error:", err);
      toast.error("Erreur lors du chargement de l'image");
    }
  };

  // =================== TRAITEMENT : lit toujours imageFile ===================
  const handleProcess = async () => {
    const file = studio.currentProject?.imageFile ?? lastFileRef.current;
    if (!file) {
      toast.error("Aucun fichier à traiter", {
        description: "Charge une image d’abord (imageFile manquant).",
      });
      return;
    }

    studio.setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage("Initialisation…");
    toast.info("Traitement de l'image en cours… ⚡");

    const startTime = Date.now();
    const profilingEnabled = studio.settings.profilingEnabled;
    let profilingActive = false;
    let lastStageLabel: string | null = profilingEnabled ? "Initialisation" : null;
    let lastStageTimestamp = 0;

    if (profilingEnabled) {
      profilingActive = true;
      startProfiling();
      lastStageTimestamp = performance.now();
    }

    try {
      const vectorMode = studio.analysis?.mode === "vector";
      const effectiveMinRegionSize = Math.max(
        studio.settings.minRegionSize,
        vectorMode ? 20 : studio.settings.minRegionSize
      );
      const effectiveSmoothness = vectorMode ? 0 : studio.settings.smoothness;
      const effectiveMergeTolerance = vectorMode
        ? Math.max(studio.settings.mergeTolerance, 10)
        : studio.settings.mergeTolerance;

      const result = await processImageWithWorker(
        file,
        studio.settings.numColors,
        effectiveMinRegionSize,
        effectiveSmoothness,
        effectiveMergeTolerance,
        (stage, progress) => {
          setProcessingStage(stage);
          setProcessingProgress(progress);

          if (profilingActive) {
            const now = performance.now();
            if (lastStageLabel) recordStage(lastStageLabel, now - lastStageTimestamp);
            lastStageLabel = stage;
            lastStageTimestamp = now;
          }
        },
        studio.settings.smartPalette,
        studio.settings.enableArtisticMerge
      );

      const processingTime = Date.now() - startTime;

      studio.setResult(result);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), UI.CONFETTI_DURATION_MS);
      toast.success("🎉 Modèle généré avec succès !");

      // Historique (dimensions affichage à partir de selectedImageUrl)
      if (selectedImageUrl) {
        const img = new Image();
        img.src = selectedImageUrl;
        await img.decode();

        await saveJob({
          image_name: file.name,
          image_size: file.size,
          width: img.width,
          height: img.height,
          num_colors: studio.settings.numColors,
          min_region_size: effectiveMinRegionSize,
          smoothness: effectiveSmoothness,
          processing_time_ms: processingTime,
          zones_count: result.zones.length,
          palette: result.palette,
        });
      }

      if (profilingActive) {
        const finalize = () => {
          const now = performance.now();
          if (lastStageLabel) recordStage(lastStageLabel, now - lastStageTimestamp);
          endProfiling(Boolean(result.metadata?.wasCached));
        };
        if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(finalize);
        else setTimeout(finalize, 0);
      }
    } catch (err) {
      console.error("Processing error:", err);
      toast.error("Erreur lors du traitement de l'image");
      if (profilingActive) clearHistory();
    } finally {
      studio.setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStage("");
    }
  };

  // ======================== EXPORT ========================
  const handleExportPNG = () => exportPNG(studio.result);
  const handleExportJSON = () => exportJSON(studio.result, studio.settings);
  const handleExportSVG = () => exportSVG(studio.result);

  return (
    <div className="min-h-screen flex flex-col pt-16">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={UI.CONFETTI_PIECES}
          gravity={UI.CONFETTI_GRAVITY}
        />
      )}

      <Header />

      <ProcessingProgress
        stage={processingStage}
        progress={processingProgress}
        isVisible={studio.isProcessing}
      />

      <ResizableStudioLayout
        leftPanel={
          <>
            <ImageUpload onImageSelect={handleImageSelect} selectedImage={selectedImageUrl} />

            {(studio.analysis || isAnalyzing) && (
              <ColorAnalysisPanel
                analysis={studio.analysis}
                isAnalyzing={isAnalyzing}
                processedResult={studio.result}
              />
            )}

            <ParametersPanel
              numColors={studio.settings.numColors}
              onNumColorsChange={(v) => studio.updateSettings({ numColors: v })}
              minRegionSize={studio.settings.minRegionSize}
              onMinRegionSizeChange={(v) => studio.updateSettings({ minRegionSize: v })}
              smoothness={studio.settings.smoothness}
              onSmoothnessChange={(v) => studio.updateSettings({ smoothness: v })}
              mergeTolerance={studio.settings.mergeTolerance}
              onMergeToleranceChange={(v) => studio.updateSettings({ mergeTolerance: v })}
              enableArtisticMerge={studio.settings.enableArtisticMerge}
              onEnableArtisticMergeChange={(v) => studio.updateSettings({ enableArtisticMerge: v })}
              smartPalette={studio.settings.smartPalette}
              onSmartPaletteChange={(v) => studio.updateSettings({ smartPalette: v })}
              paintEffect={studio.settings.paintEffect}
              onPaintEffectChange={(effect) => studio.updateSettings({ paintEffect: effect })}
              paintIntensity={studio.settings.paintIntensity}
              onPaintIntensityChange={(intensity) => studio.updateSettings({ paintIntensity: intensity })}
              artisticEffect={studio.settings.artisticEffect}
              onArtisticEffectChange={(effect) => studio.updateSettings({ artisticEffect: effect })}
              artisticIntensity={studio.settings.artisticIntensity}
              onArtisticIntensityChange={(intensity) =>
                studio.updateSettings({ artisticIntensity: intensity })
              }
              profilingEnabled={studio.settings.profilingEnabled}
              onProfilingEnabledChange={(enabled) =>
                studio.updateSettings({ profilingEnabled: enabled })
              }
              onProcess={handleProcess}
              isProcessing={studio.isProcessing}
            />

            <EnhancedProjectManager />
          </>
        }
        centerPanel={<EnhancedViewTabs originalImage={selectedImageUrl} processedData={studio.result} />}
        rightPanel={
          <>
            {studio.result && (
              <>
                <ColorPalette colors={studio.result.palette} />
                {zonesByColor.size > 0 && (
                  <PalettePanel
                    zonesByColor={zonesByColor}
                    selectedColorIdx={selectedColorIdx}
                    onColorSelect={setSelectedColorIdx}
                  />
                )}
                <DebugPanel processedData={studio.result} />
              </>
            )}
            {user && <HistoryPanel />}
            <AuthPanel />
          </>
        }
        bottomBar={
          <ExportBar
            processedData={studio.result}
            onExportPNG={handleExportPNG}
            onExportJSON={handleExportJSON}
            onExportSVG={handleExportSVG}
          />
        }
      />
    </div>
  );
}

const Index = () => (
  <StudioProvider>
    <IndexContent />
  </StudioProvider>
);

export default Index;
