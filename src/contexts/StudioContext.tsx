import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ProcessedResult, ColorAnalysis } from "@/lib/imageProcessing";

export type ViewMode = "original" | "contours" | "numbered" | "colorized";

export interface StudioSettings {
  numColors: number;
  minRegionSize: number;
  smoothness: number;
  mergeTolerance: number;
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
}

interface StudioContextValue {
  // State
  currentProject: Project | null;
  viewMode: ViewMode;
  analysis: ColorAnalysis | null;
  result: ProcessedResult | null;
  settings: StudioSettings;
  isProcessing: boolean;
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setAnalysis: (analysis: ColorAnalysis | null) => void;
  setResult: (result: ProcessedResult | null) => void;
  updateSettings: (settings: Partial<StudioSettings>) => void;
  setIsProcessing: (processing: boolean) => void;
  
  // Project actions
  saveProject: (name: string) => void;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  getSavedProjects: () => Project[];
}

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

const DEFAULT_SETTINGS: StudioSettings = {
  numColors: 20,
  minRegionSize: 100,
  smoothness: 50,
  mergeTolerance: 5,
};

export function StudioProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateSettings = useCallback((newSettings: Partial<StudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getSavedProjects = useCallback((): Project[] => {
    try {
      const stored = localStorage.getItem('pbn-projects');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }, []);

  const saveProject = useCallback((name: string) => {
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
    localStorage.setItem('pbn-projects', JSON.stringify(updated));
  }, [currentProject, result, settings, analysis, getSavedProjects]);

  const loadProject = useCallback((projectId: string) => {
    const projects = getSavedProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
      setCurrentProject(project);
      setSettings(project.settings);
      setAnalysis(project.analysis || null);
      setResult(project.result || null);
    }
  }, [getSavedProjects]);

  const deleteProject = useCallback((projectId: string) => {
    const projects = getSavedProjects();
    const updated = projects.filter(p => p.id !== projectId);
    localStorage.setItem('pbn-projects', JSON.stringify(updated));
  }, [getSavedProjects]);

  const value: StudioContextValue = {
    currentProject,
    viewMode,
    analysis,
    result,
    settings,
    isProcessing,
    setCurrentProject,
    setViewMode,
    setAnalysis,
    setResult,
    updateSettings,
    setIsProcessing,
    saveProject,
    loadProject,
    deleteProject,
    getSavedProjects,
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}
