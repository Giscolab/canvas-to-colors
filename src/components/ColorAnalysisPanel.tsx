import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ColorAnalysis } from "@/lib/imageProcessing";

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
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis) return null;
  
  const getComplexityLabel = (score: number) => {
    if (score < 30) return { label: "Simple", color: "bg-success text-success-foreground" };
    if (score < 60) return { label: "Moyenne", color: "bg-warning text-warning-foreground" };
    return { label: "Complexe", color: "bg-destructive text-destructive-foreground" };
  };
  
  const complexity = getComplexityLabel(analysis.complexityScore);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📊 Analyse de l'image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground">Couleurs uniques détectées</Label>
          <p className="text-2xl font-bold text-foreground">{analysis.uniqueColorsCount}</p>
        </div>
        
        <div>
          <Label className="text-sm text-muted-foreground">Complexité</Label>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={complexity.color}>{complexity.label}</Badge>
            <span className="text-sm text-muted-foreground">
              {analysis.complexityScore}/100
            </span>
          </div>
        </div>
        
        <div>
          <Label className="text-sm text-muted-foreground">Recommandations</Label>
          <div className="text-sm space-y-1 mt-1 text-foreground">
            <p>• Nombre de couleurs : <strong>{analysis.recommendedNumColors}</strong></p>
            <p>• Taille min. région : <strong>{analysis.recommendedMinRegionSize}px</strong></p>
          </div>
        </div>
        
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
      </CardContent>
    </Card>
  );
}
