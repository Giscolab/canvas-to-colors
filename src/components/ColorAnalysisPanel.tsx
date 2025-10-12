import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ColorAnalysis } from "@/lib/imageProcessing";
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, Cell } from "recharts";

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
    if (score < 60) return { label: "Moyenne", color: "bg-yellow-500 text-white" };
    return { label: "Complexe", color: "bg-red-500 text-white" };
  };

  const complexity = getComplexityLabel(analysis.complexityScore);

  const chartData = analysis.dominantColors.map((color, i) => ({
    name: `#${i + 1}`,
    value: Math.round((analysis.dominantWeights[i] ?? 0) * 100),
    color,
  }));

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">📊 Analyse de l'image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-sm text-muted-foreground">Couleurs uniques détectées</Label>
          <p className="text-2xl font-bold">{analysis.uniqueColorsCount}</p>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Complexité visuelle</Label>
          <div className="flex justify-between items-center mt-1">
            <Badge className={complexity.color}>{complexity.label}</Badge>
            <span className="text-sm text-muted-foreground">{analysis.complexityScore}/100</span>
          </div>
          <Progress value={analysis.complexityScore} className="h-2 mt-2" />
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
              🧠 Niveau de quantification : <strong>{analysis.quantStep ?? "—"}</strong>
            </li>
          </ul>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Couleurs dominantes</Label>
          <div className="flex flex-wrap gap-2 mt-2">
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

        {chartData.length > 1 && (
          <div className="mt-4">
            <Label className="text-sm text-muted-foreground">Répartition des couleurs (%)</Label>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number, _: string, d: any) => [`${v.toFixed(1)}%`, d.payload.color]}
                    contentStyle={{ fontSize: "0.75rem" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
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
