import { useState } from "react";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { ParametersPanel } from "@/components/ParametersPanel";
import { ColorPalette } from "@/components/ColorPalette";
import { Canvas } from "@/components/Canvas";
import { processImage, ProcessedResult } from "@/lib/imageProcessing";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [numColors, setNumColors] = useState(20);
  const [minRegionSize, setMinRegionSize] = useState(100);
  const [smoothness, setSmoothness] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  const resizeImageForDisplay = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL());
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (file: File) => {
    setSelectedFile(file);
    const resizedUrl = await resizeImageForDisplay(file);
    setSelectedImageUrl(resizedUrl);
    setProcessedData(null);
    toast.success("Image chargée avec succès ! 🎨");
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error("Veuillez d'abord charger une image");
      return;
    }

    setIsProcessing(true);
    toast.info("Traitement de l'image en cours... ⚡");

    try {
      const result = await processImage(
        selectedFile,
        numColors,
        minRegionSize,
        smoothness
      );
      
      setProcessedData(result);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast.success("🎉 Modèle généré avec succès !");
    } catch (error) {
      console.error("Processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du traitement de l'image";
      toast.error(errorMessage);
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
        toast.success("✅ Export PNG réussi !");
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
    toast.success("✅ Export JSON réussi !");
  };

  return (
    <div className="min-h-screen">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
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

      <footer className="glass border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-medium">PaintByNumbers Studio • Créé avec ❤️ et ✨</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
