import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Download,
  Image as ImageIcon,
  FileCode,
  Grid3x3,
  X,
  ZoomIn,
  Maximize2,
  RefreshCw
} from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useCanvasInteractions, Zone } from "@/hooks/useCanvasInteractions";
import { Badge } from "@/components/ui/badge";

interface CanvasProps {
  originalImage: string | null;
  processedData: {
    contours: ImageData | null;
    numbered: ImageData | null;
    colorized: ImageData | null;
    zones?: Zone[];
    labels?: Int32Array;
  } | null;
  onExportPNG: () => void;
  onExportJSON: () => void;
}

export const Canvas = ({ originalImage, processedData, onExportPNG, onExportJSON }: CanvasProps) => {
  const contoursCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberedCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorizedCanvasRef = useRef<HTMLCanvasElement>(null);

  // Refs distincts pour chaque conteneur
  const contoursContainerRef = useRef<HTMLDivElement>(null);
  const numberedContainerRef = useRef<HTMLDivElement>(null);
  const colorizedContainerRef = useRef<HTMLDivElement>(null);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [activeTab, setActiveTab] = useState("original");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

// Redimensionner le canvas pour occuper 100% du conteneur visible
const resizeCanvasToContainer = useCallback(
  (
    canvas: HTMLCanvasElement | null,
    imageData: ImageData | null,
    container: HTMLDivElement | null
  ) => {
    if (!canvas || !imageData || !container) return;

    // Taille interne = image réelle (pour la qualité)
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // Taille d’affichage = 100% du conteneur
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // Le conteneur prend toute la place disponible
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.overflow = "hidden";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.alignItems = "center";

    // Rendu du contenu
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) ctx.putImageData(imageData, 0, 0);
  },
  []
);


  // Déterminer le conteneur actif
  const getActiveContainer = useCallback(() => {
    switch (activeTab) {
      case "contours": return contoursContainerRef.current;
      case "numbered": return numberedContainerRef.current;
      case "colorized": return colorizedContainerRef.current;
      default: return null;
    }
  }, [activeTab]);

  // Gérer le redimensionnement
  useEffect(() => {
    const updateDimensions = () => {
      const container = getActiveContainer();
      if (container) {
        setContainerDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [activeTab, isFullscreen, getActiveContainer]);

  // Redessiner selon l’onglet actif
  useEffect(() => {
    if (processedData?.contours && contoursCanvasRef.current)
      resizeCanvasToContainer(contoursCanvasRef.current, processedData.contours, contoursContainerRef.current);
  }, [processedData?.contours, activeTab, containerDimensions, resizeCanvasToContainer]);

  useEffect(() => {
    if (processedData?.numbered && numberedCanvasRef.current)
      resizeCanvasToContainer(numberedCanvasRef.current, processedData.numbered, numberedContainerRef.current);
  }, [processedData?.numbered, activeTab, containerDimensions, resizeCanvasToContainer]);

  useEffect(() => {
    if (processedData?.colorized && colorizedCanvasRef.current)
      resizeCanvasToContainer(colorizedCanvasRef.current, processedData.colorized, colorizedContainerRef.current);
  }, [processedData?.colorized, activeTab, containerDimensions, resizeCanvasToContainer]);

  const contoursInteractions = useCanvasInteractions({
    canvasRef: contoursCanvasRef,
    originalImageData: processedData?.contours || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
    onZoneSelect: setSelectedZone
  });

  const numberedInteractions = useCanvasInteractions({
    canvasRef: numberedCanvasRef,
    originalImageData: processedData?.numbered || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
    onZoneSelect: setSelectedZone
  });

  const colorizedInteractions = useCanvasInteractions({
    canvasRef: colorizedCanvasRef,
    originalImageData: processedData?.colorized || null,
    zones: processedData?.zones || [],
    labels: processedData?.labels,
    onZoneSelect: setSelectedZone
  });

  const getActiveInteractions = () => {
    switch (activeTab) {
      case "contours": return contoursInteractions;
      case "numbered": return numberedInteractions;
      case "colorized": return colorizedInteractions;
      default: return null;
    }
  };

  const activeInteractions = getActiveInteractions();
  const zonesCount = processedData?.zones?.length || 0;

  return (
    <Card className={`p-6 flex-1 relative glass hover-lift ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <div className="space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Zone de travail</h3>
            {processedData && zonesCount > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                {zonesCount} zones
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {activeInteractions && activeTab !== "original" && (
              <>
                <Button variant="outline" size="sm" onClick={() => activeInteractions.resetTransform()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onExportPNG} disabled={!processedData}>
              <Download className="mr-2 h-4 w-4" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={onExportJSON} disabled={!processedData}>
              <FileCode className="mr-2 h-4 w-4" /> JSON
            </Button>
          </div>
        </div>

        {/* INFOS */}
        {activeInteractions && activeTab !== "original" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ZoomIn className="h-4 w-4" />
            <span>Zoom: {Math.round(activeInteractions.scale * 100)}%</span>
            <span className="text-xs ml-2">• Molette pour zoomer • Glisser pour déplacer</span>
          </div>
        )}

        {/* CONTENEURS DES TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="contours" disabled={!processedData}>Contours</TabsTrigger>
            <TabsTrigger value="numbered" disabled={!processedData}>Numéroté</TabsTrigger>
            <TabsTrigger value="colorized" disabled={!processedData}>Aperçu</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-4">
            <div className="canvas-container bg-secondary rounded-xl shadow-inner">
              {originalImage ? (
                <img src={originalImage} alt="Original" />
              ) : (
                <div className="text-muted-foreground p-8">Aucune image chargée</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contours" className="mt-4">
            <div ref={contoursContainerRef} className="canvas-container bg-white rounded-xl shadow-inner">
              {processedData?.contours ? (
                <canvas ref={contoursCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
              ) : (
                <div className="text-muted-foreground p-8">Traitez d'abord une image</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="numbered" className="mt-4">
            <div ref={numberedContainerRef} className="canvas-container bg-white rounded-xl shadow-inner">
              {processedData?.numbered ? (
                <canvas ref={numberedCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
              ) : (
                <div className="text-muted-foreground p-8">Traitez d'abord une image</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="colorized" className="mt-4">
            <div ref={colorizedContainerRef} className="canvas-container bg-white rounded-xl shadow-inner">
              {processedData?.colorized ? (
                <canvas ref={colorizedCanvasRef} className="cursor-move" style={{ touchAction: "none" }} />
              ) : (
                <div className="text-muted-foreground p-8">Traitez d'abord une image</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
