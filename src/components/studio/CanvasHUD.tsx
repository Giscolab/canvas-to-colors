import React, { useCallback, useState } from "react";
import { ZoomIn, ZoomOut, Hand, Pipette, Hash, Eye, EyeOff } from "lucide-react";
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
}

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
        "pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-3 z-40",
        className
      )}
      aria-label="Contrôles du canvas"
    >
      {/* --- Barre principale --- */}
      <div
        className="
          pointer-events-auto
          bg-studio-panel/95 backdrop-blur-md border border-studio-border/60
          shadow-studio-panel-right rounded-md px-2 py-1.5
          flex items-center gap-1 studio-transition
        "
      >
        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="
            h-8 w-8 inline-flex items-center justify-center rounded-md border border-studio-border/60
            hover:bg-studio-hover disabled:opacity-50 studio-transition focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40
          "
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4 text-studio-foreground" />
        </button>

        <div className="px-2 tabular-nums text-sm text-studio-foreground">{zoomPercent}%</div>

        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="
            h-8 w-8 inline-flex items-center justify-center rounded-md border border-studio-border/60
            hover:bg-studio-hover disabled:opacity-50 studio-transition focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40
          "
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4 text-studio-foreground" />
        </button>

        <div className="w-px h-6 bg-studio-border/50 mx-1.5" />

        {/* Main tool */}
        <button
          type="button"
          onClick={onTogglePan}
          className="
            h-8 px-2 inline-flex items-center gap-1 rounded-md border border-studio-border/60
            hover:bg-studio-hover studio-transition focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40
          "
          aria-label="Activer l’outil Main"
        >
          <Hand className="h-4 w-4 text-studio-foreground" />
          <span className="hidden sm:inline text-xs text-studio-foreground/80">Main</span>
        </button>

        {onPickColor && (
          <button
            type="button"
            onClick={onPickColor}
            className="
              h-8 px-2 inline-flex items-center gap-1 rounded-md border border-studio-border/60
              hover:bg-studio-hover studio-transition focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40
            "
            aria-label="Pipette (prélever une couleur)"
          >
            <Pipette className="h-4 w-4 text-studio-foreground" />
            <span className="hidden sm:inline text-xs text-studio-foreground/80">Pipette</span>
          </button>
        )}
      </div>

      {/* --- Volet secondaire --- */}
      <div
        className="
          pointer-events-auto
          bg-studio-panel/95 backdrop-blur-md border border-studio-border/60
          shadow-studio-panel-right rounded-md px-3 py-2
          flex items-center gap-3 studio-transition
        "
      >
        {/* Numéros on/off */}
        <button
          type="button"
          onClick={() => onToggleNumbered(!numberedVisible)}
          className="
            h-8 px-2 inline-flex items-center gap-1 rounded-md border border-studio-border/60
            hover:bg-studio-hover studio-transition focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40
          "
          aria-pressed={numberedVisible}
          aria-label={numberedVisible ? "Masquer les numéros" : "Afficher les numéros"}
        >
          {numberedVisible ? (
            <EyeOff className="h-4 w-4 text-studio-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-studio-foreground" />
          )}
          <span className="hidden sm:inline text-xs text-studio-foreground/80">
            {numberedVisible ? "Numéros off" : "Numéros on"}
          </span>
        </button>

        {/* Opacité */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="overlay-opacity"
            className="text-xs text-studio-foreground/70"
          >
            Opacité
          </label>
          <input
            id="overlay-opacity"
            type="range"
            min={0}
            max={100}
            value={overlayOpacity}
            onChange={(e) => onChangeOverlayOpacity(Number(e.target.value))}
            className="h-2 w-32 accent-studio-accent-blue/70 cursor-pointer"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overlayOpacity}
          />
          <span className="text-xs tabular-nums w-8 text-center text-studio-foreground/70">
            {overlayOpacity}%
          </span>
        </div>

        {/* Trouver numéro */}
        {onFindNumber && (
          <form onSubmit={handleFindSubmit} className="flex items-center gap-1">
            <div className="relative">
              <Hash className="h-3.5 w-3.5 text-studio-foreground/50 absolute left-2 top-[7px]" />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="N°"
                value={findNumber}
                onChange={(e) =>
                  setFindNumber(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="
                  pl-6 pr-2 h-8 w-20 rounded-md border border-studio-border/60 bg-studio-panel/60
                  text-sm text-studio-foreground focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40 outline-none
                "
                aria-label="Aller à la zone numéro…"
              />
            </div>
            <button
              type="submit"
              className="
                h-8 px-2 rounded-md border border-studio-border/60 hover:bg-studio-hover
                focus-visible:ring-1 focus-visible:ring-studio-accent-blue/40 text-xs text-studio-foreground studio-transition
              "
            >
              Trouver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
