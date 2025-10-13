import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProcessedResult } from "@/lib/imageProcessing";

interface ProjectData {
  id: string;
  name: string;
  timestamp: number;
  imageUrl: string;
  parameters: {
    numColors: number;
    minRegionSize: number;
    smoothness: number;
  };
  result: ProcessedResult;
}

interface ProjectManagerProps {
  currentImage: string | null;
  currentResult: ProcessedResult | null;
  currentParams: {
    numColors: number;
    minRegionSize: number;
    smoothness: number;
  };
  onLoadProject: (data: ProjectData) => void;
}

export function ProjectManager({ 
  currentImage, 
  currentResult, 
  currentParams,
  onLoadProject 
}: ProjectManagerProps) {
  const [projectName, setProjectName] = useState("");
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const stored = localStorage.getItem('pbn-projects');
      if (stored) {
        setSavedProjects(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const saveProject = () => {
    if (!currentImage || !currentResult) {
      toast.error("Aucun projet à sauvegarder");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Veuillez entrer un nom de projet");
      return;
    }

    const project: ProjectData = {
      id: Date.now().toString(),
      name: projectName.trim(),
      timestamp: Date.now(),
      imageUrl: currentImage,
      parameters: currentParams,
      result: currentResult,
    };

    const updated = [...savedProjects, project];
    localStorage.setItem('pbn-projects', JSON.stringify(updated));
    setSavedProjects(updated);
    setProjectName("");
    toast.success(`Projet "${project.name}" sauvegardé`);
  };

  const deleteProject = (id: string) => {
    const updated = savedProjects.filter(p => p.id !== id);
    localStorage.setItem('pbn-projects', JSON.stringify(updated));
    setSavedProjects(updated);
    toast.success("Projet supprimé");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Projets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-xs">Nom du projet</Label>
          <div className="flex gap-2">
            <Input
              id="project-name"
              placeholder="Mon super projet..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="flex-1 text-sm"
            />
            <Button
              size="sm"
              onClick={saveProject}
              disabled={!currentImage || !currentResult}
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {savedProjects.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Projets sauvegardés</Label>
            <div className="space-y-1 max-h-[200px] overflow-auto">
              {savedProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onLoadProject(project)}
                    >
                      <FolderOpen className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteProject(project.id)}
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
