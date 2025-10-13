import { useState } from "react";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { ParametersPanel } from "@/components/ParametersPanel";
import { ColorPalette } from "@/components/ColorPalette";
import { PalettePanel } from "@/components/PalettePanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AuthPanel } from "@/components/AuthPanel";
import { ColorAnalysisPanel } from "@/components/ColorAnalysisPanel";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { ViewTabs } from "@/components/studio/ViewTabs";
import { ExportBar } from "@/components/studio/ExportBar";
import { DebugPanel } from "@/components/studio/DebugPanel";
import { ProjectManager } from "@/components/studio/ProjectManager";
import { ProcessedResult, ColorAnalysis, analyzeImageColors } from "@/lib/imageProcessing";
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

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [numColors, setNumColors] = useState(20);
  const [minRegionSize, setMinRegionSize] = useState(100);
  const [smoothness, setSmoothness] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [colorAnalysis, setColorAnalysis] = useState<ColorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const windowSize = useWindowSize();
  const width = windowSize?.width ?? 0;
  const height = windowSize?.height ?? 0;
  const { saveJob } = useImageHistory();
  const { exportPNG, exportJSON } = useExport();
  const { user } = useAuth();
  const [zonesByColor, setZonesByColor] = useState<Map<number, Zone[]>>(new Map());
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [mergeTolerance, setMergeTolerance] = useState(5);

  const handleImageSelect = async (file: File) => {
    try {
      setSelectedFile(file);
      // Normalize image with EXIF correction and resize
      const normalizedUrl = await resizeForDisplay(file, IMAGE_PROCESSING.MAX_DISPLAY_WIDTH);
      setSelectedImageUrl(normalizedUrl);
      setProcessedData(null);
      setZonesByColor(new Map());
      setSelectedColorIdx(null);
      toast.success("Image chargée avec succès ! 🎨");
      
      // Launch color analysis automatically
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeImageColors(file, (progress) => {
          console.log(`Analyse: ${progress.toFixed(0)}%`);
        });
        setColorAnalysis(analysis);

        // Apply recommendations automatically
        setNumColors(analysis.recommendedNumColors);
        setMinRegionSize(analysis.recommendedMinRegionSize);
        setMergeTolerance(analysis.mode === "vector" ? 10 : 5);
        setSmoothness(analysis.mode === "vector" ? 0 : 50);
        
        toast.success(`✨ ${analysis.uniqueColorsCount} couleurs détectées — Recommandations appliquées`);
      } catch (error) {
        console.error("Color analysis error:", error);
        toast.error("Erreur lors de l'analyse des couleurs");
      } finally {
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error("Image normalization error:", error);
      toast.error("Erreur lors du chargement de l'image");
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error("Veuillez d'abord charger une image");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage("Initialisation...");
    toast.info("Traitement de l'image en cours... ⚡");

    const startTime = Date.now();

    try {
      // Process image in Web Worker with progress updates
      const vectorMode = colorAnalysis?.mode === "vector";
      const effectiveMinRegionSize = Math.max(minRegionSize, vectorMode ? 20 : minRegionSize);
      const effectiveSmoothness = vectorMode ? 0 : smoothness;
      const effectiveMergeTolerance = vectorMode ? Math.max(mergeTolerance, 10) : mergeTolerance;

      const result = await processImageWithWorker(
        selectedFile,
        numColors,
        effectiveMinRegionSize,
        effectiveSmoothness,
        effectiveMergeTolerance,
        (stage, progress) => {
          setProcessingStage(stage);
          setProcessingProgress(progress);
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      setProcessedData(result);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), UI.CONFETTI_DURATION_MS);
      toast.success("🎉 Modèle généré avec succès !");
      
      // Save to history
      const img = new Image();
      img.src = selectedImageUrl!;
      await img.decode();
      
      await saveJob({
        image_name: selectedFile.name,
        image_size: selectedFile.size,
        width: img.width,
        height: img.height,
        num_colors: numColors,
        min_region_size: effectiveMinRegionSize,
        smoothness: effectiveSmoothness,
        processing_time_ms: processingTime,
        zones_count: result.zones.length,
        palette: result.palette
      });
    } catch (error) {
      console.error("Processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du traitement de l'image";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStage("");
    }
  };

  const handleExportPNG = () => exportPNG(processedData);
  
  const handleExportJSON = () => exportJSON(processedData, { numColors, minRegionSize, smoothness });

  return (
    <div className="min-h-screen flex flex-col">
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
        isVisible={isProcessing}
      />
      
      <StudioLayout
        leftPanel={
          <>
            <ImageUpload 
              onImageSelect={handleImageSelect}
              selectedImage={selectedImageUrl}
            />
            
            {(colorAnalysis || isAnalyzing) && (
              <ColorAnalysisPanel 
                analysis={colorAnalysis}
                isAnalyzing={isAnalyzing}
              />
            )}
            
            <ParametersPanel
              numColors={numColors}
              onNumColorsChange={setNumColors}
              minRegionSize={minRegionSize}
              onMinRegionSizeChange={setMinRegionSize}
              smoothness={smoothness}
              onSmoothnessChange={setSmoothness}
              onProcess={handleProcess}
              isProcessing={isProcessing}
            />
            
            <ProjectManager
              currentImage={selectedImageUrl}
              currentResult={processedData}
              currentParams={{ numColors, minRegionSize, smoothness }}
              onLoadProject={(project) => {
                setSelectedImageUrl(project.imageUrl);
                setProcessedData(project.result);
                setNumColors(project.parameters.numColors);
                setMinRegionSize(project.parameters.minRegionSize);
                setSmoothness(project.parameters.smoothness);
                toast.success(`Projet "${project.name}" chargé`);
              }}
            />
          </>
        }
        
        centerPanel={
          <ViewTabs
            originalImage={selectedImageUrl}
            processedData={processedData}
          />
        }
        
        rightPanel={
          <>
            {processedData && (
              <>
                <ColorPalette colors={processedData.palette} />
                
                {zonesByColor.size > 0 && (
                  <PalettePanel
                    zonesByColor={zonesByColor}
                    selectedColorIdx={selectedColorIdx}
                    onColorSelect={setSelectedColorIdx}
                  />
                )}
                
                <DebugPanel processedData={processedData} />
              </>
            )}
            
            {user && <HistoryPanel />}
            <AuthPanel />
          </>
        }
        
        bottomBar={
          <ExportBar
            processedData={processedData}
            onExportPNG={handleExportPNG}
            onExportJSON={handleExportJSON}
          />
        }
      />
    </div>
  );
};

export default Index;
