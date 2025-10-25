/**
 * Performance Profiler Panel (Figma-like)
 * - Props inchangées
 * - A11y : roles, aria, focus visible
 * - Tokens only (dark OK)
 * - Actions : activer, effacer historique, exporter le profil courant (JSON)
 * - Skeleton/fallbacks
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Clock, Database, HardDrive, Trash2, TrendingUp, Download } from "lucide-react";
import { ProfileData } from "@/hooks/useProfiler";
import { useMemo } from "react";
import { toast } from "sonner";

interface ProfilerPanelProps {
  enabled: boolean;
  currentProfile: ProfileData | null;
  history: ProfileData[];
  cacheHitRatio: number;
  onToggleEnabled: (enabled: boolean) => void;
  onClearHistory: () => void;
}

export function ProfilerPanel({
  enabled,
  currentProfile,
  history,
  cacheHitRatio,
  onToggleEnabled,
  onClearHistory,
}: ProfilerPanelProps) {
  const formatDuration = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes?: number | null): string => {
    if (!bytes || bytes <= 0) return "N/A";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const stagePct = (d: number, total: number) => (total > 0 ? (d / total) * 100 : 0);

  const overview = useMemo(() => {
    if (!currentProfile) {
      return { stagesCount: 0, total: 0, mem: undefined as number | undefined };
    }
    return {
      stagesCount: currentProfile.stages.length,
      total: currentProfile.totalDuration,
      mem: currentProfile.memoryFootprint ?? undefined,
    };
  }, [currentProfile]);

  const handleExportCurrent = () => {
    if (!currentProfile) {
      toast.error("Aucun profil à exporter");
      return;
    }
    try {
      const name = `pbn-profile-${new Date(currentProfile.timestamp).toISOString()}.json`;
      const payload = JSON.stringify(currentProfile, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name.replace(/[:]/g, "-");
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Profil exporté");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l’export");
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header / Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" />
                Performance Profiler
              </CardTitle>
              <CardDescription className="truncate">
                Mesure et analyse des performances du pipeline
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="profiler-enabled"
                  checked={enabled}
                  onCheckedChange={onToggleEnabled}
                  aria-label="Activer le profileur"
                />
                <Label htmlFor="profiler-enabled" className="text-sm cursor-pointer">
                  {enabled ? "Activé" : "Désactivé"}
                </Label>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCurrent}
                disabled={!currentProfile}
                className="gap-2"
                aria-label="Exporter le profil courant"
                title="Exporter le profil courant"
              >
                <Download className="w-4 h-4" />
                Exporter
              </Button>

              {history.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearHistory}
                  className="gap-2"
                  aria-label="Effacer l’historique des profils"
                  title="Effacer l’historique"
                >
                  <Trash2 className="w-4 h-4" />
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Empty states */}
      {!enabled && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>Le profileur est désactivé.</p>
            <p className="text-sm mt-1">Activez-le pour mesurer les performances.</p>
          </CardContent>
        </Card>
      )}

      {enabled && !currentProfile && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>En attente de traitement…</p>
            <p className="text-sm mt-1">Lancez un traitement pour voir les métriques.</p>
          </CardContent>
        </Card>
      )}

      {/* Overview */}
      {enabled && currentProfile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Temps total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(overview.total)}</div>
                {currentProfile.cacheHit && (
                  <Badge variant="secondary" className="mt-2">
                    Cache hit
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Cache hit ratio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(cacheHitRatio)}%</div>
                <Progress value={cacheHitRatio} className="mt-2" aria-label="Cache hit ratio" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Étapes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.stagesCount}</div>
                <div className="text-xs text-muted-foreground mt-1">mesurées</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Mémoire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(overview.mem)}</div>
                <div className="text-xs text-muted-foreground mt-1">footprint</div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline des étapes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline des étapes</CardTitle>
              <CardDescription>Durée relative et absolue par étape</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px] pr-1">
                <ul role="list" className="space-y-3">
                  {currentProfile.stages.map((s, i) => {
                    const pct = stagePct(s.duration, overview.total);
                    return (
                      <li key={`${s.stage}-${i}`} role="listitem" className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{s.stage}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="font-mono font-semibold min-w-[72px] text-right">
                              {formatDuration(s.duration)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full rounded-full transition-all"
                            // Couleur lisible: vert→jaune→orange→rouge selon % relatif
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background:
                                pct < 20
                                  ? "hsl(142 70% 45%)"
                                  : pct < 40
                                  ? "hsl(88 75% 45%)"
                                  : pct < 60
                                  ? "hsl(45 93% 47%)"
                                  : pct < 80
                                  ? "hsl(31 97% 45%)"
                                  : "hsl(0 84% 60%)",
                            }}
                            aria-hidden="true"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Historique des sessions */}
          {history.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Historique ({history.length} sessions)</CardTitle>
                <CardDescription>Comparaison des dernières exécutions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-1">
                  <ul role="list" className="space-y-2">
                    {history
                      .slice()
                      .reverse()
                      .map((p, idx) => (
                        <li
                          key={`${p.timestamp}-${idx}`}
                          role="listitem"
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card"
                          title={new Date(p.timestamp).toLocaleString("fr-FR")}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            <span className="text-sm truncate">
                              {new Date(p.timestamp).toLocaleTimeString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {p.cacheHit && <Badge variant="secondary">Cache</Badge>}
                            <span className="font-mono text-sm font-semibold">
                              {formatDuration(p.totalDuration)}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
