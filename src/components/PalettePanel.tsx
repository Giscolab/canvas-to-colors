import React, { useMemo, useCallback, useRef } from "react";
import { Zone } from "@/hooks/useCanvasInteractions";
import { cn } from "@/lib/utils";

interface PalettePanelProps {
  zonesByColor: Map<number, Zone[]>;
  selectedColorIdx: number | null;
  onColorSelect: (colorIdx: number) => void;
}

/** Contraste auto: choisit white/black selon la couleur de fond */
function readableTextOn(bgHex: string): "white" | "black" {
  // hex -> r,g,b
  const hex = bgHex.replace("#", "");
  const bigint = parseInt(hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  // luminance relative (sRGB)
  const srgb = [r, g, b].map(v => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return L > 0.5 ? "black" : "white";
}

export const PalettePanel: React.FC<PalettePanelProps> = ({
  zonesByColor,
  selectedColorIdx,
  onColorSelect,
}) => {
  // Palette calculée + triée par % descendant
  const palette = useMemo(() => {
    const arr = Array.from(zonesByColor.entries()).map(([colorIdx, zones]) => {
      const color = zones[0]?.hex || "#cccccc";
      const percent = zones.reduce((a, z) => a + (z.percent ?? 0), 0);
      return { colorIdx, color, percent: Math.round(percent * 100) / 100 };
    });
    // Tri: plus utilisées d'abord
    arr.sort((a, b) => b.percent - a.percent || a.colorIdx - b.colorIdx);
    return arr;
  }, [zonesByColor]);

  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (!palette.length) return;
      let next = idx;
      if (e.key === "ArrowRight") next = (idx + 1) % palette.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + palette.length) % palette.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = palette.length - 1;
      else return;

      e.preventDefault();
      const targetColorIdx = palette[next].colorIdx;
      onColorSelect(targetColorIdx);

      // focus virtuel sur le bouton suivant
      const container = listRef.current;
      if (container) {
        const btns = container.querySelectorAll<HTMLButtonElement>("button[data-palette-item='1']");
        btns[next]?.focus();
      }
    },
    [palette, onColorSelect]
  );

  return (
    <section aria-labelledby="palette-title" className="rounded-xl border bg-card/60 backdrop-blur-sm">
      <header className="flex items-center justify-between px-3 py-2 border-b">
        <h4 id="palette-title" className="text-sm font-medium">
          Palette par importance
        </h4>
        <span className="text-xs text-muted-foreground tabular-nums">
          {palette.length} couleurs
        </span>
      </header>

      <div
        ref={listRef}
        role="listbox"
        aria-label="Palette de couleurs"
        className={cn(
          "p-3 grid gap-2",
          // Grille responsive confortable (≥44px)
          "grid-cols-6 sm:grid-cols-8 lg:grid-cols-10"
        )}
      >
        {palette.map(({ colorIdx, color, percent }, idx) => {
          const textOn = readableTextOn(color);
          const isSelected = selectedColorIdx === colorIdx;

          return (
            <button
              key={colorIdx}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`Couleur ${colorIdx}, ${percent}%`}
              data-palette-item="1"
              onClick={() => onColorSelect(colorIdx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              tabIndex={isSelected || (selectedColorIdx == null && idx === 0) ? 0 : -1}
              className={cn(
                "relative aspect-square w-full min-w-10 min-h-10 rounded-md border transition-transform",
                "hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "ring-2 ring-ring border-ring"
                  : "border-border hover:border-foreground/20"
              )}
              style={{ backgroundColor: color }}
              title={`Couleur #${colorIdx} – ${percent}%`}
            >
              {/* Numéro superposé (coin bas-droit) */}
              <span
                className={cn(
                  "absolute bottom-0.5 right-0.5 px-1 rounded text-[10px] font-semibold",
                  textOn === "white"
                    ? "text-white/90 bg-black/35"
                    : "text-black/80 bg-white/55"
                )}
              >
                {colorIdx}
              </span>

              {/* Pourcentage (coin haut-gauche), discret */}
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 px-1 rounded text-[10px] font-medium tabular-nums",
                  textOn === "white"
                    ? "text-white/80 bg-black/25"
                    : "text-black/70 bg-white/50"
                )}
              >
                {percent}%
              </span>

              {/* Anneau de lisibilité pour teintes très claires : bord interne */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-black/[0.06]"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};
