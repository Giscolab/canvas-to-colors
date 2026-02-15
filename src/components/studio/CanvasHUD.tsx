import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Crosshair,
  Hand,
  Eye,
  EyeOff,
  Pipette,
  Hash } from
"lucide-react";
import { cn } from "@/lib/utils";

export interface CanvasHUDProps {
  zoomPercent: number;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTogglePan: () => void;
  onPickColor?: () => void;
  numberedVisible: boolean;
  onToggleNumbered: (visible: boolean) => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (val: number) => void;
  onFindNumber?: (n: number) => void;
  className?: string;
  status?: string;
  dimensions?: string;
  colorsCount?: number;
  fileSize?: string;
}

/**
 * CanvasHUD – fusion de la logique Studio et du design Figma (HUDCanvas)
 * Design néon teal / orange, layout fixe (haut et bas)
 */
export function CanvasHUD({
  zoomPercent,
  canZoomIn = true,
  canZoomOut = true,
  onZoomIn,
  onZoomOut,
  onTogglePan,
  onPickColor,
  numberedVisible,
  onToggleNumbered,
  overlayOpacity,
  onChangeOverlayOpacity,
  onFindNumber,
  className,
  status = "READY",
  dimensions = "1920×1080px",
  colorsCount = 24,
  fileSize = "2.4MB"
}: CanvasHUDProps) {
  const [findNumber, setFindNumber] = useState<number | "">("");

  const handleFindSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const n = typeof findNumber === "number" ? findNumber : Number.NaN;
      if (onFindNumber && Number.isFinite(n)) onFindNumber(n);
    },
    [findNumber, onFindNumber]
  );

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col justify-between z-40 select-none",
        className
      )}>

      {/* ===== HUD TOP ===== */}
      









































































      {/* Crosshair overlay (centré) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Crosshair className="w-10 h-10 text-teal-500/15" />
      </div>

      {/* ===== HUD BOTTOM ===== */}
      <div className="pointer-events-auto p-4">
        


































































      </div>
    </div>);

}