import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Wand2, Sparkles, Gauge, Layers, Palette, Paintbrush, PaintBucket, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ParametersPanelProps {
  numColors: number;
  onNumColorsChange: (value: number) => void;
  minRegionSize: number;
  onMinRegionSizeChange: (value: number) => void;
  smoothness: number;
  onSmoothnessChange: (value: number) => void;
  mergeTolerance: number;
  onMergeToleranceChange: (value: number) => void;
  enableArtisticMerge: boolean;
  onEnableArtisticMergeChange: (value: boolean) => void;
  smartPalette: boolean;
  onSmartPaletteChange: (value: boolean) => void;
  paintEffect: 'none' | 'watercolor' | 'brush';
  onPaintEffectChange: (effect: 'none' | 'watercolor' | 'brush') => void;
  paintIntensity: number;
  onPaintIntensityChange: (intensity: number) => void;
  artisticEffect: 'none' | 'oil' | 'pencil';
  onArtisticEffectChange: (effect: 'none' | 'oil' | 'pencil') => void;
  artisticIntensity: number;
  onArtisticIntensityChange: (intensity: number) => void;
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
  mergeTolerance,
  onMergeToleranceChange,
  enableArtisticMerge,
  onEnableArtisticMergeChange,
  smartPalette,
  onSmartPaletteChange,
  paintEffect,
  onPaintEffectChange,
  paintIntensity,
  onPaintIntensityChange,
  artisticEffect,
  onArtisticEffectChange,
  artisticIntensity,
  onArtisticIntensityChange,
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

        {/* --- Fusion artistique --- */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Fusion artistique
            </Label>
            <Switch
              checked={enableArtisticMerge}
              onCheckedChange={onEnableArtisticMergeChange}
              aria-label="Activer la fusion artistique"
            />
          </div>

          {enableArtisticMerge && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="h-3 w-3 text-primary/70" />
                  Tolérance ΔE
                </Label>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {mergeTolerance}
                </span>
              </div>
              <Slider
                min={1}
                max={30}
                step={1}
                value={[mergeTolerance]}
                onValueChange={(value) => onMergeToleranceChange(value[0])}
                aria-label="Tolérance ΔE"
                className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
              />
            </div>
          )}
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

        {/* --- Effet peinture --- */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="flex items-center gap-2 text-sm">
            <Paintbrush className="h-3.5 w-3.5 text-primary" />
            Effet peinture
          </Label>
          
          <Select value={paintEffect} onValueChange={onPaintEffectChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              <SelectItem value="watercolor">Aquarelle</SelectItem>
              <SelectItem value="brush">Pinceau</SelectItem>
            </SelectContent>
          </Select>
          
          {paintEffect !== 'none' && (
            <div className="space-y-2 pl-6">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">
                  Intensité
                </Label>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {paintIntensity}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[paintIntensity]}
                onValueChange={(v) => onPaintIntensityChange(v[0])}
                className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
              />
            </div>
          )}
        </div>

        {/* --- Effets artistiques (AI) --- */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="flex items-center gap-2 text-sm">
            <PaintBucket className="h-3.5 w-3.5 text-primary" />
            Effets artistiques (AI)
          </Label>
          
          <Select value={artisticEffect} onValueChange={onArtisticEffectChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              <SelectItem value="oil">
                <span className="flex items-center gap-2">
                  <PaintBucket className="h-3.5 w-3.5" />
                  Huile
                </span>
              </SelectItem>
              <SelectItem value="pencil">
                <span className="flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5" />
                  Crayon
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {artisticEffect !== 'none' && (
            <div className="space-y-2 pl-6">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">
                  Intensité
                </Label>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {artisticIntensity}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[artisticIntensity]}
                onValueChange={(v) => onArtisticIntensityChange(v[0])}
                className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
              />
            </div>
          )}
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
