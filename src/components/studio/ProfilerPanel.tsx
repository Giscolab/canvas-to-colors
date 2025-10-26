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
      toast.error("Échec de l'export");
    }
  };

  // Calcul de la moyenne pour la barre de statut
  const averageDuration = useMemo(() => {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, h) => sum + h.totalDuration, 0);
    return total / history.length;
  }, [history]);

  return (
    <div className="space-y-4 p-4">
      {/* Header / Controls */}
      <Card className="studio-panel">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base text-studio-foreground">
                <Activity className="w-5 h-5 text-studio-accent-blue" />
                Performance Profiler
              </CardTitle>
              <CardDescription className="truncate text-studio-foreground/70">
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
                <Label htmlFor="profiler-enabled" className="text-sm cursor-pointer text-studio-foreground/80">
                  {enabled ? "Activé" : "Désactivé"}
                </Label>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCurrent}
                disabled={!currentProfile}
                className="studio-export-button focus-ring gap-2"
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
                  className="studio-action-button focus-ring gap-2"
                  aria-label="Effacer l'historique des profils"
                  title="Effacer l'historique"
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
        <Card className="studio-panel">
          <CardContent className="py-10 text-center text-studio-foreground/50">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="text-studio-foreground">Le profileur est désactivé.</p>
            <p className="text-sm mt-1 text-studio-foreground/70">Activez-le pour mesurer les performances.</p>
          </CardContent>
        </Card>
      )}

      {enabled && !currentProfile && (
        <Card className="studio-panel">
          <CardContent className="py-10 text-center text-studio-foreground/50">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="text-studio-foreground">En attente de traitement…</p>
            <p className="text-sm mt-1 text-studio-foreground/70">Lancez un traitement pour voir les métriques.</p>
          </CardContent>
        </Card>
      )}

      {/* Overview */}
      {enabled && currentProfile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="studio-panel">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-studio-foreground/70">
                  <Clock className="w-4 h-4" />
                  Temps total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-studio-foreground">{formatDuration(overview.total)}</div>
                {currentProfile.cacheHit && (
                  <Badge variant="secondary" className="mt-2 studio-status-badge studio-status-badge--success">
                    Cache hit
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="studio-panel">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-studio-foreground/70">
                  <Database className="w-4 h-4" />
                  Cache hit ratio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-studio-foreground">{Math.round(cacheHitRatio)}%</div>
                <Progress value={cacheHitRatio} className="mt-2" aria-label="Cache hit ratio" />
              </CardContent>
            </Card>

            <Card className="studio-panel">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-studio-foreground/70">
                  <TrendingUp className="w-4 h-4" />
                  Étapes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-studio-foreground">{overview.stagesCount}</div>
                <div className="text-xs text-studio-foreground/70 mt-1">mesurées</div>
              </CardContent>
            </Card>

            <Card className="studio-panel">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-studio-foreground/70">
                  <HardDrive className="w-4 h-4" />
                  Mémoire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-studio-foreground">{formatBytes(overview.mem)}</div>
                <div className="text-xs text-studio-foreground/70 mt-1">footprint</div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline des étapes */}
          <Card className="studio-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-studio-foreground">Timeline des étapes</CardTitle>
              <CardDescription className="text-studio-foreground/70">Durée relative et absolue par étape</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px] pr-1">
                <ul role="list" className="space-y-3">
                  {currentProfile.stages.map((s, i) => {
                    const pct = stagePct(s.duration, overview.total);
                    return (
                      <li key={`${s.stage}-${i}`} role="listitem" className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate text-studio-foreground">{s.stage}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-studio-foreground/70 tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="font-mono font-semibold min-w-[72px] text-right text-studio-foreground">
                              {formatDuration(s.duration)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-studio-panel-header/40 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full rounded-full transition-all"
                            // Couleur lisible: vert→jaune→orange→rouge selon % relatif
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background:
                                pct < 20
                                  ? "hsl(var(--success))"
                                  : pct < 40
                                  ? "hsl(var(--warning))"
                                  : pct < 60
                                  ? "hsl(45 93% 47%)"
                                  : pct < 80
                                  ? "hsl(31 97% 45%)"
                                  : "hsl(var(--destructive))",
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
            <Card className="studio-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-studio-foreground">Historique ({history.length} sessions)</CardTitle>
                <CardDescription className="text-studio-foreground/70">Comparaison des dernières exécutions</CardDescription>
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
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-studio-border/40 bg-studio-panel/60 studio-fade-in"
                          title={new Date(p.timestamp).toLocaleString("fr-FR")}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Clock className="w-4 h-4 text-studio-foreground/60" aria-hidden="true" />
                            <span className="text-sm truncate text-studio-foreground">
                              {new Date(p.timestamp).toLocaleTimeString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {p.cacheHit && <Badge variant="secondary" className="studio-status-badge studio-status-badge--primary">Cache</Badge>}
                            <span className="font-mono text-sm font-semibold text-studio-foreground">
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

          {/* Barre de statut (bonus) */}
          <div className="mt-4 px-4 py-2 border-t border-studio-border/40 text-xs text-studio-foreground/70 flex justify-between bg-studio-status-bar/80 backdrop-blur-sm rounded-md">
            <span>{history.length} sessions enregistrées</span>
            {history.length > 1 && (
              <span>
                Moyenne&nbsp;
                {formatDuration(averageDuration)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}