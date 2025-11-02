import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { ProcessedResult, ColorAnalysis } from "@/lib/imageProcessing";
import { useProfiler } from "@/hooks/useProfiler";

// Note: Pour la fonctionnalité d'export ZIP, vous devrez installer ces dépendances:
// npm install jszip file-saver
// import JSZip from "jszip";
// import { saveAs } from "file-saver";

// ---------------------------------------------
// Types principaux
// ---------------------------------------------

export type ViewMode =
  | "original"
  | "contours"
  | "numbered"
  | "colorized"
  | "compare";

export interface StudioSettings {
  numColors: number;
  minRegionSize: number;
  smoothness: number;
  mergeTolerance: number;
  enableArtisticMerge: boolean;
  smartPalette: boolean;
  paintEffect: "none" | "watercolor" | "brush";
  paintIntensity: number;
  artisticEffect: "none" | "oil" | "pencil";
  artisticIntensity: number;
  profilingEnabled: boolean;
  watermarkEnabled?: boolean; // Nouveau: option pour le filigrane
  watermarkText?: string; // Nouveau: texte du filigrane
}

export interface UserPreferences {
  lastViewMode: ViewMode;
  autoSave: boolean;
  theme: "light" | "dark" | "system";
  lastProjectId?: string;
}

export interface Project {
  id: string;
  name: string;
  timestamp: number;
  imageUrl: string;
  imageFile?: File;
  settings: StudioSettings;
  analysis?: ColorAnalysis;
  result?: ProcessedResult;
    favorite?: boolean;
}

// ---------------------------------------------
// Nouveaux types HUD / Overlay
// ---------------------------------------------

export type OverlayState = {
  numbered: boolean; // afficher les numéros sur l'overlay
  opacity: number; // 0..100
};

// ---------------------------------------------
// Interface principale du contexte
// ---------------------------------------------

export interface StudioContextValue {
  // --- État général ---
  currentProject: Project | null;
  viewMode: ViewMode;
  analysis: ColorAnalysis | null;
  result: ProcessedResult | null;
  settings: StudioSettings;
  isProcessing: boolean;
  preferences: UserPreferences;

  // --- Actions principales ---
  setCurrentProject: (project: Project | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setAnalysis: (analysis: ColorAnalysis | null) => void;
  setResult: (result: ProcessedResult | null) => void;
  updateSettings: (settings: Partial<StudioSettings>) => void;
  setIsProcessing: (processing: boolean) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;

  // --- Gestion projets ---
  saveProject: (name: string) => void;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  getSavedProjects: () => Project[];

  // --- Performance profiler ---
  profiler: ReturnType<typeof useProfiler>;

  // --- AJOUT : état/handlers HUD ---
  zoomPercent: number;
  setZoomPercent: (v: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  panTool: boolean;
  togglePanTool: () => void; // mode "main" (pan) visuel
  pickColor?: () => void; // pipette (optionnel)

  overlay: OverlayState;
  setOverlay: (s: OverlayState) => void;

  // Aller à la zone numérotée N (si dispo)
  findZoneByNumber?: (n: number) => void;
  
  // --- AJOUT : méthodes de rendu et d'export ---
  renderToCanvas: (mode: ViewMode, scale?: number, backgroundColor?: string) => HTMLCanvasElement | null;
  exportCanvasAsPNG: (mode: ViewMode, filename?: string, scale?: number, backgroundColor?: string) => void;
  exportAllPNGs: () => Promise<void>; // Nouveau: export multi-fichiers en ZIP
}

// ---------------------------------------------
// Défauts
// ---------------------------------------------

const DEFAULT_SETTINGS: StudioSettings = {
  numColors: 20,
  minRegionSize: 100,
  smoothness: 50,
  mergeTolerance: 12,
  enableArtisticMerge: true,
  smartPalette: false,
  paintEffect: "none",
  paintIntensity: 50,
  artisticEffect: "none",
  artisticIntensity: 50,
  profilingEnabled: false,
  watermarkEnabled: false,
  watermarkText: "@FranckStudio",
};

const DEFAULT_PREFERENCES: UserPreferences = {
  lastViewMode: "original",
  autoSave: false,
  theme: "system",
};

// ---------------------------------------------
// LocalStorage helpers
// ---------------------------------------------

const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem("pbn-preferences");
    return stored
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const savePreferences = (prefs: UserPreferences) => {
  try {
    localStorage.setItem("pbn-preferences", JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save preferences:", error);
  }
};

// ---------------------------------------------
// Contexte
// ---------------------------------------------

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

// ---------------------------------------------
// Provider
// ---------------------------------------------

export function StudioProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [preferences, setPreferences] =
    useState<UserPreferences>(loadPreferences);
  const [viewMode, setViewMode] = useState<ViewMode>(preferences.lastViewMode);
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const profiler = useProfiler();

  // --- AJOUT HUD ---
  const [zoomPercent, _setZoomPercent] = useState<number>(100);
  const clampZoom = (v: number) => Math.max(10, Math.min(800, Math.round(v)));

  const setZoomPercent = useCallback((v: number) => {
    _setZoomPercent(clampZoom(v));
  }, []);

  const zoomIn = useCallback(() => {
    _setZoomPercent((z) => clampZoom(z + 10));
  }, []);

  const zoomOut = useCallback(() => {
    _setZoomPercent((z) => clampZoom(z - 10));
  }, []);

  const [isPanMode, setIsPanMode] = useState(false);
  const togglePanTool = useCallback(() => setIsPanMode((v) => !v), []);
  const resetZoom = useCallback(() => {
    _setZoomPercent(100);
  }, []);
  const pickColor = undefined; // hook pipette si tu veux plus tard

  const [overlay, setOverlay] = useState<OverlayState>({
    numbered: true,
    opacity: 60,
  });

  const findZoneByNumber = useCallback(
    (n: number) => {
      const labels = result?.labels;
      if (!labels) return;
      const target = labels.find((l: any) => l?.number === n);
      if (target) {
        console.info("[Studio] Zone trouvée:", target);
      }
    },
    [result]
  );

// ---------------------------------------------
// Fonction de rendu sur Canvas (corrigée et centrée)
// ---------------------------------------------
// ---------------------------------------------
// Fonction de rendu sur Canvas (Option B : taille originale, redimensionnée)
// ---------------------------------------------
const renderToCanvas = useCallback((
  mode: ViewMode,
  scale: number = 1,
  backgroundColor?: string
): HTMLCanvasElement | null => {
  if (!result) {
    console.warn("[Studio] Aucun résultat à exporter.");
    toast.error("Aucun rendu disponible.");
    return null;
  }

  const { metadata, colorized, contours, numbered } = result;
  const width = metadata?.width ?? colorized?.width ?? 0;
  const height = metadata?.height ?? colorized?.height ?? 0;

  if (!width || !height || width <= 0 || height <= 0) {
    console.error("[Studio] Export annulé : dimensions invalides", { width, height });
    toast.error("Erreur : largeur ou hauteur d'image invalide.");
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fond blanc par défaut
  ctx.fillStyle = backgroundColor ?? "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Choix du rendu à exporter
  let img: ImageData | null = null;
  switch (mode) {
    case "original":
    case "colorized":
      img = colorized;
      break;
    case "contours":
      img = contours;
      break;
    case "numbered":
      img = numbered ?? colorized;
      break;
    case "compare":
      img = colorized;
      break;
    default:
      toast.error(`Mode d'export inconnu : ${mode}`);
      return null;
  }

  if (!img) {
    toast.error("Aucune image disponible pour ce mode.");
    console.error("[Studio] Aucun ImageData pour le mode", mode);
    return null;
  }

  // ✅ Création d’un canvas temporaire à la taille du rendu réel
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return null;
  tempCtx.putImageData(img, 0, 0);

  // ✅ Mise à l’échelle vers la taille originale
  ctx.save();
  ctx.scale(scale, scale);
  ctx.drawImage(tempCanvas, 0, 0, img.width, img.height, 0, 0, width, height);
  ctx.restore();

  // ✅ Numéros en surimpression (si applicable)
  if (mode === "numbered" && Array.isArray(result.zones)) {
    const scaleRatioX = width / img.width;
    const scaleRatioY = height / img.height;
    ctx.font = `bold ${10 * scale}px JetBrains Mono`;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const zone of result.zones) {
      if (zone.centroid && zone.label != null) {
        ctx.fillText(
          zone.label.toString(),
          Math.round(zone.centroid.x * scaleRatioX * scale) + 0.5,
          Math.round(zone.centroid.y * scaleRatioY * scale) + 0.5
        );
      }
    }
  }

  // ✅ Filigrane optionnel
  if (settings.watermarkEnabled && settings.watermarkText) {
    ctx.font = `${8 * scale}px JetBrains Mono`;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.textAlign = "right";
    ctx.fillText(
      settings.watermarkText,
      width * scale - 10,
      height * scale - 10
    );
  }

  return canvas;
}, [result, settings.watermarkEnabled, settings.watermarkText]);



  // ---------------------------------------------
  // Helper d'export PNG
  // ---------------------------------------------
  const exportCanvasAsPNG = useCallback((
    mode: ViewMode,
    filename?: string,
    scale = 1,
    backgroundColor?: string
  ) => {
    const canvas = renderToCanvas(mode, scale, backgroundColor);
    if (!canvas) throw new Error("Canvas introuvable");
    
    const link = document.createElement("a");
    link.download = filename ?? `pbn-${mode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [renderToCanvas]);

  // ---------------------------------------------
  // Helper d'export multi-fichiers en ZIP
  // ---------------------------------------------
  const exportAllPNGs = useCallback(async () => {
    if (!result) return;
    
    // Note: Cette fonction nécessite les dépendances jszip et file-saver
    // import JSZip from "jszip";
    // import { saveAs } from "file-saver";
    
    try {
      // Dynamique import pour éviter les erreurs si les dépendances ne sont pas installées
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      
      const zip = new JSZip();
      const modes: ViewMode[] = ["colorized", "contours", "numbered"];
      
      for (const mode of modes) {
        const canvas = renderToCanvas(mode, 1);
        if (!canvas) continue;
        
        const blob = await new Promise<Blob | null>((res) => 
          canvas.toBlob(res, "image/png")
        );
        
        if (blob) {
          zip.file(`pbn-${mode}.png`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const dateStr = new Date().toISOString().slice(0, 10);
      saveAs(zipBlob, `pbn-exports-${dateStr}.zip`);
    } catch (error) {
      console.error("Erreur lors de l'export ZIP:", error);
      // Fallback: exporter les fichiers individuellement si JSZip n'est pas disponible
      const modes: ViewMode[] = ["colorized", "contours", "numbered"];
      for (const mode of modes) {
        exportCanvasAsPNG(mode);
      }
    }
  }, [result, renderToCanvas, exportCanvasAsPNG]);

  // ---------------------------------------------
  // Effets
  // ---------------------------------------------

  useEffect(() => {
    profiler.setEnabled(settings.profilingEnabled);
  }, [settings.profilingEnabled, profiler.setEnabled]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (viewMode !== preferences.lastViewMode) {
      setPreferences((prev) => ({ ...prev, lastViewMode: viewMode }));
    }
  }, [viewMode]);

  // ---------------------------------------------
  // Actions
  // ---------------------------------------------

  const updatePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<StudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const getSavedProjects = useCallback((): Project[] => {
    try {
      const stored = localStorage.getItem("pbn-projects");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading projects:", error);
      return [];
    }
  }, []);

  const saveProject = useCallback(
    (name: string) => {
      if (!currentProject?.imageUrl || !result) {
        throw new Error("No project to save");
      }

      const project: Project = {
        id: Date.now().toString(),
        name: name.trim(),
        timestamp: Date.now(),
        imageUrl: currentProject.imageUrl,
        settings,
        analysis: analysis || undefined,
        result,
      };

      const projects = getSavedProjects();
      const updated = [...projects, project];
      localStorage.setItem("pbn-projects", JSON.stringify(updated));
    },
    [currentProject, result, settings, analysis, getSavedProjects]
  );

  const loadProject = useCallback(
    (projectId: string) => {
      const projects = getSavedProjects();
      const project = projects.find((p) => p.id === projectId);

      if (project) {
        setCurrentProject(project);
        setSettings({ ...DEFAULT_SETTINGS, ...project.settings });
        setAnalysis(project.analysis || null);
        setResult(project.result || null);
      }
    },
    [getSavedProjects]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      const projects = getSavedProjects();
      const updated = projects.filter((p) => p.id !== projectId);
      localStorage.setItem("pbn-projects", JSON.stringify(updated));
    },
    [getSavedProjects]
  );

  // ---------------------------------------------
  // Valeur exposée
  // ---------------------------------------------

  const value: StudioContextValue = {
    currentProject,
    viewMode,
    analysis,
    result,
    settings,
    isProcessing,
    preferences,
    setCurrentProject,
    setViewMode,
    setAnalysis,
    setResult,
    updateSettings,
    setIsProcessing,
    updatePreferences,
    saveProject,
    loadProject,
    deleteProject,
    getSavedProjects,
    profiler,

    // HUD
    zoomPercent,
    setZoomPercent,
    zoomIn,
    zoomOut,
    resetZoom,
    panTool: isPanMode,
    togglePanTool,
    pickColor,
    overlay,
    setOverlay,
    findZoneByNumber,
    
    // Export
    renderToCanvas,
    exportCanvasAsPNG,
    exportAllPNGs,
  };

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  );
}

// ---------------------------------------------
// Hook
// ---------------------------------------------

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return context;
}