import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ColorAnalysis, Recommendations } from "@/lib/imageProcessing";
import type { StudioSettings } from "@/contexts/StudioContext";

export type SuggestionDifficulty = "debutant" | "intermediaire" | "expert";

export type SuggestedSettings = Pick<
  StudioSettings,
  | "numColors"
  | "minRegionSize"
  | "smoothness"
  | "mergeTolerance"
  | "enableArtisticMerge"
  | "smartPalette"
  | "paintEffect"
  | "paintIntensity"
  | "artisticEffect"
  | "artisticIntensity"
>;

export interface ParameterSuggestion {
  difficulty: SuggestionDifficulty;
  settings: SuggestedSettings;
  summary: string;
  rationale: Array<{ parameter: string; value: string; reason: string }>;
}

/**
 * Compacte le rapport d'analyse en un résumé numérique léger,
 * afin de n'envoyer au modèle que les signaux utiles (et aucun pixel).
 */
function summarizeAnalysis(analysis: ColorAnalysis) {
  return {
    uniqueColorsCount: analysis.uniqueColorsCount,
    entropy: Number(analysis.entropy?.toFixed(3) ?? 0),
    edgeDensity: Number(analysis.edgeDensity?.toFixed(4) ?? 0),
    complexityScore: Math.round(analysis.complexityScore ?? 0),
    totalPixels: analysis.totalPixels,
    mode: analysis.mode,
    sourceType: analysis.sourceType ?? "raster",
    imageType: analysis.imageType
      ? {
          type: analysis.imageType.type,
          realismScore: Number(analysis.imageType.realismScore?.toFixed(2) ?? 0),
          stylizationScore: Number(analysis.imageType.stylizationScore?.toFixed(2) ?? 0),
          confidence: Number(analysis.imageType.confidence?.toFixed(2) ?? 0),
        }
      : null,
    dominantColors: analysis.dominantColors?.slice(0, 10) ?? [],
    dominantWeights:
      analysis.dominantWeights?.slice(0, 10).map((w) => Number(w.toFixed(3))) ?? [],
  };
}

export function useAiParameterSuggestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<ParameterSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  const requestSuggestion = useCallback(
    async (
      analysis: ColorAnalysis,
      recommendations: Recommendations | null,
      difficulty: SuggestionDifficulty,
    ): Promise<ParameterSuggestion | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "suggest-parameters",
          {
            body: {
              analysis: summarizeAnalysis(analysis),
              recommendations,
              difficulty,
            },
          },
        );

        if (fnError) {
          const message =
            (fnError as { context?: { status?: number } }).context?.status === 429
              ? "Trop de requêtes IA, réessayez dans un instant."
              : (fnError as { context?: { status?: number } }).context?.status === 402
              ? "Crédits IA épuisés."
              : fnError.message || "Le service IA est indisponible.";
          setError(message);
          return null;
        }

        if (!data || (data as { error?: string }).error) {
          const message = (data as { error?: string })?.error ?? "Réponse IA invalide.";
          setError(message);
          return null;
        }

        const result = data as ParameterSuggestion;
        setSuggestion(result);
        return result;
      } catch (err) {
        console.error("useAiParameterSuggestion", err);
        setError("Impossible de contacter le service IA.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, suggestion, error, requestSuggestion, reset };
}
