import { useEffect, useRef, useState, useCallback, RefObject } from "react";

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
  labels?: Int32Array;
}

export function useCanvasInteractions({
  canvasRef,
  originalImageData,
  zones = [],
  onZoneSelect,
  labels,
}: UseCanvasInteractionsProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  
  const animationFrameRef = useRef<number>();
  const originalImageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    originalImageDataRef.current = originalImageData;
  }, [originalImageData]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageDataRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.putImageData(originalImageDataRef.current, 0, 0);

    // Draw selected zone highlight
    if (selectedZoneId !== null && zones.length > 0 && labels) {
      const zone = zones.find(z => z.id === selectedZoneId);
      if (zone) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.lineWidth = 3 / scale;

        const width = originalImageDataRef.current.width;
        const height = originalImageDataRef.current.height;

        // Trace contour of selected zone
        ctx.beginPath();
        let started = false;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (labels[idx] === selectedZoneId) {
              if (!started) {
                ctx.moveTo(x, y);
                started = true;
              } else {
                ctx.lineTo(x, y);
              }
            }
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [canvasRef, scale, offset, selectedZoneId, zones, labels]);

  useEffect(() => {
    redraw();
  }, [redraw]);

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

  const handleClick = useCallback((e: MouseEvent) => {
    if (isPanning) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !zones.length || !labels || !originalImageDataRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Transform mouse coords to image coords
    const imgX = Math.floor((mouseX - offset.x) / scale);
    const imgY = Math.floor((mouseY - offset.y) / scale);

    const width = originalImageDataRef.current.width;
    const height = originalImageDataRef.current.height;

    if (imgX >= 0 && imgX < width && imgY >= 0 && imgY < height) {
      const idx = imgY * width + imgX;
      const zoneId = labels[idx];
      
      if (zoneId > 0) {
        const zone = zones.find(z => z.id === zoneId);
        if (zone) {
          setSelectedZoneId(zoneId);
          onZoneSelect?.(zone);
          return;
        }
      }
    }

    // Click outside zones - deselect
    setSelectedZoneId(null);
    onZoneSelect?.(null);
  }, [canvasRef, zones, labels, isPanning, scale, offset, onZoneSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedZoneId(null);
      onZoneSelect?.(null);
    }
  }, [onZoneSelect]);

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
    };
  }, [canvasRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleClick, handleKeyDown]);

  return {
    scale,
    offset,
    selectedZoneId,
    resetTransform: () => {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    },
  };
}
