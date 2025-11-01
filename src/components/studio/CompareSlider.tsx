import { useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";

/**
 * CompareSlider (Figma-like)
 * - Props inchangées
 * - A11y: handle focusable (role="slider"), clavier (←/→, Shift=±5), ARIA min/max/now
 * - Pointer Events unifiés (souris/touch/pen), listeners sans fuite
 * - Tokens only (dark OK)
 */
interface CompareSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  showHandleHint?: boolean;
  width?: number;
  height?: number;
}

export function CompareSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Avant",
  afterLabel = "Après",
  showHandleHint = false,
  width,
  height,
}: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<number>(50); // 0..100
  const [dragging, setDragging] = useState(false);
  const [pointerId, setPointerId] = useState<number | null>(null);

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const positionFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return pos;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = (x / rect.width) * 100;
    return clamp(pct);
  }, [pos]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault(); // Évite le scroll de la page pendant le drag sur mobile
    const id = e.pointerId;
    setPointerId(id);
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(id);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setPos(positionFromClientX(e.clientX));
  }, [dragging, positionFromClientX]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(pointerId as number);
    } catch {}
    setDragging(false);
    setPointerId(null);
  }, [dragging, pointerId]);

  const onContainerPointerDown = useCallback((e: React.PointerEvent) => {
    // cliquer n'importe où repositionne, puis on peut faire glisser
    const newPos = positionFromClientX(e.clientX);
    setPos(newPos);
  }, [positionFromClientX]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    if (e.key === "ArrowLeft") delta = -1;
    if (e.key === "ArrowRight") delta = 1;
    if (delta !== 0) {
      if (e.shiftKey) delta *= 5;
      e.preventDefault();
      setPos((p) => clamp(p + delta));
    }
    if (e.key === "Home") { e.preventDefault(); setPos(0); }
    if (e.key === "End")  { e.preventDefault(); setPos(100); }
    if (e.key === "Enter" || e.key === " ") {
      // reset pratique : centre
      e.preventDefault();
      setPos(50);
    }
  }, []);

  return (
    <Card
      ref={containerRef}
      className="
        relative overflow-hidden select-none
        bg-studio-panel/60 border border-studio-border/40
        min-h-[280px] sm:min-h-[360px]
        rounded-lg shadow-studio-image
      "
      onPointerDown={onContainerPointerDown}
      role="group"
      aria-label="Comparateur avant/après"
    >
      {/* Plan d'alignement : conteneur absolu pour que les deux images s'alignent parfaitement */}
      <div className="absolute inset-0" style={width && height ? { width: `${width}px`, height: `${height}px`, margin: 'auto' } : undefined}>
        {/* AFTER (fond) */}
        <img
          src={afterImage}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium
                        bg-primary/90 text-primary-foreground shadow-sm">
          {afterLabel}
        </div>

        {/* BEFORE (overlay clip) */}
        <div
          className="absolute inset-0 overflow-hidden transition-[clip-path] duration-200 ease-\[cubic-bezier\(0.22,1,0.36,1\)\]
"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          aria-hidden="true"
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        </div>
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium
                        bg-accent/90 text-accent-foreground shadow-sm">
          {beforeLabel}
        </div>

        {/* Handle (barre + bouton) */}
        <div
          className="absolute top-0 bottom-0 z-10 flex items-center justify-center"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        >
          {/* Barre */}
          <div
            className="h-full w-[2px] bg-primary pointer-events-none"
            aria-hidden="true"
          />

          {/* Bouton draggable (focusable) */}
          <div
            ref={handleRef}
            className="
              relative ml-[-1px]
              h-9 w-9 rounded-full bg-primary shadow
              flex items-center justify-center
              outline-none
              ring-offset-background
              focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              cursor-ew-resize
              studio-transition
            "
            role="slider"
            tabIndex={0}
            aria-label="Position du comparateur"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`${Math.round(pos)} pour cent`}
            onKeyDown={onKeyDown}
            onPointerDown={startDrag}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* Icône "grip" minimaliste */}
            <div className="flex gap-0.5" aria-hidden="true">
              <div className="w-0.5 h-4 rounded-full bg-primary-foreground/90" />
              <div className="w-0.5 h-4 rounded-full bg-primary-foreground/90" />
            </div>

            {/* Indicateur d'aide (optionnel) */}
            {showHandleHint && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-studio-panel/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-studio-foreground/70 whitespace-nowrap pointer-events-none">
                Glissez pour comparer
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}