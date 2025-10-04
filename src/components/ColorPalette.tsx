import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";

interface ColorPaletteProps {
  colors: string[];
}

export const ColorPalette = ({ colors }: ColorPaletteProps) => {
  if (colors.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Palette extraite</h3>
        <Badge variant="secondary" className="ml-auto">
          {colors.length} couleurs
        </Badge>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {colors.map((color, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div
              className="aspect-square rounded-lg border-2 border-border shadow-sm transition-transform hover:scale-105 cursor-pointer"
              style={{ backgroundColor: color }}
              title={color}
            />
            <span className="text-xs text-center text-muted-foreground font-mono">
              {index + 1}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
