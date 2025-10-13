import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, FolderOpen, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStudio } from "@/contexts/StudioContext";

export function EnhancedProjectManager() {
  const [projectName, setProjectName] = useState("");
  const { 
    currentProject, 
    result, 
    saveProject, 
    loadProject, 
    deleteProject, 
    getSavedProjects,
    setCurrentProject,
    setResult,
    updateSettings
  } = useStudio();

  const savedProjects = getSavedProjects();

  const handleSave = () => {
    if (!currentProject?.imageUrl || !result) {
      toast.error("Aucun projet à sauvegarder");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Veuillez entrer un nom de projet");
      return;
    }

    try {
      saveProject(projectName.trim());
      setProjectName("");
      toast.success(`Projet "${projectName}" sauvegardé`);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleLoad = (projectId: string) => {
    try {
      loadProject(projectId);
      const project = getSavedProjects().find(p => p.id === projectId);
      if (project) {
        toast.success(`Projet "${project.name}" chargé`);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement");
    }
  };

  const handleDelete = (projectId: string) => {
    try {
      deleteProject(projectId);
      toast.success("Projet supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleExportProject = (projectId: string) => {
    const project = getSavedProjects().find(p => p.id === projectId);
    if (!project) return;

    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.pbnproj`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Projet exporté");
  };

  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pbnproj,application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const project = JSON.parse(text);
        
        // Validate project structure
        if (!project.id || !project.name || !project.imageUrl) {
          throw new Error("Format de projet invalide");
        }

        // Save to local storage
        const projects = getSavedProjects();
        const updated = [...projects, { ...project, id: Date.now().toString() }];
        localStorage.setItem('pbn-projects', JSON.stringify(updated));
        
        toast.success(`Projet "${project.name}" importé`);
      } catch (error) {
        toast.error("Erreur lors de l'import du projet");
      }
    };
    
    input.click();
  };

  return (
    <Card className="shadow-card border-border/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Projets</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleImportProject}
            className="h-7 px-2"
          >
            <Upload className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-xs text-muted-foreground">
            Nom du projet
          </Label>
          <div className="flex gap-2">
            <Input
              id="project-name"
              placeholder="Mon projet..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 text-sm h-9"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!currentProject?.imageUrl || !result}
              className="h-9 px-3"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {savedProjects.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Projets sauvegardés ({savedProjects.length})
            </Label>
            <div className="space-y-1.5 max-h-[250px] overflow-auto pr-1">
              {savedProjects.sort((a, b) => b.timestamp - a.timestamp).map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-medium truncate">
                        {project.name}
                      </div>
                      {project.result && (
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                          {project.result.zones.length}z
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLoad(project.id)}
                      className="h-7 px-2"
                      title="Charger"
                    >
                      <FolderOpen className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportProject(project.id)}
                      className="h-7 px-2"
                      title="Exporter"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(project.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
