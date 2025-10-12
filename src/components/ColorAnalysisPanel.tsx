import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ColorAnalysis } from "@/lib/imageProcessing";
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { TooltipProps } from "recharts";

interface ColorAnalysisPanelProps {
  analysis: ColorAnalysis | null;
  isAnalyzing: boolean;
}

export function ColorAnalysisPanel({ analysis, isAnalyzing }: ColorAnalysisPanelProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => setIsDark(event.matches);
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  if (isAnalyzing) {
    return (
      <Card className="shadow-lg border-border/40 animate-pulse">
        <CardHeader>
          <CardTitle className="text-lg">🔍 Analyse en cours...</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={50} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Détection des couleurs et évaluation de la complexité...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const getComplexityLabel = (score: number) => {
    if (score < 30) return { label: "Simple", color: "bg-green-500 text-white" };
    if (score < 60) return { label: "Moyenne", color: "bg-yellow-500 text-black" };
    return { label: "Complexe", color: "bg-red-500 text-white" };
  };

  const complexity = getComplexityLabel(analysis.complexityScore);

  const chartData =
    analysis.dominantColors.map((color, index) => ({
      name: `#${index + 1}`,
      value: Math.round((analysis.dominantWeights[index] ?? 0) * 100),
      color,
    })) ?? [];

  const dominantCount = analysis.dominantColors.length;
  const summaryMessage = `Image ${complexity.label.toLowerCase()} avec ${dominantCount} couleur${
    dominantCount > 1 ? "s" : ""
  } dominantes, idéal pour ${analysis.recommendedNumColors} zone${
    analysis.recommendedNumColors > 1 ? "s" : ""
  }.`;

  type TooltipValueType = number;
  type TooltipNameType = string;

  const tooltipFormatter: TooltipProps<TooltipValueType, TooltipNameType>["formatter"] = (
    value,
    _,
    item,
  ) => {
    const color = (item?.payload as (typeof chartData)[number] | undefined)?.color ?? "";
    const numericValue = typeof value === "number" ? value : Number(value ?? 0);
    return [`${numericValue.toFixed(1)}%`, color];
  };

  return (
    <Card
      className={`transition-colors duration-300 ${
        isDark
          ? "bg-neutral-900 text-neutral-100 border-neutral-800"
          : "bg-white text-neutral-900 border-neutral-200"
      }`}
    >
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Analyse de l'image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm text-muted-foreground">Couleurs uniques détectées</Label>
          <p className="text-2xl font-bold text-foreground">{analysis.uniqueColorsCount}</p>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Complexité visuelle</Label>
          <div className="flex justify-between items-center mt-1">
            <Badge className={complexity.color}>{complexity.label}</Badge>
            <span className="text-sm text-muted-foreground">{analysis.complexityScore}/100</span>
          </div>
          <Progress
            value={analysis.complexityScore}
            className={`h-2 mt-2 ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`}
          />
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Recommandations</Label>
          <ul className="text-sm space-y-1 mt-2">
            <li>
              🎨 Nombre de couleurs : <strong>{analysis.recommendedNumColors}</strong>
            </li>
            <li>
              🧩 Taille min. région : <strong>{analysis.recommendedMinRegionSize}px</strong>
            </li>
            <li>
              🧠 Niveau de quantification : <strong>{analysis.quantStep}</strong>
            </li>
          </ul>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Couleurs dominantes</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {analysis.dominantColors.map(hex => (
              <div
                key={hex}
                className={`w-8 h-8 rounded-md border ${
                  isDark ? "border-neutral-700" : "border-neutral-300"
                } shadow-sm`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>

        {chartData.length > 1 && (
          <div className="mt-4">
            <Label className="text-sm text-muted-foreground">Répartition des couleurs (%)</Label>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={tooltipFormatter}
                    contentStyle={{
                      backgroundColor: isDark ? "#222" : "#fff",
                      border: `1px solid ${isDark ? "#444" : "#ccc"}`,
                      color: isDark ? "#fff" : "#000",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map(entry => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={entry.color}
                        stroke={isDark ? "#222" : "#f5f5f5"}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border/60 text-sm text-muted-foreground">
          {summaryMessage}
        </div>
      </CardContent>
    </Card>
  );
}
