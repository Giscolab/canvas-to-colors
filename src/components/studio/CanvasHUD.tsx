import React, { useCallback, useState } from "react";
import { ZoomIn, ZoomOut, Hand, Pipette, Hash, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CanvasHUDProps {
  // état zoom actuel et bornes
  zoomPercent: number;              // ex: 100
  canZoomIn?: boolean;              // ex: zoom < 800
  canZoomOut?: boolean;             // ex: zoom > 10

  // handlers fournis par ton canvas
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTogglePan: () => void;          // main/hand tool
  onPickColor?: () => void;         // pipette (optionnel)

  // overlay numéros/contours
  numberedVisible: boolean;         // afficher les numéros ?
  onToggleNumbered: (visible: boolean) => void;

  overlayOpacity: number;           // 0..100
  onChangeOverlayOpacity: (val: number) => void;

  // “Trouver le numéro N”
  onFindNumber?: (n: number) => void;

  // classes utilitaires (facultatif)
  className?: string;
}

/**
 * HUD flottant pour le canvas :
 * - barre centrale (zoom, main, pipette)
 * - volet secondaire (numéroté on/off, opacité, trouver N°)
 * - visuel only ; toutes les actions viennent de props
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
}: CanvasHUDProps) {
  const [findNumber, setFindNumber] = useState<number | "">("");

  const handleFindSubmit = useCallback(
   (e: React.FormEvent) => {
      e.preventDefault();
      const n = typeof findNumber === "number" ? findNumber : Number.NaN;
      if (onFindNumber && Number.isFinite(n)) {
        onFindNumber(n);
      }
    },
    [findNumber, onFindNumber]
  );

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-3",
        className
      )}
      aria-label="Contrôles du canvas"
    >
      {/* Barre principale */}
      <div
        className="
          pointer-events-auto
          bg-card/95 backdrop-blur border shadow-sm rounded-lg
          px-2 py-1.5 flex items-center gap-1
        "
      >
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="
            h-8 w-8 inline-flex items-center justify-center rounded-md border
            hover:bg-accent/60 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <div className="px-2 tabular-nums text-sm text-foreground">{zoomPercent}%</div>

        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="
            h-8 w-8 inline-flex items-center justify-center rounded-md border
            hover:bg-accent/60 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1.5" />

        <button
          type="button"
          onClick={onTogglePan}
          className="
            h-8 px-2 inline-flex items-center gap-1 rounded-md border
            hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
          aria-label="Activer l’outil Main (déplacement)"
        >
          <Hand className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Main</span>
        </button>

        {onPickColor && (
          <button
            type="button"
            onClick={onPickColor}
            className="
              h-8 px-2 inline-flex items-center gap-1 rounded-md border
              hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
            "
            aria-label="Pipette (prélever une couleur)"
          >
            <Pipette className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Pipette</span>
          </button>
        )}
      </div>

      {/* Volet secondaire */}
      <div
        className="
          pointer-events-auto
          bg-card/95 backdrop-blur border shadow-sm rounded-lg
          px-3 py-2 flex items-center gap-3
        "
      >
        <button
          type="button"
          onClick={() => onToggleNumbered(!numberedVisible)}
          className="
            h-8 px-2 inline-flex items-center gap-1 rounded-md border
            hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
          aria-pressed={numberedVisible}
          aria-label={numberedVisible ? "Masquer les numéros" : "Afficher les numéros"}
        >
          {numberedVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline text-xs">
            {numberedVisible ? "Numéros off" : "Numéros on"}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="overlay-opacity" className="text-xs text-muted-foreground">
            Opacité
          </label>
          <input
            id="overlay-opacity"
            type="range"
            min={0}
            max={100}
            value={overlayOpacity}
            onChange={(e) => onChangeOverlayOpacity(Number(e.target.value))}
            className="h-2 w-32 accent-foreground/70"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overlayOpacity}
          />
          <span className="text-xs tabular-nums w-8 text-center">{overlayOpacity}%</span>
        </div>

        {onFindNumber && (
          <form onSubmit={handleFindSubmit} className="flex items-center gap-1">
            <div className="relative">
              <Hash className="h-3.5 w-3.5 text-muted-foreground absolute left-2 top-[7px]" />
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
                  pl-6 pr-2 h-8 w-20 rounded-md border bg-background
                  text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                "
                aria-label="Aller à la zone numéro…"
              />
            </div>
            <button
              type="submit"
              className="
                h-8 px-2 rounded-md border hover:bg-accent/60
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs
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
