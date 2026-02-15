import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Settings, HelpCircle, User } from "lucide-react";

/**
 * StudioShell
 * --------
 * Cadre visuel global façon Figma :
 * - Header supérieur (titre projet + actions)
 * - Contenu central (studio complet)
 * - Footer (status bar)
 * 
 * → Ne modifie pas le StudioLayout : il l’encapsule.
 */
interface StudioShellProps {
  projectName?: string;
  children: ReactNode;
  status?: "Ready" | "Processing" | "Error";
  zoomPercent?: number;
  resolution?: string;
  className?: string;
}

export function StudioShell({
  projectName = "PaintByNumbers Studio",
  children,
  status = "Ready",
  zoomPercent = 100,
  resolution = "1920×1080",
  className,
}: StudioShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-studio-workspace text-studio-foreground",
        "font-sans select-none",
        className
      )}
    >
      {/* ===== HEADER ===== */}
      <header className="h-10 flex items-center justify-between bg-studio-panel-header/80 border-b border-studio-border/50 backdrop-blur-sm px-4">
        {/* Left: Project title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-studio-accent-red"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-studio-accent-yellow"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-studio-accent-green"></div>
          </div>
          <Separator orientation="vertical" className="h-4 bg-studio-border/40" />
          <span className="text-sm font-medium text-studio-foreground/90 tracking-wide">
            {projectName}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 text-studio-foreground/70">
          <button className="hover:text-studio-foreground transition-colors" aria-label="Help">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button className="hover:text-studio-foreground transition-colors" aria-label="Settings">
            <Settings className="w-4 h-4" />
          </button>
          <Separator orientation="vertical" className="h-4 bg-studio-border/40" />
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full bg-studio-panel border border-studio-border/40 hover:bg-studio-hover transition-colors"
            aria-label="User profile"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* ===== FOOTER / STATUS BAR ===== */}
      <footer className="h-8 flex items-center justify-between bg-studio-status-bar border-t border-studio-border/40 backdrop-blur-sm px-4 text-xs text-studio-foreground/70">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                status === "Ready"
                  ? "bg-studio-accent-green"
                  : status === "Processing"
                  ? "bg-studio-accent-yellow"
                  : "bg-studio-accent-red"
              )}
            ></div>
            <span>{status}</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-studio-border/40" />
          <span>{resolution}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Zoom</span>
          <span className="tabular-nums">{zoomPercent}%</span>
        </div>
      </footer>
    </div>
  );
}
