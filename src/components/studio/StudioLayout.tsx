import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel?: ReactNode;
  bottomBar?: ReactNode;
}

export function StudioLayout({ leftPanel, centerPanel, rightPanel, bottomBar }: StudioLayoutProps) {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[380px] border-r border-border/40 bg-card/50 backdrop-blur-sm">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {leftPanel}
            </div>
          </ScrollArea>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background/50">
          {centerPanel}
        </main>

        {/* Right Panel (optional) */}
        {rightPanel && (
          <aside className="w-[380px] border-l border-border/40 bg-card/50 backdrop-blur-sm">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {rightPanel}
              </div>
            </ScrollArea>
          </aside>
        )}
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
