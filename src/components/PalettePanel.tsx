import React from "react";
import { Zone } from "@/hooks/useCanvasInteractions";
import { cn } from "@/lib/utils"; // optionnel, pour fusion de classes tailwind

interface PalettePanelProps {
  zonesByColor: Map<number, Zone[]>;
  selectedColorIdx: number | null;
  onColorSelect: (colorIdx: number) => void;
}

export const PalettePanel: React.FC<PalettePanelProps> = ({
  zonesByColor,
  selectedColorIdx,
  onColorSelect,
}) => {
  // On crée un tableau de couleurs uniques à partir des zones
  const palette = Array.from(zonesByColor.entries()).map(([colorIdx, zones]) => {
    const color = zones[0]?.hex || "#ccc";
    const percent = zones.reduce((a, z) => a + (z.percent ?? 0), 0);
    return { colorIdx, color, percent: Math.round(percent * 100) / 100 };
  });

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-background/60 rounded-xl shadow-inner border border-border backdrop-blur-md">
      {palette.map(({ colorIdx, color, percent }) => (
        <button
          key={colorIdx}
          onClick={() => onColorSelect(colorIdx)}
          className={cn(
            "relative w-10 h-10 rounded-md border transition-all",
            "hover:scale-110 active:scale-95",
            selectedColorIdx === colorIdx
              ? "ring-2 ring-yellow-400 border-yellow-400"
              : "border-muted"
          )}
          style={{
            backgroundColor: color,
          }}
          title={`Couleur #${colorIdx} (${percent}%)`}
        >
          {/* petit label discret */}
          <span className="absolute bottom-0.5 right-0.5 text-[10px] text-white/80 font-medium bg-black/30 px-1 rounded">
            {colorIdx}
          </span>
        </button>
      ))}
    </div>
  );
};
