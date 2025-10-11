import { useState, useEffect } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

export const useWindowSize = (): WindowSize | undefined => {
  const [windowSize, setWindowSize] = useState<WindowSize | undefined>(
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : undefined
  );

  useEffect(() => {
    let rafId: number;
    
    const handleResize = () => {
      // Utiliser requestAnimationFrame pour limiter les updates
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      });
    };

    // Écouter resize et orientationchange pour mobile
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Définir la taille initiale
    handleResize();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return windowSize;
};
