import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, Loader2, Check, AlertTriangle } from "lucide-react";
import { ColorAnalysis, Recommendations } from "@/lib/imageProcessing";
import {
  SuggestedSettings,
  SuggestionDifficulty,
  useAiParameterSuggestion,
} from "@/hooks/useAiParameterSuggestion";

interface AiSuggestionsCardProps {
  analysis: ColorAnalysis | null;
  recommendations: Recommendations | null;
  onApply: (settings: SuggestedSettings) => void;
}

const DIFFICULTY_LABELS: Record<SuggestionDifficulty, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  expert: "Expert",
};

const PAINT_EFFECT_LABELS: Record<string, string> = {
  none: "Aucun",
  watercolor: "Aquarelle",
  brush: "Pinceau",
  oil: "Huile",
  pencil: "Crayon",
};

/**
 * Carte "paramètres suggérés par l'IA" : envoie le rapport d'analyse chiffré
 * au modèle et propose un jeu complet de réglages applicable en un clic.
 */
export const AiSuggestionsCard = ({
  analysis,
  recommendations,
  onApply,
}: AiSuggestionsCardProps) => {
  const [difficulty, setDifficulty] = useState<SuggestionDifficulty>("intermediaire");
  const [applied, setApplied] = useState(false);
  const { isLoading, suggestion, error, requestSuggestion } = useAiParameterSuggestion();

  const handleSuggest = async () => {
    if (!analysis) return;
    setApplied(false);
    await requestSuggestion(analysis, recommendations, difficulty);
  };

  const handleApply = () => {
    if (!suggestion) return;
    onApply(suggestion.settings);
    setApplied(true);
  };

  return (
    <Card className="p-1.5 space-y-1.5 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-primary/10">
            <Brain className="h-3.5 w-3.5 text-primary" />
          </div>
          Paramètres suggérés par l'IA
        </h3>
        {suggestion && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            {DIFFICULTY_LABELS[suggestion.difficulty]}
          </Badge>
        )}
      </div>

      {!analysis ? (
        <p className="text-[10px] text-muted-foreground">
          Lancez d'abord l'analyse de l'image pour obtenir des suggestions.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="ai-difficulty" className="text-[10px] text-muted-foreground">
              Niveau visé
            </Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as SuggestionDifficulty)}
            >
              <SelectTrigger id="ai-difficulty" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debutant">Débutant — grandes zones</SelectItem>
                <SelectItem value="intermediaire">Intermédiaire — équilibré</SelectItem>
                <SelectItem value="expert">Expert — très détaillé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleSuggest}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyse IA en cours…
              </>
            ) : (
              <>
                <Brain className="h-3.5 w-3.5" />
                {suggestion ? "Régénérer la suggestion" : "Suggérer des paramètres"}
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-1.5 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3 mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {suggestion && (
            <div className="space-y-1.5 pt-1.5 border-t border-border/40">
              {suggestion.summary && (
                <p className="text-[10px] text-muted-foreground">{suggestion.summary}</p>
              )}

              <dl className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex justify-between gap-1 rounded bg-muted/50 px-1.5 py-1">
                  <dt className="text-muted-foreground">Couleurs</dt>
                  <dd className="font-semibold">{suggestion.settings.numColors}</dd>
                </div>
                <div className="flex justify-between gap-1 rounded bg-muted/50 px-1.5 py-1">
                  <dt className="text-muted-foreground">Zones min.</dt>
                  <dd className="font-semibold">{suggestion.settings.minRegionSize}px</dd>
                </div>
                <div className="flex justify-between gap-1 rounded bg-muted/50 px-1.5 py-1">
                  <dt className="text-muted-foreground">Douceur</dt>
                  <dd className="font-semibold">{suggestion.settings.smoothness}%</dd>
                </div>
                <div className="flex justify-between gap-1 rounded bg-muted/50 px-1.5 py-1">
                  <dt className="text-muted-foreground">ΔE</dt>
                  <dd className="font-semibold">{suggestion.settings.mergeTolerance}</dd>
                </div>
                <div className="flex justify-between gap-1 rounded bg-muted/50 px-1.5 py-1">
                  <dt className="text-muted-foreground">Effet</dt>
                  <dd className="font-semibold">
                    {PAINT_EFFECT_LABELS[suggestion.settings.paintEffect]}
                  </dd>
                </div>
                <div className="flex justify-between gap-1 rounded bg-muted/50 px-1.5 py-1">
                  <dt className="text-muted-foreground">Artistique</dt>
                  <dd className="font-semibold">
                    {PAINT_EFFECT_LABELS[suggestion.settings.artisticEffect]}
                  </dd>
                </div>
              </dl>

              {suggestion.rationale.length > 0 && (
                <ul className="space-y-0.5">
                  {suggestion.rationale.map((item, index) => (
                    <li key={`${item.parameter}-${index}`} className="text-[9px] leading-snug">
                      <span className="font-semibold text-primary">{item.parameter}</span>
                      {item.value ? (
                        <span className="text-muted-foreground"> ({item.value})</span>
                      ) : null}
                      <span className="text-muted-foreground"> — {item.reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                type="button"
                size="sm"
                variant={applied ? "secondary" : "outline"}
                className="w-full h-8 text-xs"
                onClick={handleApply}
              >
                {applied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Paramètres appliqués
                  </>
                ) : (
                  "Appliquer ces paramètres"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
