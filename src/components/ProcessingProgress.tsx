// src/components/ProcessingProgress.tsx
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProcessingProgressProps {
  stage: string;        // ex: "Segmentation…"
  progress: number;     // 0..100 (<=0 => indéterminé)
  isVisible: boolean;
}

/**
 * Barre de progression en haut de l’app (sous la TopBar 64px).
 * - Déterminée si progress > 0, sinon animée (indéterminée)
 * - A11y: role="progressbar", aria-live
 * - Tokens only (dark/light OK)
 */
export function ProcessingProgress({ stage, progress, isVisible }: ProcessingProgressProps) {
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !liveRef.current) return;
    liveRef.current.textContent =
      progress > 0 ? `${stage} — ${Math.round(progress)}%` : stage || "Traitement en cours";
  }, [isVisible, stage, progress]);

  if (!isVisible) return null;

  const clamped = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  const indeterminate = !(clamped > 0);

  return (
    <div className="sticky top-16 z-40">
      {/* Barre fine */}
      <div className="w-full h-1.5 bg-muted/60 overflow-hidden border-b border-border/60">
        {indeterminate ? (
          <div
            className="relative h-full"
            role="progressbar"
            aria-busy="true"
            aria-label="Progression du traitement"
          >
            <div className="absolute inset-y-0 w-1/3 bg-accent animate-[pbn-shimmer_1.2s_ease-in-out_infinite]" />
          </div>
        ) : (
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${Math.round(clamped)}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped)}
            aria-label="Progression du traitement"
          />
        )}
      </div>

      {/* Bandeau d’état (discret) */}
      <div className={cn(
        "px-3 py-1 bg-card/90 backdrop-blur border-b border-border/60",
        "text-xs text-muted-foreground"
      )}>
        <span className="tabular-nums">
          {indeterminate ? (stage || "Initialisation…") : `${stage} — ${Math.round(clamped)}%`}
        </span>
      </div>

      {/* Zone live ARIA */}
      <div ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      <style>{`
        @keyframes pbn-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
