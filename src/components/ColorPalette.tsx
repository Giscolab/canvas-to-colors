import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette as PaletteIcon, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface ColorPaletteProps {
  colors: string[];
}

/** Choisit un texte lisible (blanc/noir) sur la couleur de fond */
function readableTextOn(bgHex: string): "white" | "black" {
  const hex = bgHex.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex;
  const val = parseInt(full || "cccccc", 16);
  const r = (val >> 16) & 255, g = (val >> 8) & 255, b = val & 255;
  const toL = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
  return L > 0.5 ? "black" : "white";
}

export const ColorPalette = ({ colors }: ColorPaletteProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (colors.length === 0) return null;

  const handleCopyColor = useCallback(async (color: string, index: number) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedIndex(index);
      toast.success(`Couleur ${index + 1} copiée !`, { description: color, duration: 1600 });
      setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      // Fallback très basique
      setCopiedIndex(index);
      toast.success(`Couleur ${index + 1} copiée (fallback)`, { description: color, duration: 1600 });
      setTimeout(() => setCopiedIndex(null), 1600);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, color: string, index: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCopyColor(color, index);
      }
    },
    [handleCopyColor]
  );

  return (
    <Card className="p-4 md:p-6 bg-card/60 backdrop-blur-sm border">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <PaletteIcon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold text-sm md:text-lg">Palette extraite</h3>
        <Badge variant="secondary" className="ml-auto">
          {colors.length} couleurs
        </Badge>
      </div>

      <div
        role="listbox"
        aria-label="Palette de couleurs"
        className="grid gap-3 sm:gap-4 grid-cols-6 sm:grid-cols-8 lg:grid-cols-10"
      >
        {colors.map((color, index) => {
          const textOn = readableTextOn(color);
          const isCopied = copiedIndex === index;

          return (
            <div key={index} className="flex flex-col gap-1.5 sm:gap-2">
              <button
                type="button"
                role="option"
                aria-label={`Couleur ${index + 1}, ${color}`}
                onClick={() => handleCopyColor(color, index)}
                onKeyDown={(e) => handleKeyDown(e, color, index)}
                title={`${color} — cliquer pour copier`}
                className={[
                  "relative aspect-square w-full min-w-10 min-h-10 rounded-md border",
                  "transition-transform hover:scale-105 active:scale-95",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "shadow-sm hover:shadow",
                ].join(" ")}
                style={{ backgroundColor: color }}
              >
                {/* Overlay d’action (icône copy/check) */}
                <div className="absolute inset-0 grid place-items-center bg-black/0 hover:bg-black/30 transition-colors">
                  {isCopied ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <Copy className="h-5 w-5 text-white opacity-90" />
                  )}
                </div>

                {/* Numéro en bas-droit */}
                <span
                  className={[
                    "absolute bottom-0.5 right-0.5 px-1 rounded text-[10px] font-semibold",
                    textOn === "white"
                      ? "text-white/90 bg-black/35"
                      : "text-black/85 bg-white/60",
                  ].join(" ")}
                >
                  {index + 1}
                </span>

                {/* Anneau interne pour teintes très claires (lisibilité) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-black/[0.06]"
                />
              </button>

              {/* Hex + actions passives */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {color}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
