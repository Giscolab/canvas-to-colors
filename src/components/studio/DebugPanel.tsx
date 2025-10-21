import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProcessedResult } from "@/lib/imageProcessing";
import { Bug, Layers, Palette, Grid3x3, Activity } from "lucide-react";

/** utils sûrs (aucune dépendance externe) */
function fmtMs(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  // lisible : <1000ms en ms ; sinon s.ms
  if (v < 1000) return `${Math.round(v)}ms`;
  const s = v / 1000;
  return `${s.toFixed(s >= 10 ? 0 : 1)}s`;
}
function percentile(arr: number[], p: number): number | undefined {
  if (!arr?.length) return undefined;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))));
  return a[idx];
}

interface DebugPanelProps {
  processedData: ProcessedResult | null;
}

export function DebugPanel({ processedData }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (!processedData) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="w-4 h-4" />
            Mode Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Traitez une image pour voir les informations de debug.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { zones, palette, metadata, progressLog, artisticMergeStats } = processedData;

  // Métriques défensives : supporte metadata sans profilage détaillé
  const stageDurations = (metadata as any)?.stageDurationsMs as number[] | undefined;
  const memoryMB =
    (metadata as any)?.memoryUsageMB ??
    ((metadata as any)?.memoryUsageBytes ? Math.round(((metadata as any).memoryUsageBytes / (1024 * 1024)) * 10) / 10 : undefined);

  const p50 = useMemo(() => percentile(stageDurations ?? [], 50), [stageDurations]);
  const p95 = useMemo(() => percentile(stageDurations ?? [], 95), [stageDurations]);

  return (
    <Card className="bg-card/60 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bug className="w-4 h-4" />
          Mode Debug
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Synthèse
            </TabsTrigger>
            <TabsTrigger value="zones" className="text-xs">
              <Grid3x3 className="w-3 h-3 mr-1" />
              Zones
            </TabsTrigger>
            <TabsTrigger value="colors" className="text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Couleurs
            </TabsTrigger>
          </TabsList>

          {/* === OVERVIEW === */}
          <TabsContent value="overview" className="space-y-3 text-xs">
            {/* Cartes KPI */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border bg-card p-3">
                <div className="text-muted-foreground">Temps total</div>
                <div className="font-mono text-sm">{fmtMs(metadata?.totalProcessingTimeMs)}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-muted-foreground">Mémoire</div>
                <div className="font-mono text-sm">
                  {memoryMB != null ? `${memoryMB} MB` : "—"}
                </div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-muted-foreground">P50 (étapes)</div>
                <div className="font-mono text-sm">{fmtMs(p50)}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-muted-foreground">P95 (étapes)</div>
                <div className="font-mono text-sm">{fmtMs(p95)}</div>
              </div>
            </div>

            {/* Stats structurelles */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-muted-foreground">Dimensions</div>
                <div className="font-mono">
                  {metadata?.width} × {metadata?.height}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Étapes profilées</div>
                <div className="font-mono">{stageDurations?.length ?? 0}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Zones</div>
                <div className="font-mono">{zones.length}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Couleurs</div>
                <div className="font-mono">{palette.length}</div>
              </div>
            </div>

            {/* Bloc Fusion artistique (si dispo) */}
            {artisticMergeStats && (
              <div className="space-y-2 border border-dashed border-border/60 rounded-md p-3 bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Layers className="w-3 h-3" />
                  Fusion artistique
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Kpi label="Avant" value={artisticMergeStats.beforeCount} />
                  <Kpi label="Après" value={artisticMergeStats.afterCount} />
                  <Kpi label="Fusions" value={artisticMergeStats.mergedCount} />
                  <Kpi label="ΔE moyen" value={artisticMergeStats.averageDeltaE?.toFixed(1) ?? "—"} />
                  <Kpi label="Temps" value={fmtMs(artisticMergeStats.timeMs)} />
                  <Kpi label="Tolérance" value={`ΔE ≤ ${artisticMergeStats.mergeTolerance}`} />
                </div>
              </div>
            )}

            {/* Timeline pipeline (repliable) */}
            {progressLog && progressLog.length > 0 && (
              <details
                className="group border border-border/60 rounded-md"
                open={timelineOpen}
                onToggle={(e) => setTimelineOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/40">
                  <div className="text-muted-foreground">Pipeline (dernier·es étapes)</div>
                  <span className="text-[10px] text-muted-foreground">
                    {progressLog.length} entrées
                  </span>
                </summary>
                <div className="px-3 py-2 space-y-1.5">
                  {progressLog.slice(-20).map((log, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {Math.round(log.progress)}%
                      </Badge>
                      <span className="text-muted-foreground truncate">{log.stage}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </TabsContent>

          {/* === ZONES === */}
          <TabsContent value="zones" className="space-y-2 text-xs max-h-[300px] overflow-auto">
            {zones.slice(0, 20).map((zone) => (
              <div key={zone.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    #{zone.id}
                  </Badge>
                  <div
                    className="w-3 h-3 rounded border border-border"
                    style={{ backgroundColor: palette[zone.colorIdx] }}
                  />
                </div>
                <div className="text-muted-foreground font-mono">{zone.area}px²</div>
              </div>
            ))}
            {zones.length > 20 && (
              <div className="text-center text-muted-foreground">
                +{zones.length - 20} zones supplémentaires
              </div>
            )}
          </TabsContent>

          {/* === COULEURS === */}
          <TabsContent value="colors" className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              {palette.map((color, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <div
                    className="w-6 h-6 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-muted-foreground">#{idx + 1}</div>
                    <div className="font-mono text-[10px] truncate">{color}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/** Petit composant KPI pour éviter dupliquer du markup */
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
