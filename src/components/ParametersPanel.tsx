import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Wand2, Sparkles, Gauge, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParametersPanelProps {
  numColors: number;
  onNumColorsChange: (value: number) => void;
  minRegionSize: number;
  onMinRegionSizeChange: (value: number) => void;
  smoothness: number;
  onSmoothnessChange: (value: number) => void;
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
    <Card className="p-6 space-y-6 glass hover-lift">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          Paramètres de génération
        </h3>
        <Badge className={`${quality.color} text-white`}>
          {quality.label}
        </Badge>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="colors" className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Nombre de couleurs
            </Label>
            <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
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
            className="w-full [&_.relative]:h-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-4 [&_[role=slider]]:shadow-lg hover:[&_[role=slider]]:scale-110 transition-transform"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 (Simple)</span>
            <span>40 (Complexe)</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="region" className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              Fusion zones
            </Label>
            <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
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
            className="w-full [&_.relative]:h-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-4 [&_[role=slider]]:shadow-lg hover:[&_[role=slider]]:scale-110 transition-transform"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10 (Précis)</span>
            <span>500 (Simplifié)</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="smoothness" className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" />
              Douceur des bords
            </Label>
            <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
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
            className="w-full [&_.relative]:h-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-4 [&_[role=slider]]:shadow-lg hover:[&_[role=slider]]:scale-110 transition-transform"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 (Net)</span>
            <span>100 (Doux)</span>
          </div>
        </div>
      </div>

      <Button 
        onClick={onProcess} 
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-accent via-accent/90 to-accent/80 hover:opacity-90 text-accent-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 animate-glow-pulse"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
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
