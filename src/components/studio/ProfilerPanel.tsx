/**
 * Performance Profiler Panel
 * Visualizes pipeline execution metrics and performance statistics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, Database, HardDrive, Trash2, TrendingUp } from 'lucide-react';
import { ProfileData } from '@/hooks/useProfiler';

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
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const getStageColor = (duration: number): string => {
    if (duration < 100) return 'bg-green-500';
    if (duration < 500) return 'bg-yellow-500';
    if (duration < 1000) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const calculateStagePercentage = (duration: number, total: number): number => {
    return total > 0 ? (duration / total) * 100 : 0;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Performance Profiler
              </CardTitle>
              <CardDescription>
                Mesure et analyse des performances du pipeline
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="profiler-enabled"
                  checked={enabled}
                  onCheckedChange={onToggleEnabled}
                />
                <Label htmlFor="profiler-enabled" className="text-sm cursor-pointer">
                  {enabled ? 'Activé' : 'Désactivé'}
                </Label>
              </div>
              {history.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearHistory}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!enabled && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Le profileur est désactivé.</p>
              <p className="text-sm mt-1">Activez-le pour mesurer les performances.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {enabled && !currentProfile && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>En attente de traitement...</p>
              <p className="text-sm mt-1">Lancez un traitement pour voir les métriques.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Profile Stats */}
      {enabled && currentProfile && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Temps Total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(currentProfile.totalDuration)}
                </div>
                {currentProfile.cacheHit && (
                  <Badge variant="secondary" className="mt-2">
                    Cache Hit
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Cache Hit Ratio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cacheHitRatio.toFixed(0)}%
                </div>
                <Progress value={cacheHitRatio} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Étapes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentProfile.stages.length}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  mesurées
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Mémoire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentProfile.memoryFootprint
                    ? formatBytes(currentProfile.memoryFootprint)
                    : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  footprint
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stage Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline des Étapes</CardTitle>
              <CardDescription>
                Durée d'exécution de chaque étape du pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {currentProfile.stages.map((stage, index) => {
                    const percentage = calculateStagePercentage(
                      stage.duration,
                      currentProfile.totalDuration
                    );
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stage.stage}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                            <span className="font-mono font-bold min-w-[80px] text-right">
                              {formatDuration(stage.duration)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full transition-all ${getStageColor(
                              stage.duration
                            )}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* History Summary */}
          {history.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique ({history.length} sessions)</CardTitle>
                <CardDescription>
                  Comparaison des dernières exécutions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {history.slice().reverse().map((profile, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(profile.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {profile.cacheHit && (
                            <Badge variant="secondary" className="text-xs">
                              Cache
                            </Badge>
                          )}
                          <span className="font-mono text-sm font-bold">
                            {formatDuration(profile.totalDuration)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
