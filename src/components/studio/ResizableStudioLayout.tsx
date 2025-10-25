import { ReactNode, useEffect, useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSizes(JSON.parse(stored));
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
      /* noop */
    }
  };

return (
  <div className="h-[calc(100vh-4rem)] flex flex-col" aria-label="Studio layout">
    {/* 64px = hauteur TopBar sticky */}
    <div className="flex-1 overflow-hidden">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handleLayoutChange}
        className="h-full"
      >
        {/* LEFT SIDEBAR */}
        <ResizablePanel
          defaultSize={sizes.leftWidth}
          minSize={20}
          maxSize={40}
          className="sidebar-surface"
        >
          <aside aria-label="Panneau paramètres" className="h-full">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">{leftPanel}</div>
            </ScrollArea>
          </aside>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-border/50 hover:bg-border transition-colors"
        />

        {/* CENTER / MAIN CANVAS */}
        <ResizablePanel defaultSize={rightPanel ? 50 : 75} minSize={30}>
          <main role="main" className="relative h-full app-surface overflow-hidden">
            {centerPanel}
          </main>
        </ResizablePanel>

        {/* RIGHT SIDEBAR (optional) */}
        {rightPanel && (
          <>
            <ResizableHandle
              withHandle
              className="bg-border/50 hover:bg-border transition-colors"
            />
            <ResizablePanel
              defaultSize={sizes.rightWidth}
              minSize={20}
              maxSize={40}
              className="sidebar-surface"
            >
              <aside aria-label="Panneau palette et debug" className="h-full">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">{rightPanel}</div>
                </ScrollArea>
              </aside>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>

    {/* BOTTOM BAR */}
    {bottomBar && (
      <footer className="border-t border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        {bottomBar}
      </footer>
    )}
  </div>
);
}
