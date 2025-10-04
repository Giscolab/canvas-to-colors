import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

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
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Paramètres
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="colors">Nombre de couleurs</Label>
            <span className="text-sm font-medium text-primary">{numColors}</span>
          </div>
          <Slider
            id="colors"
            min={5}
            max={40}
            step={1}
            value={[numColors]}
            onValueChange={(value) => onNumColorsChange(value[0])}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="region">Fusion zones (px)</Label>
            <span className="text-sm font-medium text-primary">{minRegionSize}</span>
          </div>
          <Slider
            id="region"
            min={10}
            max={500}
            step={10}
            value={[minRegionSize]}
            onValueChange={(value) => onMinRegionSizeChange(value[0])}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="smoothness">Douceur des bords</Label>
            <span className="text-sm font-medium text-primary">{smoothness}%</span>
          </div>
          <Slider
            id="smoothness"
            min={0}
            max={100}
            step={5}
            value={[smoothness]}
            onValueChange={(value) => onSmoothnessChange(value[0])}
            className="w-full"
          />
        </div>
      </div>

      <Button 
        onClick={onProcess} 
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-accent to-accent/80 hover:opacity-90 text-accent-foreground font-semibold"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
            Traitement...
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
