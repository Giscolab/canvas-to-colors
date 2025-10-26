import { ReactNode, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface StudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel?: ReactNode;
  bottomBar?: ReactNode;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
  className?: string;
}

export function StudioLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomBar,
  leftPanelWidth = 25,
  rightPanelWidth = 25,
  className,
}: StudioLayoutProps) {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "h-[calc(100vh-4rem)] flex flex-col bg-studio-workspace text-studio-foreground studio-transition",
        className
      )}
      aria-label="Studio Layout"
    >
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT SIDEBAR */}
        <ResizablePanel
          defaultSize={leftPanelWidth}
          minSize={20}
          maxSize={40}
          collapsible
          onCollapse={() => setIsLeftPanelCollapsed(true)}
          onExpand={() => setIsLeftPanelCollapsed(false)}
          className={cn(
            "bg-studio-panel border-r border-studio-border/60 backdrop-blur-md shadow-studio-panel-right transition-all duration-200"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="h-8 bg-studio-panel-header border-b border-studio-border/40 flex items-center px-3">
              {/* traffic light */}
              <div className="flex items-center gap-2 mr-auto">
                <div className="w-2 h-2 rounded-full bg-studio-accent-red" />
                <div className="w-2 h-2 rounded-full bg-studio-accent-yellow" />
                <div className="w-2 h-2 rounded-full bg-studio-accent-green" />
              </div>
              <button
                className="ml-auto w-4 h-4 flex items-center justify-center text-studio-foreground/60 hover:text-studio-accent-blue focus-visible:ring-2 focus-visible:ring-studio-accent-blue rounded-sm transition-all"
                aria-label={
                  isLeftPanelCollapsed
                    ? "Déplier le panneau gauche"
                    : "Replier le panneau gauche"
                }
                onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 1L2 4L6 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">{leftPanel}</div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        {/* HANDLE */}
        <ResizableHandle
          withHandle
          className="bg-studio-border/40 hover:bg-studio-accent-blue/60 transition-colors duration-200 w-[1.5px]"
        />

        {/* CENTER / CANVAS */}
        <ResizablePanel
          defaultSize={rightPanel ? 50 : 75}
          minSize={30}
          className="flex flex-col bg-studio-canvas"
        >
          {/* Canvas header */}
          <div className="h-8 bg-studio-canvas-header border-b border-studio-border/40 flex items-center px-3 justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-studio-accent-blue" />
              <span className="text-xs text-studio-foreground/70 font-medium">
                Canvas
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button className="px-2 py-0.5 text-xs rounded hover:bg-studio-hover text-studio-foreground/70 transition-all">
                100%
              </button>
              <button className="px-2 py-0.5 text-xs rounded hover:bg-studio-hover text-studio-foreground/70 transition-all">
                Fit
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button className="w-6 h-6 flex items-center justify-center text-studio-foreground/60 hover:text-studio-accent-blue hover:bg-studio-hover rounded transition-all">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 4.5L6 2L10 4.5M2 7.5L6 10L10 7.5"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button className="w-6 h-6 flex items-center justify-center text-studio-foreground/60 hover:text-studio-accent-blue hover:bg-studio-hover rounded transition-all">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 2L2 4M8 2L10 4M2 8L4 10M10 8L8 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-studio-canvas-pattern" />
            <div className="absolute inset-0 flex items-center justify-center">
              {centerPanel}
            </div>
          </div>
        </ResizablePanel>

        {/* RIGHT PANEL */}
        {rightPanel && (
          <>
            <ResizableHandle
              withHandle
              className="bg-studio-border/40 hover:bg-studio-accent-blue/60 transition-colors duration-200 w-[1.5px]"
            />

            <ResizablePanel
              defaultSize={rightPanelWidth}
              minSize={20}
              maxSize={40}
              collapsible
              onCollapse={() => setIsRightPanelCollapsed(true)}
              onExpand={() => setIsRightPanelCollapsed(false)}
              className={cn(
                "bg-studio-panel border-l border-studio-border/60 backdrop-blur-md shadow-studio-panel-left transition-all duration-200"
              )}
            >
              <div className="h-full flex flex-col">
                <div className="h-8 bg-studio-panel-header border-b border-studio-border/40 flex items-center px-3">
                  <div className="flex items-center gap-2 mr-auto">
                    <div className="w-2 h-2 rounded-full bg-studio-accent-red" />
                    <div className="w-2 h-2 rounded-full bg-studio-accent-yellow" />
                    <div className="w-2 h-2 rounded-full bg-studio-accent-green" />
                  </div>
                  <button
                    className="ml-auto w-4 h-4 flex items-center justify-center text-studio-foreground/60 hover:text-studio-accent-blue focus-visible:ring-2 focus-visible:ring-studio-accent-blue rounded-sm transition-all"
                    aria-label={
                      isRightPanelCollapsed
                        ? "Déplier le panneau droit"
                        : "Replier le panneau droit"
                    }
                    onClick={() =>
                      setIsRightPanelCollapsed(!isRightPanelCollapsed)
                    }
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 1L6 4L2 7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">{rightPanel}</div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* BOTTOM BAR */}
      {bottomBar && (
        <footer
          className="h-8 bg-studio-status-bar/85 border-t border-studio-border/60 backdrop-blur-md flex items-center px-3 text-xs text-studio-foreground/70 justify-between studio-transition"
          aria-label="Barre d’état du studio"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-studio-accent-green" />
              <span>Ready</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-studio-border/40" />
            <span>1920 × 1080</span>
            <Separator orientation="vertical" className="h-4 bg-studio-border/40" />
            <span>RGB / 8</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Zoom:</span>
            <button className="px-2 py-0.5 text-xs rounded hover:bg-studio-hover text-studio-foreground/70 transition-all">
              100%
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
