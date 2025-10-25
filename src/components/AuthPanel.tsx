// src/components/AuthPanel.tsx
import { useMemo } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings,
  Download,
  Trash2,
  Sun,
  Moon,
  Monitor,
  HardDrive
} from "lucide-react";

export function AuthPanel() {
  const studio = useStudio();

  const themeIcon = useMemo(() => {
    if (studio.preferences.theme === "light") return <Sun className="w-3.5 h-3.5" />;
    if (studio.preferences.theme === "dark") return <Moon className="w-3.5 h-3.5" />;
    return <Monitor className="w-3.5 h-3.5" />;
  }, [studio.preferences.theme]);

  const handleExportAll = () => {
    try {
      const projects = studio.getSavedProjects();
      const prefs = { ...studio.preferences };
      const payload = { exportedAt: new Date().toISOString(), projects, preferences: prefs };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pbn-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export des données locales effectué");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l’export");
    }
  };

  const handleClearLocal = () => {
    const ok = confirm(
      "Supprimer toutes les données locales (projets + préférences) ? Cette action est définitive."
    );
    if (!ok) return;
    try {
      localStorage.removeItem("pbn-projects");
      localStorage.removeItem("pbn-preferences");
      toast.success("Données locales supprimées");
    } catch (e) {
      console.error(e);
      toast.error("Échec de la suppression locale");
    }
  };

  return (
    <Card className="p-4 bg-card/60 border backdrop-blur">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Settings className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold">Préférences locales</h3>
        <Badge variant="secondary" className="ml-auto text-[11px] gap-1">
          <HardDrive className="w-3 h-3" />
          Local only
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Thème */}
        <div className="space-y-1.5">
          <Label className="text-xs">Thème</Label>
          <Select
            value={studio.preferences.theme}
            onValueChange={(v: "light" | "dark" | "system") => studio.updatePreferences({ theme: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Système" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                <span className="inline-flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5" /> Système
                </span>
              </SelectItem>
              <SelectItem value="light">
                <span className="inline-flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5" /> Clair
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="inline-flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5" /> Sombre
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
            {themeIcon}
            Mode actuel : <span className="font-medium">{studio.preferences.theme}</span>
          </div>
        </div>

        {/* Autosave */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-save" className="text-xs cursor-pointer">
              Sauvegarde auto (2 min)
            </Label>
          </div>
          <Switch
            id="auto-save"
            checked={studio.preferences.autoSave}
            onCheckedChange={(checked) => studio.updatePreferences({ autoSave: checked })}
            aria-label="Activer la sauvegarde automatique"
          />
        </div>

        {/* Actions données locales */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleExportAll}
            aria-label="Exporter toutes les données locales"
            title="Exporter (projets + préférences)"
          >
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-2"
            onClick={handleClearLocal}
            aria-label="Supprimer toutes les données locales"
            title="Supprimer localStorage"
          >
            <Trash2 className="w-4 h-4" />
            Vider local
          </Button>
        </div>
      </div>
    </Card>
  );
}
