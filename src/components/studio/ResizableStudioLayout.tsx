import { ReactNode, useEffect, useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ResizableStudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel?: ReactNode;
  bottomBar?: ReactNode;
}

const STORAGE_KEY = "studio-layout-sizes";

interface LayoutSizes {
  leftWidth: number;
  rightWidth: number;
}

const DEFAULT_SIZES: LayoutSizes = {
  leftWidth: 25,
  rightWidth: 25,
};

export function ResizableStudioLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomBar,
}: ResizableStudioLayoutProps) {
  const [sizes, setSizes] = useState<LayoutSizes>(DEFAULT_SIZES);

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.leftWidth && parsed?.rightWidth) setSizes(parsed);
      }
    } catch (error) {
      console.error("Error loading layout sizes:", error);
    }
  }, []);

  const handleLayoutChange = (sizesArr: number[]) => {
    const newSizes: LayoutSizes = {
      leftWidth: sizesArr[0] ?? DEFAULT_SIZES.leftWidth,
      rightWidth: rightPanel ? sizesArr[2] ?? DEFAULT_SIZES.rightWidth : 0,
    };
    setSizes(newSizes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSizes));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="h-[calc(100vh-4rem)] flex flex-col bg-studio-surface text-studio-foreground studio-transition"
      aria-label="Studio Layout"
    >
      {/* Zone principale */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={handleLayoutChange}
          className="h-full w-full"
        >
          {/* --- LEFT PANEL --- */}
          <ResizablePanel
            defaultSize={sizes.leftWidth}
            minSize={20}
            maxSize={40}
            className="studio-transition bg-studio-panel border-r border-studio-border/60 shadow-studio-panel-left"
          >
            <aside
              aria-label="Panneau gauche (paramètres)"
              className="h-full overflow-auto"
            >
              <div className="p-3 space-y-3">{leftPanel}</div>
            </aside>
          </ResizablePanel>

          {/* --- HANDLE --- */}
          <ResizableHandle
            withHandle
            className={cn(
              "group relative bg-studio-border/30 hover:bg-studio-border/60 transition-colors duration-200 cursor-col-resize w-[1.5px]",
              "after:content-[''] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1 after:h-8 after:rounded-full after:bg-studio-border/60 group-hover:after:bg-studio-accent-blue/80"
            )}
          />

          {/* --- CENTER PANEL --- */}
          <ResizablePanel
            defaultSize={rightPanel ? 50 : 75}
            minSize={30}
            className="bg-studio-canvas relative"
          >
            <main
              role="main"
              className="relative h-full overflow-hidden focus:outline-none"
              aria-label="Zone centrale du studio"
            >
              {centerPanel}
            </main>
          </ResizablePanel>

          {/* --- RIGHT PANEL (optionnel) --- */}
          {rightPanel && (
            <>
              <ResizableHandle
                withHandle
                className={cn(
                  "group relative bg-studio-border/30 hover:bg-studio-border/60 transition-colors duration-200 cursor-col-resize w-[1.5px]",
                  "after:content-[''] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1 after:h-8 after:rounded-full after:bg-studio-border/60 group-hover:after:bg-studio-accent-blue/80"
                )}
              />

              <ResizablePanel
                defaultSize={sizes.rightWidth}
                minSize={20}
                maxSize={40}
                className="studio-transition bg-studio-panel border-l border-studio-border/60 shadow-studio-panel-right"
              >
                <aside
                  aria-label="Panneau droit (palette ou débogage)"
                  className="h-full overflow-hidden"
                >
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">{rightPanel}</div>
                </ScrollArea>
                </aside>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* --- BOTTOM BAR --- */}
      {bottomBar && (
        <footer
          className="border-t border-studio-border/60 bg-studio-status-bar/80 backdrop-blur-md px-4 py-2 text-xs text-studio-foreground/70 studio-transition"
          aria-label="Barre inférieure du studio"
        >
          {bottomBar}
        </footer>
      )}
    </div>
  );
}
