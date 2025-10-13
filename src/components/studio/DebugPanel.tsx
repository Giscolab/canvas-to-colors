import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProcessedResult } from "@/lib/imageProcessing";
import { Bug, Layers, Palette, Grid3x3 } from "lucide-react";

interface DebugPanelProps {
  processedData: ProcessedResult | null;
}

export function DebugPanel({ processedData }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!processedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="w-4 h-4" />
            Mode Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Traitez une image pour voir les informations de debug
          </p>
        </CardContent>
      </Card>
    );
  }

  const { zones, palette, metadata, progressLog } = processedData;

  return (
    <Card>
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
              <Layers className="w-3 h-3 mr-1" />
              Vue
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

          <TabsContent value="overview" className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-muted-foreground">Dimensions</div>
                <div className="font-mono">{metadata?.width} × {metadata?.height}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Temps total</div>
                <div className="font-mono">{metadata?.totalProcessingTimeMs}ms</div>
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

            {progressLog && progressLog.length > 0 && (
              <div className="space-y-1">
                <div className="text-muted-foreground">Pipeline</div>
                <div className="space-y-0.5">
                  {progressLog.slice(-5).map((log, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {log.progress}%
                      </Badge>
                      <span className="text-muted-foreground truncate">{log.stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

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
                <div className="text-muted-foreground font-mono">
                  {zone.area}px²
                </div>
              </div>
            ))}
            {zones.length > 20 && (
              <div className="text-center text-muted-foreground">
                +{zones.length - 20} zones supplémentaires
              </div>
            )}
          </TabsContent>

          <TabsContent value="colors" className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              {palette.map((color, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <div 
                    className="w-6 h-6 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-muted-foreground">
                      #{idx + 1}
                    </div>
                    <div className="font-mono text-[10px] truncate">
                      {color}
                    </div>
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
