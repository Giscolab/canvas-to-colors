// src/components/AuthPanel.tsx
import { useMemo } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings,
  Download,
  Trash2,
  HardDrive
} from "lucide-react";

export function AuthPanel() {
  const studio = useStudio();


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
