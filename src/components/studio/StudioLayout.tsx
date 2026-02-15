import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface StudioImageInfo {
  width?: number | null;
  height?: number | null;
  zoomPercent?: number | null;
  colorSpace?: string | null;
  bitDepth?: number | null;
}

interface StudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel?: ReactNode;
  bottomBar?: ReactNode;
  imageInfo?: StudioImageInfo;
  className?: string;
}

export function StudioLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomBar,
  imageInfo,
  className,
}: StudioLayoutProps) {
  const hasDimensions = Boolean(imageInfo?.width && imageInfo?.height);
  const zoomPercent =
    typeof imageInfo?.zoomPercent === "number"
      ? Math.round(imageInfo.zoomPercent)
      : null;
  const colorSpace = imageInfo?.colorSpace ?? "sRGB";
  const bitDepth = imageInfo?.bitDepth ?? 8;

  return (
<div
  className={cn(
    "fixed inset-x-0 bottom-0 top-16 flex flex-col bg-studio-workspace text-studio-foreground",
    className
  )}
>

      {/* Layout principal : 3 colonnes fixes */}
      <div className="flex flex-1 overflow-hidden">
        {/* --- Panneau gauche --- */}
        <aside className="w-[500px] bg-studio-panel border-r border-studio-border/60 flex flex-col">
          <ScrollArea className="flex-1 overflow-auto p-2 pt-12">{leftPanel}</ScrollArea>
        </aside>

        {/* --- Zone centrale --- */}
        <main className="flex-1 flex flex-col bg-studio-canvas overflow-hidden">
          <div className="h-8 bg-studio-canvas-header border-b border-studio-border/40 flex items-center justify-between px-3 text-xs text-studio-foreground/70">

          </div>
          <div className="flex-1 overflow-auto relative">
            <div className="absolute inset-0 bg-studio-canvas-pattern" />
            <div className="absolute inset-0 flex items-center justify-center">
              {centerPanel}
            </div>
          </div>
        </main>

        {/* --- Panneau droit (optionnel) --- */}
        {rightPanel && (
          <aside className="w-[500px] bg-studio-panel border-l border-studio-border/60 flex flex-col">
            <ScrollArea className="flex-1 overflow-auto p-2 pt-12">{rightPanel}</ScrollArea>
          </aside>
        )}
      </div>
 {/* --- Barre du bas fixe --- */}
{(bottomBar || imageInfo) && (
  <footer className="h-8 bg-studio-status-bar/85 border-t border-studio-border/60 flex items-center justify-between px-3 text-xs text-studio-foreground/70 shrink-0">
    
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-studio-accent-green" />
        <span>Ready</span>
      </div>

      <Separator orientation="vertical" className="h-4 bg-studio-border/40" />

      <span>{hasDimensions ? `${imageInfo?.width} × ${imageInfo?.height}` : "—"}</span>

      <Separator orientation="vertical" className="h-4 bg-studio-border/40" />

      <span>{`${colorSpace} / ${bitDepth} bits`}</span>
    </div>

    <div className="flex items-center gap-3">
      {bottomBar}
      {bottomBar && <Separator orientation="vertical" className="h-4 bg-studio-border/40" />}
      <span>Zoom: {zoomPercent !== null ? `${zoomPercent}%` : "—"}</span>
    </div>

  </footer>
)}

    </div>
  );
}
