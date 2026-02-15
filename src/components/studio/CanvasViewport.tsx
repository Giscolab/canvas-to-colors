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
    const overlayRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [dpr, setDpr] = useState(() => Math.max(1, window.devicePixelRatio || 1));
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
    const zoomInternalRef = useRef(false);
    const lastZoomRef = useRef(zoomPercent);
    const initialScrollAppliedRef = useRef(false);

    const scale = clampScale(zoomPercent / 100);

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
      container.scrollLeft = initialScroll.left;
      container.scrollTop = initialScroll.top;
      initialScrollAppliedRef.current = true;
    }, [initialScroll]);

    const reportScroll = useCallback(() => {
      if (!scrollRef.current) return;
      onScrollChange?.({
        left: scrollRef.current.scrollLeft,
        top: scrollRef.current.scrollTop
      });
    }, [onScrollChange]);

    const clientToImage = useCallback(
      (clientX: number, clientY: number) => {
        const container = scrollRef.current;
        if (!container || width <= 0 || height <= 0) return null;
        const rect = container.getBoundingClientRect();
        const x = (clientX - rect.left + container.scrollLeft) / scale;
        const y = (clientY - rect.top + container.scrollTop) / scale;
        if (x < 0 || y < 0 || x > width || y > height) return null;
        return { x: Math.floor(x), y: Math.floor(y) };
      },
      [scale, width, height]
    );

    const centerOnScale = useCallback(
      (targetScale: number) => {
        const container = scrollRef.current;
        if (!container || width <= 0 || height <= 0) return;
        const contentWidth = width * targetScale;
        const contentHeight = height * targetScale;
        container.scrollLeft = Math.max(0, (contentWidth - container.clientWidth) / 2);
        container.scrollTop = Math.max(0, (contentHeight - container.clientHeight) / 2);
        reportScroll();
      },
      [height, reportScroll, width]
    );

    const applyZoom = useCallback(
      (targetScale: number, anchor?: {x: number;y: number;}) => {
        const container = scrollRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const anchorX = anchor?.x ?? rect.width / 2;
        const anchorY = anchor?.y ?? rect.height / 2;
        const imageX = (container.scrollLeft + anchorX) / scale;
        const imageY = (container.scrollTop + anchorY) / scale;
        const nextScale = clampScale(targetScale);
        const nextScrollLeft = imageX * nextScale - anchorX;
        const nextScrollTop = imageY * nextScale - anchorY;

        zoomInternalRef.current = true;
        onZoomChange(Math.round(nextScale * 100));

        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          scrollRef.current.scrollLeft = nextScrollLeft;
          scrollRef.current.scrollTop = nextScrollTop;
          reportScroll();
        });
      },
      [onZoomChange, reportScroll, scale]
    );

    const zoomIn = useCallback(() => applyZoom(scale + 0.1), [applyZoom, scale]);
    const zoomOut = useCallback(() => applyZoom(scale - 0.1), [applyZoom, scale]);

    const zoomTo = useCallback(
      (percent: number, anchor?: {x: number;y: number;}) => {
        applyZoom(percent / 100, anchor);
      },
      [applyZoom]
    );

    const reset = useCallback(() => {
      applyZoom(1);
      requestAnimationFrame(() => centerOnScale(1));
    }, [applyZoom, centerOnScale]);

    const fitToScreen = useCallback(() => {
      if (width <= 0 || height <= 0) return;
      const nextScale = clampScale(
        Math.min(
          containerSize.width / width,
          containerSize.height / height
        )
      );
      applyZoom(nextScale);
      requestAnimationFrame(() => centerOnScale(nextScale));
    }, [applyZoom, centerOnScale, containerSize.height, containerSize.width, height, width]);

    const center = useCallback(() => centerOnScale(scale), [centerOnScale, scale]);

    useEffect(() => {
      if (zoomInternalRef.current) {
        zoomInternalRef.current = false;
        lastZoomRef.current = zoomPercent;
        return;
      }
      if (zoomPercent !== lastZoomRef.current) {
        lastZoomRef.current = zoomPercent;

      }
    }, [centerOnScale, scale, zoomPercent]);

    const handleWheel = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        event.preventDefault();
        const rect = scrollRef.current.getBoundingClientRect();
        const anchor = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        const direction = event.deltaY > 0 ? 0.1 : -0.1;
        applyZoom(scale + direction, anchor);

      },
      [applyZoom, scale]
    );

    const handleMouseDown = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!panTool || event.button !== 0 || !scrollRef.current) return;
        isPanningRef.current = true;
        panStartRef.current = {
          x: event.clientX,
          y: event.clientY,
          left: scrollRef.current.scrollLeft,
          top: scrollRef.current.scrollTop
        };
      },
      [panTool]
    );

    const handleMouseMove = useCallback((event: MouseEvent) => {
      if (!isPanningRef.current || !scrollRef.current) return;
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      scrollRef.current.scrollLeft = panStartRef.current.left - dx;
      scrollRef.current.scrollTop = panStartRef.current.top - dy;
      reportScroll();
    }, [reportScroll]);

    const handleMouseUp = useCallback(() => {
      isPanningRef.current = false;
    }, []);

    useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [handleMouseMove, handleMouseUp]);

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
            className={cn("absolute inset-0 overflow-auto bg-studio-canvas px-[100px]",

            panTool ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onScroll={reportScroll}>

            <div
              className="relative"
              style={{
                width: width > 0 ? `${width * scale}px` : "100%",
                height: height > 0 ? `${height * scale}px` : "100%"
              }}>

              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  width: width || "auto",
                  height: height || "auto",
                  transform: `scale(${scale})`
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