import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Zone } from "@/lib/imageProcessing";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InspectionOverlayProps {
  imageData: ImageData | null;
  zones: Zone[];
  palette: string[];
  labels?: Int32Array;
  width: number;   // dimensions intrinsèques du rendu (px)
  height: number;
}

/**
 * InspectionOverlay (Figma-like)
 * - Fit object-contain + centrage
 * - HiDPI crisp : offscreen canvas + dpr scaling
 * - Hit test correct avec redimensionnement
 * - Surbrillance de la zone sélectionnée (mask offscreen)
 * - Tooltip tokens only
 */
export function InspectionOverlay({
  imageData,
  zones,
  palette,
  labels,
  width,
  height,
}: InspectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Taille affichée (après fit) et offsets pour centrage
  const [layout, setLayout] = useState({
    cw: 0,        // container width
    ch: 0,        // container height
    drawW: 0,     // drawn width (fit)
    drawH: 0,     // drawn height (fit)
    offX: 0,      // left offset (centering)
    offY: 0,      // top offset (centering)
    dpr: 1,
  });

  // Interaction
  const [mouseClient, setMouseClient] = useState<{ x: number; y: number } | null>(null);
  const [mouseImg, setMouseImg] = useState<{ x: number; y: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  // Cache offscreen de l'image source (pour dessiner net à n'importe quelle taille)
  const offscreen = useMemo(() => {
    if (!imageData) return null;
    const c = document.createElement("canvas");
    c.width = imageData.width;
    c.height = imageData.height;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(imageData, 0, 0);
    return c;
  }, [imageData]);

  // Masque de surbrillance (généré à la première sélection ou changement de zone)
  const [highlightCanvas, setHighlightCanvas] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!labels || !palette || selectedZone == null) {
      setHighlightCanvas(null);
      return;
    }
    // Génération du mask RGBA depuis labels
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const img = ctx.createImageData(width, height);
    const data = img.data;

    // Couleur = couleur de la zone (ou fallback blanc)
    const zone = zones.find((z) => z.id === selectedZone);
    const colorHex = zone ? palette[zone.colorIdx] : "#ffffff";
    const { r, g, b } = hexToRgb(colorHex);

    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === selectedZone) {
        const j = i * 4;
        data[j] = r;
        data[j + 1] = g;
        data[j + 2] = b;
        data[j + 3] = 90; // alpha ~35%
				if (Math.random() < 0.01) data[j + 3] = 110;
      }
    }
    ctx.putImageData(img, 0, 0);
    setHighlightCanvas(c);
  }, [labels, palette, zones, selectedZone, width, height]);

  // Recalcule le fit object-contain + HiDPI sur resize
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = containerRef.current;
      const cnv = canvasRef.current;
      if (!el || !cnv) return;

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const cw = el.clientWidth;
      const ch = el.clientHeight;

      if (cw <= 0 || ch <= 0 || width <= 0 || height <= 0) return;

      // Fit object-contain
      const scale = Math.min(cw / width, ch / height);
      const drawW = Math.max(1, Math.floor(width * scale));
      const drawH = Math.max(1, Math.floor(height * scale));
      const offX = Math.floor((cw - drawW) / 2);
      const offY = Math.floor((ch - drawH) / 2);

      // Canvas device pixels
      cnv.width = Math.max(1, Math.floor(cw * dpr));
      cnv.height = Math.max(1, Math.floor(ch * dpr));
      cnv.style.width = `${cw}px`;
      cnv.style.height = `${ch}px`;

      setLayout({ cw, ch, drawW, drawH, offX, offY, dpr });
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [width, height]);

  // Dessin
  const draw = useCallback(() => {
    const cnv = canvasRef.current;
    const base = offscreen;
    if (!cnv || !base) return;
    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const { drawW, drawH, offX, offY, dpr, cw, ch } = layout;
    if (cw === 0 || ch === 0 || drawW === 0 || drawH === 0) return;

    // Clear
    ctx.clearRect(0, 0, cnv.width, cnv.height);

    // Dessine l'image source (offscreen -> display)
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      base,
      0, 0, width, height,
      Math.floor(offX * dpr),
      Math.floor(offY * dpr),
      Math.floor(drawW * dpr),
      Math.floor(drawH * dpr)
    );

    // Surbrillance (si sélection)
    if (highlightCanvas) {
      ctx.drawImage(
        highlightCanvas,
        0, 0, width, height,
        Math.floor(offX * dpr),
        Math.floor(offY * dpr),
        Math.floor(drawW * dpr),
        Math.floor(drawH * dpr)
      );
    }

    // Curseur "loupe" minimaliste (optionnel)
    if (mouseImg && pointInDraw(mouseClient, layout)) {
      ctx.save();
      const radius = Math.max(8, Math.floor(6 * dpr));
      ctx.beginPath();
      ctx.arc(
        Math.floor((offX + mouseImg.x * (drawW / width)) * dpr),
        Math.floor((offY + mouseImg.y * (drawH / height)) * dpr),
        radius,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = Math.max(1, Math.floor(1.5 * dpr));
      ctx.stroke();
      ctx.restore();
    }
  }, [offscreen, highlightCanvas, layout, width, height, mouseImg, mouseClient]);

  // Redraw on deps
  useEffect(() => {
    draw();
  }, [draw]);

  // Conversion coordonnées : client -> image pixels
  const clientToImage = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const { drawW, drawH, offX, offY, cw, ch } = layout;
      if (cw === 0 || ch === 0) return null;

      const xIn = clientX - rect.left - offX;
      const yIn = clientY - rect.top - offY;
      if (xIn < 0 || yIn < 0 || xIn > drawW || yIn > drawH) return null;

      const scaleX = width / drawW;
      const scaleY = height / drawH;
      const x = Math.floor(xIn * scaleX);
      const y = Math.floor(yIn * scaleY);
      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      return { x, y, within: true as const };
    },
    [layout, width, height]
  );

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = clientToImage(e.clientX, e.clientY);
    setMouseClient({ x: e.clientX, y: e.clientY });
    if (!pt || !labels) {
      setMouseImg(null);
      return;
    }
    setMouseImg({ x: pt.x, y: pt.y });
  };

  const handleLeave = () => {
    setMouseClient(null);
    setMouseImg(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!labels) return;
    const pt = clientToImage(e.clientX, e.clientY);
    if (!pt) return;
    const idx = pt.y * width + pt.x;
    const zoneId = labels[idx];
    setSelectedZone((z) => (z === zoneId ? null : zoneId));
  };

  // Infos zone sous la souris
  const hoverInfo = useMemo(() => {
    if (!mouseImg || !labels) return null;
    const zid = labels[mouseImg.y * width + mouseImg.x];
    const z = zones.find((zz) => zz.id === zid);
    if (!z) return null;
    const color = palette[z.colorIdx] || "#000000";
    return {
      zoneId: z.id,
      colorIdx: z.colorIdx,
      color,
      area: z.area,
    };
  }, [mouseImg, labels, zones, palette, width]);

  // Placement tooltip (dans le container, pas en pixels image)
  const tooltipPos = useMemo(() => {
    if (!mouseClient || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    // position locale au container
    const localX = mouseClient.x - rect.left;
    const localY = mouseClient.y - rect.top;
    const TW = 200; // largeur max estimée
    const TH = 120; // hauteur estimée
    const left = clamp(localX + 12, 8, Math.max(8, rect.width - TW - 8));
    const top = clamp(localY - TH - 8, 8, Math.max(8, rect.height - TH - 8));
    return { left, top };
  }, [mouseClient]);

  if (!imageData) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-studio-canvas-pattern overflow-hidden rounded-md shadow-studio-image"
      role="img"
      aria-label="Aperçu numéroté avec inspection des zones"
    >
<canvas
  ref={canvasRef}
  className={cn(
    "absolute inset-0 w-full h-full outline-none studio-transition studio-image-container",
    selectedZone ? "cursor-pointer" : "cursor-crosshair"
  )}
  onMouseMove={handleMove}
  onMouseLeave={handleLeave}
  onClick={handleClick}
/>


      {/* Tooltip */}
      {hoverInfo && tooltipPos && (
<div
  className="absolute z-30 p-3 rounded-md shadow-studio-panel-right bg-studio-panel/85 backdrop-blur-md border border-studio-border/50 text-xs space-y-1 pointer-events-none studio-fade-in"
  style={{ left: tooltipPos.left, top: tooltipPos.top, width: 200 }}
  aria-live="polite"
>

          <div className="flex items-center gap-2">
            <Maximize2 className="w-3 h-3 text-studio-foreground/60" aria-hidden="true" />
            <span className="font-medium text-studio-foreground">Zone #{hoverInfo.zoneId}</span>
            {selectedZone === hoverInfo.zoneId && (
              <span className="ml-auto studio-status-badge studio-status-badge--success text-[10px]">✓ Sélectionnée</span>

            )}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-studio-border shadow-inner"
              style={{ backgroundColor: hoverInfo.color, transition: 'background-color 0.2s ease' }}
            />
            <span className="text-studio-foreground/80 font-mono">{hoverInfo.color}</span>
          </div>
          <div className="text-studio-foreground/70">Couleur #{hoverInfo.colorIdx + 1}</div>
          <div className="text-studio-foreground/70">
            Surface: {hoverInfo.area.toLocaleString()}px²
          </div>
          <div className="text-[10px] text-studio-foreground/50 border-t border-studio-border/40 pt-1 mt-1 font-mono">
            Cliquez pour sélectionner
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- helpers ----------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function pointInDraw(
  mouse: { x: number; y: number } | null,
  layout: { offX: number; offY: number; drawW: number; drawH: number; cw: number; ch: number }
) {
  if (!mouse) return false;
  const { offX, offY, drawW, drawH, cw, ch } = layout;
  if (cw === 0 || ch === 0) return false;
  // Ici mouse est en coordonnées client; on l'emploie juste pour désactiver le halo hors zone
  // (le test précis se fait déjà via clientToImage)
  return true && drawW > 0 && drawH > 0 && offX >= 0 && offY >= 0;
}