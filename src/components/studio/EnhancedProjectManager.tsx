import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Download, 
  Upload, 
  Clock, 
  Image as ImageIcon, 
  RefreshCw, 
  Loader2,
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  MoreHorizontal,
  Calendar,
  Palette,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Archive,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { useStudio } from "@/contexts/StudioContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function EnhancedProjectManager() {
  const studio = useStudio();
  useAutoSave();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [previewProject, setPreviewProject] = useState<string | null>(null);
  
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

  // Filtrer et trier les projets
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.result?.zones?.length && p.result.zones.length.toString().includes(searchQuery))
    );
    
    if (filterFavorite) {
      filtered = filtered.filter(p => p.favorite);
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") return b.timestamp - a.timestamp;
      if (sortBy === "size") return (b.result?.zones?.length || 0) - (a.result?.zones?.length || 0);
      return 0;
    });
  }, [projects, searchQuery, sortBy, filterFavorite]);

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
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!projectToDelete) return;
    
    const p = projects.find((x) => x.id === projectToDelete);
    try {
      studio.deleteProject(projectToDelete);
      toast.success("Projet supprimé");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
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
      toast.error("Erreur lors de l'export");
    }
  };

  const handleImportProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleFavorite = (projectId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, favorite: !p.favorite } : p
    );
    setProjects(updatedProjects);
    localStorage.setItem("pbn-projects", JSON.stringify(updatedProjects));
    toast.success(updatedProjects.find(p => p.id === projectId)?.favorite ? "Projet ajouté aux favoris" : "Projet retiré des favoris");
  };

  const startRenaming = (projectId: string, currentName: string) => {
    setRenamingProject(projectId);
    setNewProjectName(currentName);
  };

  const confirmRename = () => {
    if (!renamingProject || !newProjectName.trim()) return;
    
    const updatedProjects = projects.map(p => 
      p.id === renamingProject ? { ...p, name: newProjectName.trim() } : p
    );
    setProjects(updatedProjects);
    localStorage.setItem("pbn-projects", JSON.stringify(updatedProjects));
    toast.success("Projet renommé");
    setRenamingProject(null);
    setNewProjectName("");
  };

  const duplicateProject = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    
    const duplicated = {
      ...p,
      id: Date.now().toString(),
      name: `${p.name} (copie)`,
      timestamp: Date.now()
    };
    
    const updatedProjects = [...projects, duplicated];
    setProjects(updatedProjects);
    localStorage.setItem("pbn-projects", JSON.stringify(updatedProjects));
    toast.success(`Projet "${p.name}" dupliqué`);
  };

  // KPI en-tête (dérivés)
  const total = projects.length;
  const favorites = projects.filter(p => p.favorite).length;
  const last = projects[0];

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handleImportProject();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        loadAll();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, loadAll]);

  return (
    <TooltipProvider>
      <Card className="border-studio-border/60 bg-studio-panel/80 backdrop-blur-md shadow-studio-panel-right">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Projets
            </span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                    className="h-8 w-8 p-0"
                    title={`Basculer en vue ${viewMode === "list" ? "grille" : "liste"}`}
                  >
                    {viewMode === "list" ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Vue {viewMode === "list" ? "grille" : "liste"}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadAll}
                    className="h-8 px-2 gap-2"
                    title="Rafraîchir la liste (Ctrl+R)"
                    aria-label="Rafraîchir la liste des projets"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span className="hidden sm:inline">Rafraîchir</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Rafraîchir (Ctrl+R)</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleImportProject}
                    className="h-8 px-2"
                    title="Importer un projet (.pbnproj) (Ctrl+O)"
                    aria-label="Importer un projet"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Importer (Ctrl+O)</p></TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pbnproj,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barre de recherche et filtres */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un projet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Trier</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Par date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Par nom
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("size")}>
                  <Layers className="mr-2 h-4 w-4" />
                  Par taille
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterFavorite(!filterFavorite)}>
                  <Star className="mr-2 h-4 w-4" />
                  {filterFavorite ? "Tous les projets" : "Favoris uniquement"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-panel-header/30 border border-studio-border/40">
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
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-studio-border/40 bg-studio-panel/50 p-2.5">
              <div className="text-[11px] text-muted-foreground">Total</div>
              <div className="text-lg font-mono tabular-nums">{total}</div>
            </div>
            <div className="rounded-md border border-studio-border/40 bg-studio-panel/50 p-2.5">
              <div className="text-[11px] text-muted-foreground">Favoris</div>
              <div className="text-lg font-mono tabular-nums">{favorites}</div>
            </div>
            <div className="rounded-md border border-studio-border/40 bg-studio-panel/50 p-2.5">
              <div className="text-[11px] text-muted-foreground">Dernier</div>
              <div className="text-xs truncate">{last?.name ?? "—"}</div>
            </div>
          </div>

          {/* Liste */}
          {loading ? (
            <div className={cn(
              "gap-2",
              viewMode === "grid" ? "grid grid-cols-2" : "grid grid-cols-1"
            )}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-md border bg-studio-panel/40 animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="rounded-md border border-studio-border/40 bg-studio-panel-header/30 p-6 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
              {searchQuery || filterFavorite ? "Aucun projet ne correspond à votre recherche." : "Aucun projet enregistré."}
            </div>
          ) : (
            <div className={cn(
              "gap-1.5 pr-1",
              viewMode === "grid" ? "grid grid-cols-2 max-h-[400px]" : "space-y-1.5 max-h-[400px]"
            )} role="list">
              {filteredAndSortedProjects.map((p) => {
                const zones = p.result?.zones?.length ?? 0;
                const cols = p.result?.palette?.length ?? p.settings?.numColors ?? 0;
                const isRenaming = renamingProject === p.id;
                
                return (
                  <div
                    key={p.id}
                    role="listitem"
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded-lg bg-studio-panel/40 hover:bg-studio-panel/70 transition-all duration-200 border border-studio-border/30 hover:border-studio-border/60",
                      viewMode === "grid" ? "flex-col h-32" : "h-16"
                    )}
                  >
                    <div className={cn(
                      "flex gap-3 min-w-0",
                      viewMode === "grid" ? "flex-col w-full" : "items-center"
                    )}>
                      <div 
                        className={cn(
                          "rounded-md bg-secondary border border-studio-border/40 overflow-hidden flex items-center justify-center cursor-pointer",
                          viewMode === "grid" ? "h-20 w-full" : "h-10 w-14"
                        )}
                        onClick={() => setPreviewProject(p.id)}
                        aria-hidden="true"
                      >
                        {p.imageUrl ? (
                          <img 
                            src={p.imageUrl} 
                            alt="" 
                            className={cn(
                              "object-cover",
                              viewMode === "grid" ? "h-full w-full" : "h-full w-full"
                            )} 
                            loading="lazy" 
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className={cn(
                        "min-w-0",
                        viewMode === "grid" ? "w-full text-center" : ""
                      )}>
                        <div className={cn(
                          "flex items-center gap-2",
                          viewMode === "grid" ? "justify-center" : ""
                        )}>
                          {isRenaming ? (
                            <Input
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              onBlur={confirmRename}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") confirmRename();
                                if (e.key === "Escape") {
                                  setRenamingProject(null);
                                  setNewProjectName("");
                                }
                              }}
                              className="h-6 text-xs px-1"
                              autoFocus
                            />
                          ) : (
                            <>
                              <div className={cn(
                                "font-medium truncate",
                                viewMode === "grid" ? "text-sm" : "text-sm"
                              )}>{p.name || "Sans titre"}</div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => toggleFavorite(p.id)}
                              >
                                <Star className={cn(
                                  "h-3 w-3",
                                  p.favorite ? "fill-studio-accent-yellow text-studio-accent-yellow" : "text-muted-foreground"
                                )} />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className={cn(
                          "flex items-center gap-2",
                          viewMode === "grid" ? "justify-center mt-1" : ""
                        )}>
                          <Badge variant="outline" className="text-[10px]">
                            <Palette className="w-2 h-2 mr-1" />
                            {cols}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            <Layers className="w-2 h-2 mr-1" />
                            {zones}
                          </Badge>
                        </div>
                        <div className={cn(
                          "text-xs text-muted-foreground",
                          viewMode === "grid" ? "mt-1" : ""
                        )}>{formattedDate(p.timestamp)}</div>
                      </div>
                    </div>

                    <div className={cn(
                      "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      viewMode === "grid" ? "mt-2 justify-center" : ""
                    )}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleLoad(p.id)}
                            className="h-7 w-7 p-0"
                            title="Charger"
                            aria-label={`Charger le projet ${p.name || ""}`}
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Charger</p></TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Plus d'options"
                            aria-label="Plus d'options"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startRenaming(p.id, p.name)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Renommer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateProject(p.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFavorite(p.id)}>
                            <Star className="mr-2 h-4 w-4" />
                            {p.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleExportProject(p.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Exporter
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(p.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-studio-panel border-studio-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projects.find(p => p.id === projectToDelete)?.name}" ? Cette action est définitive et ne peut être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue d'aperçu de projet */}
      {previewProject && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewProject(null)}
        >
          <div 
            className="bg-studio-panel border border-studio-border/60 rounded-lg max-w-4xl max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-studio-panel-header/80 backdrop-blur-sm border-b border-studio-border/40 p-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {projects.find(p => p.id === previewProject)?.name || "Aperçu du projet"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewProject(null)}
                className="h-8 w-8 p-0"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              {projects.find(p => p.id === previewProject)?.imageUrl ? (
                <img 
                  src={projects.find(p => p.id === previewProject)?.imageUrl} 
                  alt="Aperçu du projet" 
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}