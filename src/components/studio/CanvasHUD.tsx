import React, { useCallback, useState } from "react";
import { motion } from "motion/react";
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
  Hash,
} from "lucide-react";
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
  fileSize = "2.4MB",
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
      )}
    >
      {/* ===== HUD TOP ===== */}
      <div className="pointer-events-auto flex justify-between items-start p-4">
        {/* Mode / Pan / Pipette / Numbered */}
        <div className="hud-panel neon-border px-3 py-2 flex items-center gap-2">
          <button
            onClick={onTogglePan}
            className="h-7 w-7 rounded-md flex items-center justify-center text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 transition"
            aria-label="Outil main"
          >
            <Hand className="w-4 h-4" />
          </button>

          {onPickColor && (
            <button
              onClick={onPickColor}
              className="h-7 w-7 rounded-md flex items-center justify-center text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 transition"
              aria-label="Pipette"
            >
              <Pipette className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onToggleNumbered(!numberedVisible)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 transition"
            aria-label="Numéros on/off"
          >
            {numberedVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hud-panel neon-border flex items-center gap-1 px-2 py-1">
          <button
            onClick={onZoomOut}
            disabled={!canZoomOut}
            className="h-7 w-7 text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 disabled:opacity-40 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono text-teal-400 min-w-[50px] text-center">
            {zoomPercent}%
          </span>

          <button
            onClick={onZoomIn}
            disabled={!canZoomIn}
            className="h-7 w-7 text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 disabled:opacity-40 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onChangeOverlayOpacity(100)}
            className="h-7 w-7 text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-teal-500/30 mx-1" />

          <button
            onClick={() => console.log("Fullscreen")}
            className="h-7 w-7 text-teal-400 hover:text-teal-200 hover:bg-teal-500/10 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Crosshair overlay (centré) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Crosshair className="w-10 h-10 text-teal-500/15" />
      </div>

      {/* ===== HUD BOTTOM ===== */}
      <div className="pointer-events-auto p-4">
        <div className="hud-panel neon-border px-4 py-2 text-xs font-mono flex justify-between items-center text-teal-400/80">
          {/* Left */}
          <div className="flex items-center gap-4">
            <span>DIM: {dimensions}</span>
            <span className="text-teal-500/40">|</span>
            <span>COL: {colorsCount}</span>
            <span className="text-teal-500/40">|</span>
            <span>SIZE: {fileSize}</span>
          </div>

          {/* Center – Opacité */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="overlay-opacity"
              className="text-[11px] text-teal-300/80"
            >
              OPAC:
            </label>
            <input
              id="overlay-opacity"
              type="range"
              min={0}
              max={100}
              value={overlayOpacity}
              onChange={(e) => onChangeOverlayOpacity(Number(e.target.value))}
              className="h-1.5 w-24 accent-teal-400/70 cursor-pointer"
            />
            <span className="text-[11px] w-8 text-center">
              {overlayOpacity}%
            </span>
          </div>

          {/* Right – Finder + status */}
          <div className="flex items-center gap-3">
            {onFindNumber && (
              <form onSubmit={handleFindSubmit} className="flex items-center gap-1">
                <div className="relative">
                  <Hash className="h-3 w-3 text-teal-500/50 absolute left-1 top-[6px]" />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="N°"
                    value={findNumber}
                    onChange={(e) =>
                      setFindNumber(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="pl-5 pr-2 h-6 w-16 rounded-md border border-teal-500/30 bg-teal-950/30 text-xs text-teal-200 outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40"
                  />
                </div>
              </form>
            )}
            <span className="text-orange-400/80">PROC: 16.57s</span>
            <span className="text-teal-500/40">|</span>
            <span
              className={cn(
                "font-semibold",
                status === "READY"
                  ? "text-green-400"
                  : status === "BUSY"
                  ? "text-orange-400"
                  : "text-red-400"
              )}
            >
              STATUS: {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
