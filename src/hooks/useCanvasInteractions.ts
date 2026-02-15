import { useEffect, useRef, useState, useCallback, RefObject, useMemo } from "react";

export interface Zone {
  id: number;
  colorIdx: number;
  area: number;
  pixels: Uint32Array;
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
  viewScale?: number;
}

export function useCanvasInteractions({
  canvasRef,
  originalImageData,
  zones = [],
  onZoneSelect,
  onColorSelect,
  labels,
  viewScale = 1,
}: UseCanvasInteractionsProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState<'zone' | 'color'>('zone');
  const [highlightProgress, setHighlightProgress] = useState(0);
  
  const originalImageDataRef = useRef<ImageData | null>(null);
  const highlightAnimationRef = useRef<number | null>(null);
  const zonePathsRef = useRef<Map<number, Path2D>>(new Map());
  const imageBitmapRef = useRef<ImageBitmap | null>(null);

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
  // Optimisé : parcours unique de tous les pixels
  const precomputeZonePaths = useCallback(() => {
    if (!labels || !originalImageDataRef.current) return;
    
    const width = originalImageDataRef.current.width;
    const height = originalImageDataRef.current.height;
    const newPaths = new Map<number, Path2D>();
    
    // Initialiser tous les chemins
    zones.forEach(zone => {
      newPaths.set(zone.id, new Path2D());
    });
    
    // Parcours unique optimisé : chaque pixel visité une seule fois
    const firstPixel = new Map<number, boolean>();
    for (let idx = 0; idx < labels.length; idx++) {
      const zoneId = labels[idx];
      if (zoneId >= 0) {
        const path = newPaths.get(zoneId);
        if (path) {
          const x = idx % width;
          const y = Math.floor(idx / width);
          
          if (!firstPixel.has(zoneId)) {
            path.moveTo(x, y);
            firstPixel.set(zoneId, true);
          } else {
            path.lineTo(x, y);
          }
        }
      }
    }
    
    // Fermer tous les chemins
    newPaths.forEach(path => path.closePath());
    
    zonePathsRef.current = newPaths;
  }, [zones, labels, originalImageData]);

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
    
    // Utiliser ImageBitmap pour un rendu beaucoup plus rapide
    if (imageBitmapRef.current) {
      ctx.drawImage(imageBitmapRef.current, 0, 0);
    } else {
      // Fallback si le bitmap n'est pas encore créé
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalImageDataRef.current.width;
      tempCanvas.height = originalImageDataRef.current.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      tempCtx.putImageData(originalImageDataRef.current, 0, 0);
      
      ctx.drawImage(tempCanvas, 0, 0);
    }

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
      ctx.lineWidth = Math.max(1, 2 / viewScale);
      
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
  }, [canvasRef, selectedZoneId, selectedColorIdx, zonesByColor, zones, highlightProgress, viewScale]);

  // Update ref and create ImageBitmap when originalImageData changes
  useEffect(() => {
    originalImageDataRef.current = originalImageData;
    
    if (originalImageData) {
      // Créer un ImageBitmap pour des performances optimales
      createImageBitmap(originalImageData).then(bitmap => {
        imageBitmapRef.current = bitmap;
        redraw();
      }).catch(err => {
        console.error('Error creating ImageBitmap:', err);
      });
    }
    
    // Cleanup previous bitmap
    return () => {
      if (imageBitmapRef.current) {
        imageBitmapRef.current.close();
        imageBitmapRef.current = null;
      }
    };
  }, [originalImageData, redraw]);

  // Initialize canvas dimensions and scale/offset refs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageData) return;

    // Set canvas dimensions to image dimensions
    canvas.width = originalImageData.width;
    canvas.height = originalImageData.height;

    // Draw the image at native resolution
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.putImageData(originalImageData, 0, 0);
    }
  }, [canvasRef, originalImageData]);

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

  const handleImageClick = useCallback((imgX: number, imgY: number, isCtrlPressed = false) => {
    if (!zones.length || !labels || !originalImageDataRef.current) return;

    const width = originalImageDataRef.current.width;
    const height = originalImageDataRef.current.height;

    if (imgX >= 0 && imgX < width && imgY >= 0 && imgY < height) {
      const idx = imgY * width + imgX;
      const zoneId = labels[idx];

      if (zoneId >= 0) {
        const zone = zones.find(z => z.id === zoneId);
        if (zone) {
          if (isCtrlPressed) {
            if (selectedColorIdx === zone.colorIdx) {
              clearSelection();
            } else {
              selectByColor(zone.colorIdx);
            }
          } else {
            if (selectedZoneId === zoneId && highlightMode === 'zone') {
              clearSelection();
            } else {
              selectByZone(zoneId);
            }
          }
          return;
        }
      }
    }

    clearSelection();
  }, [zones, labels, selectedColorIdx, selectedZoneId, highlightMode, selectByColor, selectByZone, clearSelection]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSelection();
    }
  }, [clearSelection]);

  useEffect(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      if (highlightAnimationRef.current) {
        cancelAnimationFrame(highlightAnimationRef.current);
      }
    };
  }, [handleKeyDown]);

  return {
    selectedZoneId,
    selectedColorIdx,
    highlightMode,
    zonesByColor,
    handleImageClick,
    selectByColor,
    selectByZone,
    clearSelection,
    precomputeZonePaths,
  };
}
