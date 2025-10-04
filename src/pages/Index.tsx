import { useState } from "react";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { ParametersPanel } from "@/components/ParametersPanel";
import { ColorPalette } from "@/components/ColorPalette";
import { Canvas } from "@/components/Canvas";
import { processImage, ProcessedResult } from "@/lib/imageProcessing";
import { toast } from "sonner";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [numColors, setNumColors] = useState(20);
  const [minRegionSize, setMinRegionSize] = useState(100);
  const [smoothness, setSmoothness] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedResult | null>(null);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setSelectedImageUrl(url);
    setProcessedData(null);
    toast.success("Image chargée avec succès !");
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error("Veuillez d'abord charger une image");
      return;
    }

    setIsProcessing(true);
    toast.info("Traitement de l'image en cours...");

    try {
      const result = await processImage(
        selectedFile,
        numColors,
        minRegionSize,
        smoothness
      );
      
      setProcessedData(result);
      toast.success("Modèle généré avec succès !");
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Erreur lors du traitement de l'image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPNG = () => {
    if (!processedData?.numbered) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = processedData.numbered.width;
    canvas.height = processedData.numbered.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(processedData.numbered, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'paint-by-numbers.png';
        a.click();
        toast.success("Export PNG réussi !");
      }
    });
  };

  const handleExportJSON = () => {
    if (!processedData) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const exportData = {
      palette: processedData.palette,
      zones: processedData.zones,
      metadata: {
        numColors,
        minRegionSize,
        smoothness,
        exportDate: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paint-by-numbers-data.json';
    a.click();
    toast.success("Export JSON réussi !");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[350px_1fr] gap-6">
          {/* Left Panel */}
          <div className="space-y-6">
            <ImageUpload 
              onImageSelect={handleImageSelect}
              selectedImage={selectedImageUrl}
            />
            
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

            {processedData && (
              <ColorPalette colors={processedData.palette} />
            )}
          </div>

          {/* Main Canvas Area */}
          <Canvas
            originalImage={selectedImageUrl}
            processedData={processedData}
            onExportPNG={handleExportPNG}
            onExportJSON={handleExportJSON}
          />
        </div>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>PaintByNumbers Studio • Créé avec ❤️ par Lovable</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
