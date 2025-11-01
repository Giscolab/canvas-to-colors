import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Wand2,
  Sparkles,
  Gauge,
  Layers,
  Palette as PaletteIcon,
  Paintbrush,
  PaintBucket,
  Pencil,
  Activity,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  paintEffect: "none" | "watercolor" | "brush";
  onPaintEffectChange: (effect: "none" | "watercolor" | "brush") => void;
  paintIntensity: number;
  onPaintIntensityChange: (intensity: number) => void;
  artisticEffect: "none" | "oil" | "pencil";
  onArtisticEffectChange: (effect: "none" | "oil" | "pencil") => void;
  artisticIntensity: number;
  onArtisticIntensityChange: (intensity: number) => void;
  profilingEnabled: boolean;
  onProfilingEnabledChange: (enabled: boolean) => void;
  onProcess: () => void;
  isProcessing: boolean;
}

/* --- helpers UI locaux, zéro dépendance --- */
function Section({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
  summaryHelp,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  summaryHelp?: string;
}) {
  return (
    <details
      className="group border border-border/50 rounded-lg bg-card/60 open:bg-card transition-colors"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-2 py-1.5 rounded-lg hover:bg-accent/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">{icon}</div>
          <span className="text-sm font-medium">{title}</span>
          {summaryHelp ? (
            <span className="hidden md:inline text-[10px] text-muted-foreground truncate">
              {summaryHelp}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <span
            aria-hidden="true"
            className="i-chevron transition-transform group-open:rotate-180 text-muted-foreground"
          />
        </div>
      </summary>
      <div className="px-2 pb-2 pt-1">{children}</div>
    </details>
  );
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
  profilingEnabled,
  onProfilingEnabledChange,
  onProcess,
  isProcessing,
}: ParametersPanelProps) => {
  const quality =
    numColors <= 15
      ? { label: "Simple", className: "bg-blue-500" }
      : numColors <= 25
      ? { label: "Détaillé", className: "bg-purple-500" }
      : { label: "Artistique", className: "bg-pink-500" };

  return (
    <Card className="p-2 space-y-2 rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Header panel */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          Paramètres de génération
        </h3>
        <Badge className={`${quality.className} text-white text-[10px] px-2 py-0.5`}>
          {quality.label}
        </Badge>
      </div>

      {/* SECTION: Qualité & fusion de base */}
      <Section
        title="Qualité & fusion"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        summaryHelp="Nombre de couleurs et simplification des petites zones"
        defaultOpen
        badge={
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {numColors} col.
          </span>
        }
      >
        <fieldset className="space-y-3" aria-labelledby="colors-legend">
          <legend id="colors-legend" className="sr-only">
            Nombre de couleurs
          </legend>

          {/* Nombre de couleurs */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="colors" className="flex items-center gap-2 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Nombre de couleurs
              </Label>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {numColors}
              </span>
            </div>
            <Slider
              id="colors"
              min={5}
              max={40}
              step={1}
              value={[numColors]}
              onValueChange={(v) => onNumColorsChange(v[0])}
              aria-label="Nombre de couleurs"
              className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5 (Simple)</span>
              <span>40 (Complexe)</span>
            </div>
          </div>

          {/* Fusion zones (min region) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="region" className="flex items-center gap-2 text-sm">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Fusion des petites zones
              </Label>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {minRegionSize} px
              </span>
            </div>
            <Slider
              id="region"
              min={10}
              max={500}
              step={10}
              value={[minRegionSize]}
              onValueChange={(v) => onMinRegionSizeChange(v[0])}
              aria-label="Fusion zones"
              className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>10 (Précis)</span>
              <span>500 (Simplifié)</span>
            </div>
          </div>

          {/* Douceur des bords */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="smoothness" className="flex items-center gap-2 text-sm">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                Douceur des bords
              </Label>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {smoothness}%
              </span>
            </div>
            <Slider
              id="smoothness"
              min={0}
              max={100}
              step={5}
              value={[smoothness]}
              onValueChange={(v) => onSmoothnessChange(v[0])}
              aria-label="Douceur des bords"
              className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 (Net)</span>
              <span>100 (Doux)</span>
            </div>
          </div>
        </fieldset>
      </Section>

      {/* SECTION: Fusion artistique */}
      <Section
        title="Fusion artistique"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        summaryHelp="Ajuste la tolérance ΔE quand activée"
        defaultOpen={false}
        badge={
          <span className="text-xs text-muted-foreground">
            {enableArtisticMerge ? "Activée" : "Désactivée"}
          </span>
        }
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm" htmlFor="art-merge">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Activer la fusion artistique
            </Label>
            <Switch
              id="art-merge"
              checked={enableArtisticMerge}
              onCheckedChange={onEnableArtisticMergeChange}
              aria-label="Activer la fusion artistique"
            />
          </div>

          {enableArtisticMerge && (
            <div className="space-y-1.5 pl-6">
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
                onValueChange={(v) => onMergeToleranceChange(v[0])}
                aria-label="Tolérance ΔE"
                className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
              />
            </div>
          )}
        </div>
      </Section>

      {/* SECTION: Palette & effets peinture */}
      <Section
        title="Palette & Effets"
        icon={<PaletteIcon className="h-3.5 w-3.5" />}
        summaryHelp="Palette intelligente et rendu peinture"
        defaultOpen={false}
      >
        {/* Palette intelligente */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="smart-palette"
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <PaletteIcon className="h-3.5 w-3.5 text-primary" />
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

        {/* Effet peinture */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="flex items-center gap-2 text-sm" htmlFor="paint-effect">
            <Paintbrush className="h-3.5 w-3.5 text-primary" />
            Effet peinture
          </Label>

          <Select value={paintEffect} onValueChange={onPaintEffectChange}>
            <SelectTrigger id="paint-effect" className="h-9">
              <SelectValue placeholder="Sélectionner…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              <SelectItem value="watercolor">Aquarelle</SelectItem>
              <SelectItem value="brush">Pinceau</SelectItem>
            </SelectContent>
          </Select>

          {paintEffect !== "none" && (
            <div className="space-y-1.5 pl-6">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">Intensité</Label>
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
                aria-label="Intensité de l’effet peinture"
                className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
              />
            </div>
          )}
        </div>
      </Section>

      {/* SECTION: Effets artistiques (AI) */}
      <Section
        title="Effets artistiques (AI)"
        icon={<PaintBucket className="h-3.5 w-3.5" />}
        summaryHelp="Filtres style huile/crayon et intensité"
        defaultOpen={false}
      >
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm" htmlFor="ai-effect">
            <PaintBucket className="h-3.5 w-3.5 text-primary" />
            Choix de l’effet
          </Label>

          <Select value={artisticEffect} onValueChange={onArtisticEffectChange}>
            <SelectTrigger id="ai-effect" className="h-9">
              <SelectValue placeholder="Sélectionner…" />
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

          {artisticEffect !== "none" && (
            <div className="space-y-1.5 pl-6">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">Intensité</Label>
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
                aria-label="Intensité de l’effet artistique"
                className="w-full [&_.relative]:h-1.5 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-sm"
              />
            </div>
          )}
        </div>
      </Section>

      {/* SECTION: Performance / Profileur */}
      <Section
        title="Performance"
        icon={<Activity className="h-3.5 w-3.5" />}
        summaryHelp="Active la mesure des étapes du pipeline"
        defaultOpen={false}
        badge={
          <span className="text-xs text-muted-foreground">
            {profilingEnabled ? "Profilage actif" : "Profilage inactif"}
          </span>
        }
      >
        <div className="flex items-center justify-between">
          <Label
            htmlFor="profiling"
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Activity className="h-3.5 w-3.5 text-primary" />
            <div className="flex flex-col">
              <span>Activer le profileur</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Mesure les performances du pipeline
              </span>
            </div>
          </Label>
          <Switch
            id="profiling"
            checked={profilingEnabled}
            onCheckedChange={onProfilingEnabledChange}
            aria-label="Activer le profileur de performance"
          />
        </div>
      </Section>

      {/* CTA Générer (parité fonctionnelle) */}
      <Button
        onClick={onProcess}
        disabled={isProcessing}
        className="w-full h-9 rounded-md bg-primary text-primary-foreground shadow hover:opacity-90 disabled:opacity-60"
        size="sm"
        aria-live="polite"
        aria-busy={isProcessing}
      >
        {isProcessing ? (
          <>
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/80 border-t-transparent" />
            Traitement en cours…
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
