import { useEffect, useRef, useState } from "react";
import type { PaintEffect } from "@/lib/postProcessing";
import type { ArtisticEffect } from "@/lib/artisticEffects";

interface EffectsState {
  /** Rendu final (source si aucun effet actif) */
  imageData: ImageData | null;
  isApplying: boolean;
  error: string | null;
  durationMs: number | null;
}

interface WorkerResult {
  type: "result" | "error";
  requestId: number;
  width?: number;
  height?: number;
  buffer?: ArrayBuffer;
  durationMs?: number;
  error?: string;
}

const DEBOUNCE_MS = 180;

/**
 * Applique les effets peinture + artistiques dans un Web Worker,
 * avec debounce et annulation des requêtes obsolètes.
 * Le thread principal reste fluide même sur de grandes images.
 */
export function useArtisticEffects(
  source: ImageData | null,
  paint: PaintEffect,
  artistic: ArtisticEffect,
): EffectsState {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<EffectsState>({
    imageData: source,
    isApplying: false,
    error: null,
    durationMs: null,
  });

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/artisticEffects.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      const data = e.data;
      if (data.requestId !== requestIdRef.current) return; // résultat obsolète

      if (data.type === "error" || !data.buffer || !data.width || !data.height) {
        setState((prev) => ({
          ...prev,
          isApplying: false,
          error: data.error ?? "Échec de l'application des effets",
        }));
        return;
      }

      setState({
        imageData: new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height),
        isApplying: false,
        error: null,
        durationMs: data.durationMs ?? null,
      });
    };

    worker.onerror = () => {
      setState((prev) => ({ ...prev, isApplying: false, error: "Worker d'effets indisponible" }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const paintKey = `${paint.type}-${paint.intensity}`;
  const artisticKey = `${artistic.type}-${artistic.intensity}`;

  useEffect(() => {
    if (!source) {
      setState({ imageData: null, isApplying: false, error: null, durationMs: null });
      return;
    }

    const noEffect =
      (paint.type === "none" || paint.intensity <= 0) &&
      (artistic.type === "none" || artistic.intensity <= 0);

    if (noEffect) {
      requestIdRef.current += 1; // invalide toute requête en vol
      setState({ imageData: source, isApplying: false, error: null, durationMs: null });
      return;
    }

    setState((prev) => ({ ...prev, isApplying: true, error: null }));

    const timer = window.setTimeout(() => {
      const worker = workerRef.current;
      if (!worker) return;

      const requestId = ++requestIdRef.current;
      const copy = new Uint8ClampedArray(source.data); // copie: la source reste intacte

      worker.postMessage(
        {
          type: "apply",
          requestId,
          width: source.width,
          height: source.height,
          buffer: copy.buffer,
          paint,
          artistic,
        },
        [copy.buffer],
      );
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, paintKey, artisticKey]);

  return state;
}
