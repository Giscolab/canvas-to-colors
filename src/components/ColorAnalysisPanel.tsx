import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ColorAnalysis, ProcessedResult } from "@/lib/imageProcessing";
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { TooltipProps } from "recharts";

interface ColorAnalysisPanelProps {
  analysis: ColorAnalysis | null;
  isAnalyzing: boolean;
  processedResult?: ProcessedResult | null;
  hasImage: boolean;
  onAnalyze: () => void;
}

const COMPLEXITY_THRESHOLDS = { simple: 30, medium: 60 } as const;

/** Swatch lisible (bord + accessible) */
function Swatch({ hex, title }: { hex: string; title?: string }) {
  return (
    <div
      role="img"
      aria-label={`Couleur ${hex}`}
      className="w-6 h-6 rounded border border-border shadow-sm"
      style={{ backgroundColor: hex }}
      title={title ?? hex}
    />
  );
}

export function ColorAnalysisPanel({
  analysis,
  isAnalyzing,
  processedResult,
  hasImage,
  onAnalyze,
}: ColorAnalysisPanelProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    setIsDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const hasDominants =
    !!analysis && Array.isArray(analysis.dominantColors) && analysis.dominantColors.length > 0;

  const chartData = useMemo(() => {
    if (!hasDominants || !analysis) return [];
    const n = analysis.dominantColors.length;
    const weights = analysis.dominantWeights ?? [];
    const fallback = 1 / Math.max(1, n);

    return analysis.dominantColors.map((color, i) => ({
      name: `#${i + 1}`,
      value: Math.round(((weights[i] ?? fallback) * 100 + Number.EPSILON) * 10) / 10,
      color,
    }));
  }, [analysis, hasDominants]);

  const complexityInfo = (score = 0) => {
    if (score < COMPLEXITY_THRESHOLDS.simple)
      return { label: "Simple", badge: "bg-green-500 text-white" };
    if (score < COMPLEXITY_THRESHOLDS.medium)
      return { label: "Moyenne", badge: "bg-yellow-500 text-black" };
    return { label: "Complexe", badge: "bg-red-500 text-white" };
  };

  type TooltipValueType = number;
  type TooltipNameType = string;
  const tooltipFormatter: TooltipProps<TooltipValueType, TooltipNameType>["formatter"] = (value, _n, item) => {
    const numeric = typeof value === "number" ? value : Number(value ?? 0);
    const col = (item?.payload as (typeof chartData)[number] | undefined)?.color ?? "";
    return [`${numeric.toFixed(1)}%`, col];
  };

  // --- SKELETON pendant analyse ---
  if (isAnalyzing) {
    return (
      <Card className="border bg-card/60 backdrop-blur animate-pulse">
        <CardHeader className="p-2 pb-0">
          <CardTitle className="text-sm">🔍 Analyse en cours…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          <div className="h-1.5 w-1/2 bg-muted rounded" />
          <Progress value={50} className="h-1.5" />
          <div className="grid grid-cols-2 gap-1">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border bg-card/60 backdrop-blur">
        <CardHeader className="p-2 pb-0">
          <CardTitle className="text-sm flex items-center gap-1.5">📊 Analyse de l'image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-2 text-xs text-muted-foreground">
          <p>
            L'analyse brute n'est pas déclenchée automatiquement. Cliquez pour analyser le fichier
            original (sans resize ni compression).
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onAnalyze}
            disabled={!hasImage}
          >
            Lancer l'analyse brute
          </Button>
        </CardContent>
      </Card>
    );
  }

  const uniqueColors = analysis.uniqueColorsCount ?? 0;
  const recommendedNum = analysis.recommendedNumColors ?? 0;
  const recommendedMinRegion = analysis.recommendedMinRegionSize ?? 0;
  const complexityScore = Math.max(0, Math.min(100, analysis.complexityScore ?? 0));
  const modeLabel = analysis.mode === "vector" ? "Vectorielle" : "Photographique";
  const cx = complexityInfo(complexityScore);

  const dominantCount = analysis.dominantColors?.length ?? 0;
  const summaryMessage = `Image ${cx.label.toLowerCase()} ${
    analysis.mode === "vector" ? "(formes nettes) " : ""
  }avec ${dominantCount} couleur${dominantCount > 1 ? "s" : ""} dominantes — cible: ${recommendedNum} couleur${
    recommendedNum > 1 ? "s" : ""
  }, min-région: ${recommendedMinRegion}px. Recommandations non appliquées automatiquement.`;

  const hasOptimizedPalette = Boolean(
    processedResult?.palette?.length && processedResult?.metadata?.averageDeltaE != null
  );

  return (
    <Card className="border bg-card/60 backdrop-blur">
      <CardHeader className="p-2 pb-0">
        <CardTitle className="text-sm flex items-center gap-1.5">📊 Analyse de l'image</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 p-2">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-1">
          <div className="rounded border bg-card p-1.5">
            <div className="text-muted-foreground text-[10px] leading-tight">Couleurs uniques</div>
            <div className="font-mono text-base tabular-nums">{uniqueColors}</div>
          </div>
          <div className="rounded border bg-card p-1.5">
            <div className="text-muted-foreground text-[10px] leading-tight">
              Reco couleurs (info)
            </div>
            <div className="font-mono text-base tabular-nums">{recommendedNum}</div>
          </div>
          <div className="rounded border bg-card p-1.5">
            <div className="text-muted-foreground text-[10px] leading-tight">
              Reco min-region (info)
            </div>
            <div className="font-mono text-base tabular-nums">{recommendedMinRegion}px</div>
          </div>
          <div className="rounded border bg-card p-1.5">
            <div className="text-muted-foreground text-[10px] leading-tight">Mode</div>
            <div className="font-mono text-xs truncate">{modeLabel}</div>
          </div>
        </div>

        {/* Complexité */}
        <div>
          <Label className="text-[11px] text-muted-foreground">Complexité visuelle</Label>
          <div className="flex justify-between items-center mt-0.5">
            <Badge className={`${cx.badge} text-[10px] px-1.5 py-0`}>{cx.label}</Badge>
            <span className="text-[10px] text-muted-foreground">{complexityScore}/100</span>
          </div>
          <Progress
            value={complexityScore}
            className="h-1.5 mt-1"
            style={
              {
                // couleur dynamique de la barre (fallback tokens)
                "--progress-bar-color":
                  complexityScore < COMPLEXITY_THRESHOLDS.simple
                    ? (isDark ? "#16a34a" : "#22c55e") // green
                    : complexityScore < COMPLEXITY_THRESHOLDS.medium
                    ? (isDark ? "#ca8a04" : "#eab308") // yellow
                    : (isDark ? "#dc2626" : "#ef4444"), // red
              } as CSSProperties
            }
          />
        </div>

        {/* Couleurs dominantes */}
        <div>
          <Label className="text-[11px] text-muted-foreground">Couleurs dominantes</Label>
          {hasDominants ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.dominantColors!.map((hex, i) => (
                <Swatch key={hex + i} hex={hex} />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-1">Aucune dominante détectée.</p>
          )}
        </div>

        {/* Palette optimisée (si résultat dispo) */}
        {hasOptimizedPalette && (
          <div className="pt-2 border-t border-border/40">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              ✨ Palette optimisée
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                ΔE&nbsp;: {processedResult!.metadata!.averageDeltaE!.toFixed(2)}
              </Badge>
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {processedResult!.palette.slice(0, 12).map((hex, idx) => (
                <Swatch key={`opt-${idx}`} hex={hex} title={`${hex} (optimisé)`} />
              ))}
            </div>
          </div>
        )}

        {/* Histogramme (optionnel) */}
        {chartData.length > 1 && (
          <div className="mt-1">
            <Label className="text-[11px] text-muted-foreground">Répartition des couleurs (%)</Label>
            <div className="h-24 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={tooltipFormatter}
                    contentStyle={{
                      backgroundColor: isDark ? "hsl(0 0% 12%)" : "hsl(0 0% 100%)",
                      border: `1px solid ${isDark ? "hsl(0 0% 24%)" : "hsl(0 0% 90%)"}`,
                      color: isDark ? "hsl(0 0% 98%)" : "hsl(0 0% 10%)",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={entry.color}
                        stroke="hsl(var(--border))"
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Résumé lisible */}
        <div className="pt-1.5 border-t border-border/60 text-[10px] leading-snug text-muted-foreground">
          {summaryMessage}
        </div>
      </CardContent>
    </Card>
  );
}
