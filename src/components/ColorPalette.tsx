import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ColorPaletteProps {
  colors: string[];
}

export const ColorPalette = ({ colors }: ColorPaletteProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (colors.length === 0) {
    return null;
  }

  const handleCopyColor = (color: string, index: number) => {
    navigator.clipboard.writeText(color);
    setCopiedIndex(index);
    toast.success(`Couleur ${index + 1} copiée !`, {
      description: color,
      duration: 2000,
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="p-6 glass hover-lift">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Palette extraite</h3>
        <Badge variant="secondary" className="ml-auto animate-pulse">
          {colors.length} couleurs
        </Badge>
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        {colors.map((color, index) => (
          <div key={index} className="flex flex-col gap-2 group">
            <div
              className="aspect-square rounded-xl border-2 border-border shadow-md transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:border-primary cursor-pointer relative overflow-hidden"
              style={{ backgroundColor: color }}
              title={color}
              onClick={() => handleCopyColor(color, index)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                {copiedIndex === index ? (
                  <Check className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Copy className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-foreground bg-primary/10 px-2 py-1 rounded-full">
                {index + 1}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {color}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
