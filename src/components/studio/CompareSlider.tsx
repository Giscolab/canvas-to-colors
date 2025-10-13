import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface CompareSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function CompareSlider({ 
  beforeImage, 
  afterImage, 
  beforeLabel = "Avant",
  afterLabel = "Après" 
}: CompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', () => setIsDragging(false));
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', () => setIsDragging(false));

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', () => setIsDragging(false));
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', () => setIsDragging(false));
      };
    }
  }, [isDragging]);

  return (
    <Card className="relative overflow-hidden select-none cursor-ew-resize" ref={containerRef}>
      {/* After Image (background) */}
      <div className="relative w-full h-full">
        <img 
          src={afterImage} 
          alt={afterLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
        <div className="absolute top-4 right-4 px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-medium rounded-full">
          {afterLabel}
        </div>
      </div>

      {/* Before Image (clipped overlay) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={beforeImage} 
          alt={beforeLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
        <div className="absolute top-4 left-4 px-3 py-1 bg-accent/90 text-accent-foreground text-xs font-medium rounded-full">
          {beforeLabel}
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full shadow-glow flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
            <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}
