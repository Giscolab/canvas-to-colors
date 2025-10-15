import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Wand2, Sparkles, Gauge, Layers, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParametersPanelProps {
  numColors: number;
  onNumColorsChange: (value: number) => void;
  minRegionSize: number;
  onMinRegionSizeChange: (value: number) => void;
  smoothness: number;
  onSmoothnessChange: (value: number) => void;
  smartPalette: boolean;
  onSmartPaletteChange: (value: boolean) => void;
  onProcess: () => void;
  isProcessing: boolean;
}

export const ParametersPanel = ({
  numColors,
  onNumColorsChange,
  minRegionSize,
  onMinRegionSizeChange,
  smoothness,
  onSmoothnessChange,
  smartPalette,
  onSmartPaletteChange,
  onProcess,
  isProcessing,
}: ParametersPanelProps) => {
  const getQualityLabel = () => {
    if (numColors <= 15) return { label: "Simple", color: "bg-blue-500" };
    if (numColors <= 25) return { label: "Détaillé", color: "bg-purple-500" };
    return { label: "Artistique", color: "bg-pink-500" };
  };

  const quality = getQualityLabel();

  return (
    <Card className="p-4 space-y-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          Paramètres de génération
        </h3>
        <Badge className={`${quality.color} text-white text-xs px-2 py-0.5`}>
          {quality.label}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* --- Nombre de couleurs --- */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="colors" className="flex items-center gap-2 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Nombre de couleurs
            </Label>
            <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {numColors}
            </span>
          </div>
          <Slider
            id="colors"
            min={5}
            max={40}
            step={1}
            value={[numColors]}
            onValueChange={(value) => onNumColorsChange(value[0])}
            aria-label="Nombre de couleurs"
            className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>5 (Simple)</span>
            <span>40 (Complexe)</span>
          </div>
        </div>

        {/* --- Fusion zones --- */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="region" className="flex items-center gap-2 text-sm">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Fusion zones
            </Label>
            <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {minRegionSize} px
            </span>
          </div>
          <Slider
            id="region"
            min={10}
            max={500}
            step={10}
            value={[minRegionSize]}
            onValueChange={(value) => onMinRegionSizeChange(value[0])}
            aria-label="Fusion zones"
            className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>10 (Précis)</span>
            <span>500 (Simplifié)</span>
          </div>
        </div>

        {/* --- Douceur des bords --- */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="smoothness" className="flex items-center gap-2 text-sm">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              Douceur des bords
            </Label>
            <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {smoothness}%
            </span>
          </div>
          <Slider
            id="smoothness"
            min={0}
            max={100}
            step={5}
            value={[smoothness]}
            onValueChange={(value) => onSmoothnessChange(value[0])}
            aria-label="Douceur des bords"
            className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>0 (Net)</span>
            <span>100 (Doux)</span>
          </div>
        </div>

        {/* --- Palette intelligente --- */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <Label htmlFor="smart-palette" className="flex items-center gap-2 text-sm cursor-pointer">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <div className="flex flex-col">
                <span>Palette intelligente</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Équilibrage chromatique automatique
                </span>
              </div>
            </Label>
            <Switch
              id="smart-palette"
              checked={smartPalette}
              onCheckedChange={onSmartPaletteChange}
              aria-label="Activer la palette intelligente"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={onProcess}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-accent via-accent/90 to-accent/80 text-accent-foreground font-semibold shadow-md"
        size="sm"
      >
        {isProcessing ? (
          <>
            <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
            Traitement en cours...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Générer le modèle
          </>
        )}
      </Button>
    </Card>
  );
};
