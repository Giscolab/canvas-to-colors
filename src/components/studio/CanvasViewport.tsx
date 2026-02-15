import {
  createContext,
  forwardRef,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState } from
"react";
import { cn } from "@/lib/utils";

type ScrollState = {left: number;top: number;};

export interface CanvasViewportHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (percent: number, anchor?: {x: number;y: number;}) => void;
  reset: () => void;
  fitToScreen: () => void;
  center: () => void;
  clientToImage: (clientX: number, clientY: number) => {x: number;y: number;} | null;
}

export interface CanvasViewportProps {
  width: number;
  height: number;
  zoomPercent: number;
  onZoomChange: (percent: number) => void;
  panTool?: boolean;
  initialScroll?: ScrollState;
  onScrollChange?: (state: ScrollState) => void;
  className?: string;
  children: ReactNode;
}

interface CanvasViewportContextValue {
  scale: number;
  dpr: number;
  imageWidth: number;
  imageHeight: number;
  containerRef: RefObject<HTMLDivElement>;
  overlayRef: RefObject<HTMLDivElement>;
  wrapperRef: RefObject<HTMLDivElement>;
  clientToImage: (clientX: number, clientY: number) => {x: number;y: number;} | null;
}

const CanvasViewportContext = createContext<CanvasViewportContextValue | null>(null);

export function useCanvasViewport() {
  const resolved = useContext(CanvasViewportContext);
  if (!resolved) {
    throw new Error("useCanvasViewport must be used within CanvasViewport");
  }
  return resolved;
}

const clampScale = (value: number) => Math.min(8, Math.max(0.1, value));

export const CanvasViewport = forwardRef<CanvasViewportHandle, CanvasViewportProps>(
  (
  {
    width,
    height,
    zoomPercent,
    onZoomChange,
    panTool = false,
    initialScroll,
    onScrollChange,
    className,
    children
  },
  ref) =>
  {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const imageFrameRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [dpr, setDpr] = useState(() => Math.max(1, window.devicePixelRatio || 1));
    const zoomInternalRef = useRef(false);
    const lastZoomRef = useRef(zoomPercent);
    const initialScrollAppliedRef = useRef(false);

    const requestedScale = clampScale(zoomPercent / 100);
    const fitScale = useMemo(() => {
      if (width <= 0 || height <= 0 || containerSize.width <= 0 || containerSize.height <= 0) {
        return 1;
      }
      return Math.min(containerSize.width / width, containerSize.height / height);
    }, [containerSize.height, containerSize.width, height, width]);
    const scale = Math.max(0.01, Math.min(requestedScale, fitScale));

    useEffect(() => {
      const handleResize = () => setDpr(Math.max(1, window.devicePixelRatio || 1));
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
      if (!scrollRef.current) return;
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      ro.observe(scrollRef.current);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const container = scrollRef.current;
      if (!container || !initialScroll || initialScrollAppliedRef.current) return;
      initialScrollAppliedRef.current = true;
    }, [initialScroll]);

    const reportScroll = useCallback(() => {
      onScrollChange?.({ left: 0, top: 0 });
    }, [onScrollChange]);

    const clientToImage = useCallback(
      (clientX: number, clientY: number) => {
        const frame = imageFrameRef.current;
        if (!frame || width <= 0 || height <= 0) return null;
        const rect = frame.getBoundingClientRect();
        const x = (clientX - rect.left) / scale;
        const y = (clientY - rect.top) / scale;
        if (x < 0 || y < 0 || x > width || y > height) return null;
        return { x: Math.floor(x), y: Math.floor(y) };
      },
      [scale, width, height]
    );

    const applyZoom = useCallback(
      (targetScale: number) => {
        const nextScale = Math.max(0.01, Math.min(clampScale(targetScale), fitScale));
        zoomInternalRef.current = true;
        onZoomChange(Math.round(nextScale * 100));
        reportScroll();
      },
      [fitScale, onZoomChange, reportScroll]
    );

    const zoomIn = useCallback(() => applyZoom(scale + 0.1), [applyZoom, scale]);
    const zoomOut = useCallback(() => applyZoom(scale - 0.1), [applyZoom, scale]);

    const zoomTo = useCallback(
      (percent: number) => {
        applyZoom(percent / 100);
      },
      [applyZoom]
    );

    const reset = useCallback(() => {
      applyZoom(1);
    }, [applyZoom]);

    const fitToScreen = useCallback(() => {
      if (width <= 0 || height <= 0) return;
      const nextScale = Math.max(0.01, Math.min(8,
        Math.min(
          containerSize.width / width,
          containerSize.height / height
        )
      ));
      applyZoom(nextScale);
    }, [applyZoom, containerSize.height, containerSize.width, height, width]);

    const center = useCallback(() => reportScroll(), [reportScroll]);

    useEffect(() => {
      if (zoomInternalRef.current) {
        zoomInternalRef.current = false;
        lastZoomRef.current = zoomPercent;
        return;
      }
      if (zoomPercent !== lastZoomRef.current) {
        lastZoomRef.current = zoomPercent;

      }
    }, [scale, zoomPercent]);

    const handleWheel = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? 0.1 : -0.1;
        applyZoom(scale + direction);

      },
      [applyZoom, scale]
    );

    const handleMouseDown = useCallback(() => {}, []);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn,
        zoomOut,
        zoomTo,
        reset,
        fitToScreen,
        center,
        clientToImage
      }),
      [center, clientToImage, fitToScreen, reset, zoomIn, zoomOut, zoomTo]
    );

    const contextValue = useMemo(
      () => ({
        scale,
        dpr,
        imageWidth: width,
        imageHeight: height,
        containerRef: scrollRef,
        overlayRef,
        wrapperRef,
        clientToImage
      }),
      [clientToImage, dpr, height, scale, width]
    );

    return (
      <CanvasViewportContext.Provider value={contextValue}>
        <div ref={wrapperRef} className={cn("relative h-full w-full", className)}>
          <div
            ref={scrollRef}
            className={cn("absolute inset-0 overflow-hidden bg-studio-canvas",

            panTool ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onScroll={reportScroll}>

            <div className="absolute inset-0 flex items-center justify-center">
              <div
                ref={imageFrameRef}
                className="relative"
                style={{
                  width: width > 0 ? `${width * scale}px` : "100%",
                  height: height > 0 ? `${height * scale}px` : "100%"
                }}>

                {children}
              </div>
            </div>
          </div>
          <div ref={overlayRef} className="pointer-events-none absolute inset-0" />
        </div>
      </CanvasViewportContext.Provider>);

  }
);

CanvasViewport.displayName = "CanvasViewport";
