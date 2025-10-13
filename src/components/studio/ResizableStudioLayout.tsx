import { ReactNode, useEffect, useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResizableStudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel?: ReactNode;
  bottomBar?: ReactNode;
}

const STORAGE_KEY = 'studio-layout-sizes';

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
  bottomBar 
}: ResizableStudioLayoutProps) {
  const [sizes, setSizes] = useState<LayoutSizes>(DEFAULT_SIZES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSizes(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading layout sizes:', error);
    }
  }, []);

  const handleLayoutChange = (sizes: number[]) => {
    const newSizes: LayoutSizes = {
      leftWidth: sizes[0] || DEFAULT_SIZES.leftWidth,
      rightWidth: rightPanel ? sizes[2] || DEFAULT_SIZES.rightWidth : 0,
    };
    
    setSizes(newSizes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSizes));
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup 
          direction="horizontal" 
          onLayout={handleLayoutChange}
          className="h-full"
        >
          {/* Left Sidebar */}
          <ResizablePanel 
            defaultSize={sizes.leftWidth} 
            minSize={20}
            maxSize={40}
            className="bg-card/50 backdrop-blur-sm"
          >
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {leftPanel}
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-border transition-colors" />

          {/* Center Canvas */}
          <ResizablePanel defaultSize={rightPanel ? 50 : 75} minSize={30}>
            <div className="h-full bg-background/50">
              {centerPanel}
            </div>
          </ResizablePanel>

          {/* Right Panel (optional) */}
          {rightPanel && (
            <>
              <ResizableHandle withHandle className="bg-border/50 hover:bg-border transition-colors" />
              
              <ResizablePanel 
                defaultSize={sizes.rightWidth}
                minSize={20}
                maxSize={40}
                className="bg-card/50 backdrop-blur-sm"
              >
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    {rightPanel}
                  </div>
                </ScrollArea>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Bottom Bar */}
      {bottomBar && (
        <footer className="border-t border-border/40 bg-card/80 backdrop-blur-sm">
          {bottomBar}
        </footer>
      )}
    </div>
  );
}
