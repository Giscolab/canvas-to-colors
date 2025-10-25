import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, FolderOpen, Trash2, Download, Upload, Clock, Image as ImageIcon, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStudio } from "@/contexts/StudioContext";
import { useAutoSave } from "@/hooks/useAutoSave";

export function EnhancedProjectManager() {
  const studio = useStudio();
  useAutoSave();

  // --- ÉTAT LOCAL : source de vérité réactive pour la liste ---
  const [projects, setProjects] = useState(() => studio.getSavedProjects());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState("");

  // Charger/refetch proprement
  const loadAll = useCallback(() => {
    setLoading(true);
    try {
      const all = studio.getSavedProjects().slice().sort((a, b) => b.timestamp - a.timestamp);
      setProjects(all);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les projets");
    } finally {
      setLoading(false);
    }
  }, [studio]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const formattedDate = (ts: number) =>
    new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(ts);

  // --- Actions ---
  const handleSave = async () => {
    if (!studio.currentProject?.imageUrl || !studio.result) {
      toast.error("Aucun projet à sauvegarder");
      return;
    }
    const name = projectName.trim();
    if (!name) {
      toast.error("Veuillez entrer un nom de projet");
      return;
    }
    try {
      setSaving(true);
      await Promise.resolve(studio.saveProject(name));
      setProjectName("");
      toast.success(`Projet "${name}" sauvegardé`);
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (projectId: string) => {
    try {
      studio.loadProject(projectId);
      const p = projects.find((x) => x.id === projectId);
      if (p) {
        toast.success(`Projet "${p.name}" chargé`);
        setProjectName(p.name ?? "");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement");
    }
  };

  const handleDelete = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    const ok = confirm(`Supprimer le projet "${p?.name ?? ""}" ? Cette action est définitive.`);
    if (!ok) return;
    try {
      studio.deleteProject(projectId);
      toast.success("Projet supprimé");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleExportProject = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    try {
      const safeName = (p.name || "projet").replace(/[^\w\-]+/g, "_");
      const dataStr = JSON.stringify(p, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-${new Date(p.timestamp).toISOString().slice(0, 10)}.pbnproj`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Projet exporté");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l’export");
    }
  };

  const handleImportProject = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pbnproj,application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const project = JSON.parse(text);
        // Validation minimale
        if (!project || !project.name || !project.imageUrl || !project.settings) {
          throw new Error("Format de projet invalide");
        }
        // Sauvegarde avec nouvel id
        const updated = [...studio.getSavedProjects(), { ...project, id: Date.now().toString() }];
        localStorage.setItem("pbn-projects", JSON.stringify(updated));
        toast.success(`Projet "${project.name}" importé`);
        loadAll();
      } catch (error) {
        console.error(error);
        toast.error("Erreur lors de l'import du projet");
      } finally {
        // reset input system
        (e.target as HTMLInputElement).value = "";
      }
    };
    input.click();
  };

  // KPI en-tête (dérivés)
  const total = projects.length;
  const last = projects[0];

  return (
    <Card className="border bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Projets</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadAll}
              className="h-8 px-2 gap-2"
              title="Rafraîchir la liste"
              aria-label="Rafraîchir la liste des projets"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">Rafraîchir</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleImportProject}
              className="h-8 px-2"
              title="Importer un projet (.pbnproj)"
              aria-label="Importer un projet"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Saisie nom + save */}
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-xs text-muted-foreground">
            Nom du projet
          </Label>
          <div className="flex gap-2">
            <Input
              id="project-name"
              placeholder="Mon projet…"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="flex-1 text-sm h-9"
              aria-label="Nom du projet à enregistrer"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!studio.currentProject?.imageUrl || !studio.result || saving}
              className="h-9 px-3 gap-2"
              aria-label="Enregistrer le projet courant"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">Enregistrer</span>
            </Button>
          </div>
        </div>

        {/* Auto-save */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
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

        {/* KPI rapides */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-card p-2.5">
            <div className="text-[11px] text-muted-foreground">Total</div>
            <div className="text-lg font-mono tabular-nums">{total}</div>
          </div>
          <div className="rounded-md border bg-card p-2.5">
            <div className="text-[11px] text-muted-foreground">Dernier</div>
            <div className="text-xs truncate">{last?.name ?? "—"}</div>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-md border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            Aucun projet enregistré.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[260px] overflow-auto pr-1" role="list">
            {projects.map((p) => {
              const zones = p.result?.zones?.length ?? 0;
              const cols = p.result?.palette?.length ?? p.settings?.numColors ?? 0;
              return (
                <div
                  key={p.id}
                  role="listitem"
                  className="group flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-14 rounded-md bg-secondary border overflow-hidden flex items-center justify-center" aria-hidden="true">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{p.name || "Sans titre"}</div>
                        <Badge variant="outline" className="text-[10px]">🎨 {cols}</Badge>
                        <Badge variant="outline" className="text-[10px]">🧩 {zones}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{formattedDate(p.timestamp)}</div>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLoad(p.id)}
                      className="h-7 px-2"
                      title="Charger"
                      aria-label={`Charger le projet ${p.name || ""}`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportProject(p.id)}
                      className="h-7 px-2"
                      title="Exporter"
                      aria-label={`Exporter le projet ${p.name || ""}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      title="Supprimer"
                      aria-label={`Supprimer le projet ${p.name || ""}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
