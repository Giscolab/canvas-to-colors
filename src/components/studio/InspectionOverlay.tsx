import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Zone } from "@/lib/imageProcessing";
import { Maximize2 } from "lucide-react";

interface InspectionOverlayProps {
  imageData: ImageData | null;
  zones: Zone[];
  palette: string[];
  labels?: Int32Array;
  width: number;
  height: number;
}

export function InspectionOverlay({ 
  imageData, 
  zones, 
  palette, 
  labels,
  width,
  height 
}: InspectionOverlayProps) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [zoneInfo, setZoneInfo] = useState<{
    zoneId: number;
    colorIdx: number;
    color: string;
    area: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !labels) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      setMousePos({ x, y });
      
      const zoneId = labels[y * width + x];
      const zone = zones.find(z => z.id === zoneId);
      
      if (zone) {
        setZoneInfo({
          zoneId: zone.id,
          colorIdx: zone.colorIdx,
          color: palette[zone.colorIdx] || '#000000',
          area: zone.area,
        });
      } else {
        setZoneInfo(null);
      }
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setZoneInfo(null);
  };

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  if (!imageData) return null;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {zoneInfo && mousePos && (
        <Card className="absolute z-50 p-3 shadow-premium text-xs space-y-1 pointer-events-none"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y - 120}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">Zone #{zoneInfo.zoneId}</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border border-border"
              style={{ backgroundColor: zoneInfo.color }}
            />
            <span className="text-muted-foreground">{zoneInfo.color}</span>
          </div>
          <div className="text-muted-foreground">
            Couleur #{zoneInfo.colorIdx + 1}
          </div>
          <div className="text-muted-foreground">
            Surface: {zoneInfo.area}px²
          </div>
        </Card>
      )}
    </div>
  );
}
