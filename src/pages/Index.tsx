import { useState, useEffect, useRef } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { ParametersPanel } from "@/components/ParametersPanel";
import { ColorPalette } from "@/components/ColorPalette";
import { PalettePanel } from "@/components/PalettePanel";
import { AuthPanel } from "@/components/AuthPanel";
import { ColorAnalysisPanel } from "@/components/ColorAnalysisPanel";
import { Header } from "@/components/Header";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { EnhancedViewTabs } from "@/components/studio/EnhancedViewTabs";
import { ExportBar } from "@/components/studio/ExportBar";
import { DebugPanel } from "@/components/studio/DebugPanel";

import { StudioProvider, useStudio } from "@/contexts/StudioContext";
import { analyzeImageColors } from "@/lib/imageProcessing";
import { processImageWithWorker } from "@/lib/imageProcessingWorker";
import { resizeForDisplay } from "@/lib/imageNormalization";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";
import { ProcessingProgress } from "@/components/ProcessingProgress";

import { useExport } from "@/hooks/useExport";
import { useAuth } from "@/hooks/useAuth";
import { Zone } from "@/hooks/useCanvasInteractions";
import { IMAGE_PROCESSING, UI } from "@/config/constants";
import { useAutoSave } from "@/hooks/useAutoSave";

/**
 * ================================
 *  PAINT BY NUMBERS STUDIO v1.0
 *  Layout global Figma-like
 *  - panneau gauche : paramètres + analyse
 *  - centre : canvas interactif
 *  - panneau droit : palette, debug, historique
 *  - barre bas : export
 * ================================
 */
function IndexContent() {
  const studio = useStudio();
  const { startProfiling, recordStage, endProfiling, clearHistory } = studio.profiler;
  useAutoSave();

  const lastFileRef = useRef<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zonesByColor, setZonesByColor] = useState<Map<number, Zone[]>>(new Map());
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);

  const { width = 0, height = 0 } = useWindowSize() ?? {};
  const { exportPNG, exportJSON, exportSVG } = useExport();
  const { user } = useAuth();

  // ========== IMAGE SELECTION ==========
  const handleImageSelect = async (file: File) => {
    try {
      lastFileRef.current = file;
      const tempUrl = URL.createObjectURL(file);
      setSelectedImageUrl(tempUrl);

      const initialProject = {
        id: Date.now().toString(),
        name: file.name,
        timestamp: Date.now(),
        imageUrl: tempUrl,
        imageFile: file,
        settings: studio.settings,
      };
      studio.setResult(null);
      studio.setCurrentProject(initialProject);
      setZonesByColor(new Map());
      setSelectedColorIdx(null);
      toast.success("Image chargée (aperçu)", { description: "Normalisation en cours…" });

      const normalizedUrl = await resizeForDisplay(file, IMAGE_PROCESSING.MAX_DISPLAY_WIDTH);
      setSelectedImageUrl(normalizedUrl);
      studio.setCurrentProject({ ...initialProject, imageUrl: normalizedUrl });
      URL.revokeObjectURL(tempUrl);

      setIsAnalyzing(true);
      const analysis = await analyzeImageColors(file, () => {});
      studio.setAnalysis(analysis);
      studio.updateSettings({
        numColors: analysis.recommendedNumColors,
        minRegionSize: analysis.recommendedMinRegionSize,
        mergeTolerance: analysis.mode === "vector" ? 10 : 5,
        smoothness: analysis.mode === "vector" ? 0 : 50,
      });
      toast.success(`✨ ${analysis.uniqueColorsCount} couleurs détectées`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement de l'image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ========== PROCESSING ==========
  const handleProcess = async () => {
    const file = studio.currentProject?.imageFile ?? lastFileRef.current;
    if (!file) return toast.error("Aucun fichier à traiter");

    studio.setIsProcessing(true);
    setProcessingStage("Initialisation…");
    toast.info("Traitement de l'image en cours ⚡");

    const profilingEnabled = studio.settings.profilingEnabled;
    let profilingActive = false;
    let lastStageLabel = "Initialisation";
    let lastStageTime = performance.now();

    if (profilingEnabled) {
      profilingActive = true;
      startProfiling();
    }

    try {
      const result = await processImageWithWorker(
        file,
        studio.settings.numColors,
        studio.settings.minRegionSize,
        studio.settings.smoothness,
        studio.settings.mergeTolerance,
        (stage, progress) => {
          setProcessingStage(stage);
          setProcessingProgress(progress);
          if (profilingActive) {
            const now = performance.now();
            recordStage(lastStageLabel, now - lastStageTime);
            lastStageLabel = stage;
            lastStageTime = now;
          }
        },
        studio.settings.smartPalette,
        studio.settings.enableArtisticMerge
      );

      studio.setResult(result);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), UI.CONFETTI_DURATION_MS);
      toast.success("🎉 Modèle généré avec succès !");
    } catch (err) {
      console.error("Erreur de traitement :", err);
      toast.error("Erreur lors du traitement de l'image");
      if (profilingActive) clearHistory();
    } finally {
      if (profilingActive) endProfiling();
      studio.setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // ========== EXPORT ==========
  const handleExportPNG = () => exportPNG(studio.result);
  const handleExportJSON = () => exportJSON(studio.result, studio.settings);
  const handleExportSVG = () => exportSVG(studio.result);

  // ========== RENDER ==========
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Confettis */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={UI.CONFETTI_PIECES}
          gravity={UI.CONFETTI_GRAVITY}
        />
      )}

      {/* Barre de progression */}
      <ProcessingProgress
        stage={processingStage}
        progress={processingProgress}
        isVisible={studio.isProcessing}
      />

      {/* === Layout principal === */}
      <StudioLayout
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
