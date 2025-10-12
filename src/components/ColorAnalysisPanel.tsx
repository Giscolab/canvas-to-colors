import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ColorAnalysis } from "@/lib/imageProcessing";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface ColorAnalysisPanelProps {
  analysis: ColorAnalysis | null;
  isAnalyzing: boolean;
}

export function ColorAnalysisPanel({ analysis, isAnalyzing }: ColorAnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Analyse en cours...</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={50} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">Analyse des couleurs en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const getComplexityLabel = (score: number) => {
    if (score < 30) return { label: "Simple", color: "bg-green-500 text-white" };
    if (score < 60) return { label: "Moyenne", color: "bg-yellow-500 text-white" };
    return { label: "Complexe", color: "bg-red-500 text-white" };
  };

  const complexity = getComplexityLabel(analysis.complexityScore);

  // Convertir les couleurs dominantes en données pour le graphe
  const colorData = analysis.dominantColors.map((hex, i) => ({
    color: hex,
    name: `#${i + 1}`,
    value: (analysis.dominantWeights?.[i] ?? 1) * 100 || 10,
  }));

  return (
    <Card className="shadow-lg border-border/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Analyse de l'image
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* === Couleurs uniques === */}
        <div>
          <Label className="text-sm text-muted-foreground">Couleurs uniques détectées</Label>
          <p className="text-2xl font-bold text-foreground">{analysis.uniqueColorsCount}</p>
        </div>

        {/* === Complexité visuelle === */}
        <div>
          <Label className="text-sm text-muted-foreground">Complexité visuelle</Label>
          <div className="flex items-center justify-between mt-1">
            <Badge className={complexity.color}>{complexity.label}</Badge>
            <span className="text-sm text-muted-foreground">{analysis.complexityScore}/100</span>
          </div>
          <Progress
            value={analysis.complexityScore}
            className="h-2 mt-2 bg-muted"
          />
        </div>

        {/* === Recommandations === */}
        <div>
          <Label className="text-sm text-muted-foreground">Recommandations</Label>
          <ul className="text-sm mt-2 space-y-1 text-foreground">
            <li>🎨 Nombre de couleurs recommandé : <strong>{analysis.recommendedNumColors}</strong></li>
            <li>🧩 Taille min. de région : <strong>{analysis.recommendedMinRegionSize}px</strong></li>
            {analysis.quantStep && (
              <li>🧠 Pas de quantification : <strong>{analysis.quantStep}</strong></li>
            )}
          </ul>
        </div>

        {/* === Couleurs dominantes === */}
        <div>
          <Label className="text-sm text-muted-foreground">Couleurs dominantes</Label>
          <div className="flex gap-1 flex-wrap mt-2">
            {analysis.dominantColors.map(hex => (
              <div
                key={hex}
                className="w-8 h-8 rounded border border-border shadow-sm"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* === Histogramme des couleurs === */}
        {colorData.length > 1 && (
          <div className="mt-4">
            <Label className="text-sm text-muted-foreground mb-1 block">Distribution des couleurs</Label>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={colorData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number, _: string, d: any) => [
                      `${v.toFixed(1)}%`,
                      d.payload.color,
                    ]}
                    contentStyle={{ fontSize: "0.75rem" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {colorData.map((entry, index) => (
                      <rect
                        key={index}
                        x={index * 40}
                        y={100 - entry.value}
                        width="20"
                        height={entry.value}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
