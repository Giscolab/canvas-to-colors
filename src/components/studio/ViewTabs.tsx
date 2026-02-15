import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Grid3x3, Hash } from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";

interface ViewTabsProps {
  originalImage: string | null;
  processedData: ProcessedResult | null;
}

export function ViewTabs({ originalImage, processedData }: ViewTabsProps) {
  const [activeView, setActiveView] = useState<"original" | "contours" | "numbered">("original");

  const renderCanvas = (imageData: ImageData | null, label: string) => {
    if (!imageData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }

    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <img 
          src={canvas.toDataURL()} 
          alt={label}
          className="max-w-full max-h-full object-contain rounded-lg shadow-elegant"
        />
      </div>
    );
  };

  return (
    <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="h-full flex flex-col">
      <div className="px-6 pt-4 pb-2 border-b border-border/40">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="original" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Original
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

      <div className="flex-1 overflow-auto">
        <TabsContent value="original" className="h-full mt-0">
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
              Aucune image chargée
            </div>
          )}
        </TabsContent>

        <TabsContent value="contours" className="h-full mt-0">
          {processedData?.contours ? (
            renderCanvas(processedData.contours, "Contours")
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Traitez l'image pour voir les contours
            </div>
          )}
        </TabsContent>

        <TabsContent value="numbered" className="h-full mt-0">
          {processedData?.numbered ? (
            renderCanvas(processedData.numbered, "Numéroté")
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
