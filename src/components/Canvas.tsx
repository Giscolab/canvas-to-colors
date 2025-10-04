import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, FileCode, Grid3x3 } from "lucide-react";
import { useRef, useEffect, useState } from "react";

interface CanvasProps {
  originalImage: string | null;
  processedData: {
    contours: ImageData | null;
    numbered: ImageData | null;
    colorized: ImageData | null;
  } | null;
  onExportPNG: () => void;
  onExportJSON: () => void;
}

export const Canvas = ({ originalImage, processedData, onExportPNG, onExportJSON }: CanvasProps) => {
  const contoursCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberedCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorizedCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [activeTab, setActiveTab] = useState("original");

  // Initialize canvas when data is available or tab changes
  useEffect(() => {
    if (processedData?.contours && contoursCanvasRef.current) {
      const canvas = contoursCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = processedData.contours.width;
        canvas.height = processedData.contours.height;
        ctx.putImageData(processedData.contours, 0, 0);
      }
    }
  }, [processedData?.contours, activeTab]);

  useEffect(() => {
    if (processedData?.numbered && numberedCanvasRef.current) {
      const canvas = numberedCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = processedData.numbered.width;
        canvas.height = processedData.numbered.height;
        ctx.putImageData(processedData.numbered, 0, 0);
      }
    }
  }, [processedData?.numbered, activeTab]);

  useEffect(() => {
    if (processedData?.colorized && colorizedCanvasRef.current) {
      const canvas = colorizedCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = processedData.colorized.width;
        canvas.height = processedData.colorized.height;
        ctx.putImageData(processedData.colorized, 0, 0);
      }
    }
  }, [processedData?.colorized, activeTab]);


  return (
    <Card className="p-6 flex-1 relative glass hover-lift">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Zone de travail</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportPNG}
              disabled={!processedData}
              className="hover-lift hover:border-primary"
            >
              <Download className="mr-2 h-4 w-4" />
              PNG
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportJSON}
              disabled={!processedData}
              className="hover-lift hover:border-primary"
            >
              <FileCode className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="original" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <ImageIcon className="mr-2 h-4 w-4" />
              Original
            </TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Contours
            </TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Numéroté
            </TabsTrigger>
            <TabsTrigger value="colorized" disabled={!processedData} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <ImageIcon className="mr-2 h-4 w-4" />
              Aperçu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-4">
            <div className="bg-secondary rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {originalImage ? (
                <img 
                  src={originalImage} 
                  alt="Original" 
                  className="w-auto h-auto max-w-full max-h-full object-contain transition-transform hover:scale-105"
                />
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune image chargée</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">Uploadez une image pour commencer</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contours" className="mt-4">
            <div className="bg-white rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {processedData?.contours ? (
                <canvas 
                  ref={contoursCanvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <Grid3x3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Traitez d'abord une image</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="numbered" className="mt-4">
            <div className="bg-white rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {processedData?.numbered ? (
                <canvas 
                  ref={numberedCanvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <Grid3x3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Traitez d'abord une image</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="colorized" className="mt-4">
            <div className="bg-white rounded-xl min-h-[400px] max-h-[800px] flex items-center justify-center overflow-hidden shadow-inner">
              {processedData?.colorized ? (
                <canvas 
                  ref={colorizedCanvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Traitez d'abord une image</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
