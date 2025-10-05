import { useEffect, useRef, useState, useCallback, RefObject, useMemo } from "react";

export interface Zone {
  id: number;
  colorIdx: number;
  area: number;
  pixels: number[];
  centroid: { x: number; y: number };
  hex?: string;
  percent?: number;
}

interface UseCanvasInteractionsProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  originalImageData: ImageData | null;
  zones?: Zone[];
  onZoneSelect?: (zone: Zone | null) => void;
  onColorSelect?: (colorIdx: number | null, zones: Zone[] | null) => void;
  labels?: Int32Array;
}

export function useCanvasInteractions({
  canvasRef,
  originalImageData,
  zones = [],
  onZoneSelect,
  onColorSelect,
  labels,
}: UseCanvasInteractionsProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState<'zone' | 'color'>('zone');
  const [highlightProgress, setHighlightProgress] = useState(0);
  
  const animationFrameRef = useRef<number>();
  const originalImageDataRef = useRef<ImageData | null>(null);
  const highlightAnimationRef = useRef<number | null>(null);
  const zonePathsRef = useRef<Map<number, Path2D>>(new Map());

  // Création de la map inverse zonesByColor pour un accès rapide
  const zonesByColor = useMemo(() => {
    const map = new Map<number, Zone[]>();
    zones.forEach(z => {
      if (!map.has(z.colorIdx)) map.set(z.colorIdx, []);
      map.get(z.colorIdx)!.push(z);
    });
    return map;
  }, [zones]);

  // Précalculer les chemins pour chaque zone pour optimiser le rendu
  const precomputeZonePaths = useCallback(() => {
    if (!labels || !originalImageDataRef.current) return;
    
    const width = originalImageDataRef.current.width;
    const height = originalImageDataRef.current.height;
    const newPaths = new Map<number, Path2D>();
    
    zones.forEach(zone => {
      const path = new Path2D();
      let started = false;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (labels[idx] === zone.id) {
            if (!started) {
              path.moveTo(x, y);
              started = true;
            } else {
              path.lineTo(x, y);
            }
          }
        }
      }
      
      if (started) {
        path.closePath();
        newPaths.set(zone.id, path);
      }
    });
    
    zonePathsRef.current = newPaths;
  }, [zones, labels]);

  // Animation de surbrillance progressive
  const startHighlightAnimation = useCallback(() => {
    if (highlightAnimationRef.current) {
      cancelAnimationFrame(highlightAnimationRef.current);
    }
    
    setHighlightProgress(0);
    const startTime = Date.now();
    const duration = 200; // ms
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setHighlightProgress(progress);
      
      if (progress < 1) {
        highlightAnimationRef.current = requestAnimationFrame(animate);
      } else {
        highlightAnimationRef.current = null;
      }
    };
    
    highlightAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageDataRef.current) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Amélioration du rendu : désactiver le lissage pour un rendu plus net
    ctx.imageSmoothingEnabled = false;

    // Clear and reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a temporary canvas to hold the ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImageDataRef.current.width;
    tempCanvas.height = originalImageDataRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(originalImageDataRef.current, 0, 0);
    
    // Apply current scale and offset
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.drawImage(tempCanvas, 0, 0);

    // Déterminer les zones à surligner selon le mode de sélection
    const zonesToHighlight = selectedColorIdx !== null
      ? zonesByColor.get(selectedColorIdx) || []
      : selectedZoneId !== null
        ? zones.find(z => z.id === selectedZoneId) 
          ? [zones.find(z => z.id === selectedZoneId)!] 
          : []
        : [];

    // Draw selected zones highlight
    if (zonesToHighlight.length > 0) {
      // Couleur de surbrillance jaune (plus adaptée à un contexte de peinture)
      const alpha = 0.15 + (0.25 * highlightProgress); // De 0.15 à 0.4
      ctx.fillStyle = `rgba(255, 230, 0, ${alpha})`;
      ctx.strokeStyle = `rgba(255, 200, 0, ${0.6 + 0.4 * highlightProgress})`;
      
      // Largeur de contour adaptative selon le zoom
      ctx.lineWidth = Math.max(1, 2 / scale);
      
      // Effet de lueur pour une meilleure visibilité
      ctx.shadowBlur = 3 + 2 * highlightProgress;
      ctx.shadowColor = 'rgba(255, 200, 0, 0.5)';
      
      // Dessiner chaque zone sélectionnée en utilisant les chemins précalculés
      zonesToHighlight.forEach(zone => {
        const path = zonePathsRef.current.get(zone.id);
        if (path) {
          ctx.fill(path);
          ctx.stroke(path);
        }
      });
      
      // Réinitialiser l'ombre pour ne pas affecter les dessins suivants
      ctx.shadowBlur = 0;
    }
  }, [canvasRef, scale, offset, selectedZoneId, selectedColorIdx, zonesByColor, zones, highlightProgress]);

  // Update ref and trigger redraw when originalImageData changes
  useEffect(() => {
    originalImageDataRef.current = originalImageData;
  }, [originalImageData]);

  // Précalculer les chemins quand les zones ou les labels changent
  useEffect(() => {
    precomputeZonePaths();
  }, [precomputeZonePaths]);

  // Redraw when dependencies change
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Fonction pour sélectionner par couleur (appelée depuis la palette ou Ctrl+clic)
  const selectByColor = useCallback((colorIdx: number) => {
    setSelectedColorIdx(colorIdx);
    setSelectedZoneId(null);
    setHighlightMode('color');
    startHighlightAnimation();
    
    const zonesWithColor = zonesByColor.get(colorIdx) || [];
    onColorSelect?.(colorIdx, zonesWithColor);
  }, [zonesByColor, onColorSelect, startHighlightAnimation]);

  // Fonction pour sélectionner par zone
  const selectByZone = useCallback((zoneId: number) => {
    setSelectedZoneId(zoneId);
    setSelectedColorIdx(null);
    setHighlightMode('zone');
    startHighlightAnimation();
    
    const zone = zones.find(z => z.id === zoneId);
    onZoneSelect?.(zone || null);
  }, [zones, onZoneSelect, startHighlightAnimation]);

  // Fonction pour désélectionner tout
  const clearSelection = useCallback(() => {
    setSelectedZoneId(null);
    setSelectedColorIdx(null);
    onZoneSelect?.(null);
    onColorSelect?.(null, null);
    redraw(); // Forcer un redraw immédiat
  }, [onZoneSelect, onColorSelect, redraw]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.1, scale * delta), 10);

    const scaleFactor = newScale / scale;
    const newOffsetX = mouseX - scaleFactor * (mouseX - offset.x);
    const newOffsetY = mouseY - scaleFactor * (mouseY - offset.y);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [canvasRef, scale, offset]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 0) {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  }, [canvasRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;

    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    setOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastMouse]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // CORRECTION COMPLÈTE DE LA FONCTION handleClick
  const handleClick = useCallback((e: MouseEvent) => {
    if (isPanning) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !zones.length || !labels || !originalImageDataRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Conversion coordonnées écran -> coordonnées image
    const imgX = Math.floor((mouseX - offset.x) / scale);
    const imgY = Math.floor((mouseY - offset.y) / scale);

    const width = originalImageDataRef.current.width;
    const height = originalImageDataRef.current.height;

    if (imgX >= 0 && imgX < width && imgY >= 0 && imgY < height) {
      const idx = imgY * width + imgX;
      const zoneId = labels[idx];
      
      // Vérifier si on a appuyé sur Ctrl/Cmd pour la sélection par couleur
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      
      if (zoneId >= 0) {
        const zone = zones.find(z => z.id === zoneId);
        if (zone) {
          if (isCtrlPressed) {
            // Mode sélection par couleur (Ctrl+clic)
            if (selectedColorIdx === zone.colorIdx) {
              // Si on clique sur la même couleur déjà sélectionnée → désélection
              clearSelection();
            } else {
              // Sélectionner toutes les zones de cette couleur
              selectByColor(zone.colorIdx);
            }
          } else {
            // Mode sélection par zone (clic normal)
            if (selectedZoneId === zoneId && highlightMode === 'zone') {
              // Si on clique sur la même zone déjà sélectionnée → désélection
              clearSelection();
            } else {
              // Sélectionner cette zone spécifique
              selectByZone(zoneId);
            }
          }
          return;
        }
      }
    }

    // Clic hors zone → désélection
    clearSelection();
  }, [canvasRef, zones, labels, isPanning, scale, offset, selectedZoneId, selectedColorIdx, highlightMode, selectByColor, selectByZone, clearSelection]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSelection();
    }
  }, [clearSelection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      
      if (highlightAnimationRef.current) {
        cancelAnimationFrame(highlightAnimationRef.current);
      }
    };
  }, [canvasRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleClick, handleKeyDown]);

  return {
    scale,
    offset,
    selectedZoneId,
    selectedColorIdx,
    highlightMode,
    zonesByColor,
    resetTransform: () => {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    },
    selectByColor,
    selectByZone,
    clearSelection,
    precomputeZonePaths,
  };
}