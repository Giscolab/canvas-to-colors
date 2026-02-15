import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BruteSignalReport, SpectralHeatmap } from "@/lib/bruteSignalAnalyzer";

interface SignalAnalysisSectionProps {
  report: BruteSignalReport;
}

const CHANNEL_NAMES: Record<string, string> = {
  channel_0: "R (Rouge)",
  channel_1: "G (Vert)",
  channel_2: "B (Bleu)",
};

const CHANNEL_COLORS: Record<string, string> = {
  channel_0: "hsl(0 70% 55%)",
  channel_1: "hsl(120 55% 45%)",
  channel_2: "hsl(220 70% 55%)",
};

const CORR_LABELS: Record<string, string> = {
  ch_0_vs_1: "R ↔ G",
  ch_0_vs_2: "R ↔ B",
  ch_1_vs_2: "G ↔ B",
};

function fmt(v: number, decimals = 2): string {
  return v.toFixed(decimals);
}

export function SignalAnalysisSection({ report }: SignalAnalysisSectionProps) {
  const { physical, statistics, entropy, spectral, gradient, correlation, spectralHeatmap } = report;

  return (
    <div className="pt-2 border-t border-border/40">
      <Label className="text-[11px] text-muted-foreground">🔬 Analyse du signal</Label>

      <Accordion type="multiple" className="mt-1">
        {/* 1. Propriétés physiques */}
        <AccordionItem value="physical" className="border-b-0">
          <AccordionTrigger className="py-1.5 text-[11px] font-medium hover:no-underline">
            Propriétés physiques
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <StatCard label="Dimensions" value={`${physical.dimensions.width}×${physical.dimensions.height}`} />
              <StatCard label="Canaux" value={String(physical.channels)} />
              <StatCard label="Type" value={physical.dtype} />
              <StatCard label="Plage" value={`[${physical.minValueGlobal}, ${physical.maxValueGlobal}]`} />
              <StatCard label="Pixels" value={physical.totalSamples.toLocaleString()} />
              <StatCard label="Octets/échantillon" value={String(physical.bytesPerSample)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Statistiques par canal */}
        <AccordionItem value="statistics" className="border-b-0">
          <AccordionTrigger className="py-1.5 text-[11px] font-medium hover:no-underline">
            Statistiques par canal
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] tabular-nums">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/30">
                    <th className="text-left py-0.5 pr-1">Canal</th>
                    <th className="text-right px-0.5">μ</th>
                    <th className="text-right px-0.5">σ²</th>
                    <th className="text-right px-0.5">σ</th>
                    <th className="text-right px-0.5">Skew</th>
                    <th className="text-right px-0.5">Kurt</th>
                    <th className="text-right px-0.5">Uniq</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics).map(([ch, s]) => (
                    <tr key={ch} className="border-b border-border/10">
                      <td className="py-0.5 pr-1 font-medium" style={{ color: CHANNEL_COLORS[ch] }}>
                        {CHANNEL_NAMES[ch] ?? ch}
                      </td>
                      <td className="text-right px-0.5">{fmt(s.mean)}</td>
                      <td className="text-right px-0.5">{fmt(s.variance, 1)}</td>
                      <td className="text-right px-0.5">{fmt(s.stdDev)}</td>
                      <td className="text-right px-0.5">{fmt(s.skewness, 3)}</td>
                      <td className="text-right px-0.5">{fmt(s.kurtosis, 3)}</td>
                      <td className="text-right px-0.5">{s.uniqueSymbols}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Entropie Shannon */}
        <AccordionItem value="entropy" className="border-b-0">
          <AccordionTrigger className="py-1.5 text-[11px] font-medium hover:no-underline">
            Entropie de Shannon
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="space-y-1.5">
              {Object.entries(entropy).map(([ch, H]) => (
                <div key={ch}>
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: CHANNEL_COLORS[ch] }}>{CHANNEL_NAMES[ch] ?? ch}</span>
                    <span className="font-mono text-foreground">{fmt(H, 3)} bits</span>
                  </div>
                  <Progress
                    value={(H / 8) * 100}
                    className="h-1"
                    style={{ "--progress-bar-color": CHANNEL_COLORS[ch] } as React.CSSProperties}
                  />
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground">
                Max théorique : 8 bits/canal (uint8). Plus l'entropie est élevée, plus le signal est complexe.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Énergie spectrale */}
        <AccordionItem value="spectral" className="border-b-0">
          <AccordionTrigger className="py-1.5 text-[11px] font-medium hover:no-underline">
            Énergie spectrale (FFT)
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="space-y-1.5">
              {Object.entries(spectral).map(([ch, s]) => (
                <div key={ch}>
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: CHANNEL_COLORS[ch] }}>{CHANNEL_NAMES[ch] ?? ch}</span>
                    <span className="font-mono text-foreground">
                      BF {fmt(s.lowFreqEnergyRatio * 100, 1)}% / HF {fmt(s.highFreqEnergyRatio * 100, 1)}%
                    </span>
                  </div>
                  <div className="flex gap-0.5 h-1.5">
                    <div
                      className="rounded-l"
                      style={{
                        width: `${s.lowFreqEnergyRatio * 100}%`,
                        backgroundColor: CHANNEL_COLORS[ch],
                        opacity: 0.7,
                      }}
                    />
                    <div
                      className="rounded-r"
                      style={{
                        width: `${s.highFreqEnergyRatio * 100}%`,
                        backgroundColor: CHANNEL_COLORS[ch],
                        opacity: 0.3,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground">
                BF = basses fréquences (structures globales), HF = hautes fréquences (détails/bruit).
              </p>
              {spectralHeatmap && (
                <div className="mt-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Spectre FFT 2D (log magnitude)</div>
                  <FFTHeatmapCanvas heatmap={spectralHeatmap} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Gradient spatial */}
        <AccordionItem value="gradient" className="border-b-0">
          <AccordionTrigger className="py-1.5 text-[11px] font-medium hover:no-underline">
            Gradient spatial (Sobel)
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] tabular-nums">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/30">
                    <th className="text-left py-0.5 pr-1">Canal</th>
                    <th className="text-right px-0.5">μ Mag</th>
                    <th className="text-right px-0.5">Max Mag</th>
                    <th className="text-right px-0.5">σ Mag</th>
                    <th className="text-right px-0.5">μ θ (rad)</th>
                    <th className="text-right px-0.5">σ θ</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gradient).map(([ch, g]) => (
                    <tr key={ch} className="border-b border-border/10">
                      <td className="py-0.5 pr-1 font-medium" style={{ color: CHANNEL_COLORS[ch] }}>
                        {CHANNEL_NAMES[ch] ?? ch}
                      </td>
                      <td className="text-right px-0.5">{fmt(g.meanMagnitude, 1)}</td>
                      <td className="text-right px-0.5">{fmt(g.maxMagnitude, 1)}</td>
                      <td className="text-right px-0.5">{fmt(g.stdMagnitude, 1)}</td>
                      <td className="text-right px-0.5">{fmt(g.meanAngleRad, 3)}</td>
                      <td className="text-right px-0.5">{fmt(g.stdAngleRad, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              σ θ ≈ π/√3 (1.81) indique une isotropie parfaite des contours.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Corrélation inter-canaux */}
        {Object.keys(correlation).length > 0 && (
          <AccordionItem value="correlation" className="border-b-0">
            <AccordionTrigger className="py-1.5 text-[11px] font-medium hover:no-underline">
              Corrélation inter-canaux
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-1">
                {Object.entries(correlation).map(([pair, r]) => {
                  const absR = Math.abs(r);
                  const color =
                    absR > 0.9
                      ? "hsl(0 70% 55%)"
                      : absR > 0.7
                      ? "hsl(40 80% 50%)"
                      : "hsl(120 55% 45%)";
                  return (
                    <div key={pair}>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{CORR_LABELS[pair] ?? pair}</span>
                        <span className="font-mono font-medium" style={{ color }}>
                          r = {fmt(r, 4)}
                        </span>
                      </div>
                      <Progress
                        value={absR * 100}
                        className="h-1"
                        style={{ "--progress-bar-color": color } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">
                r &gt; 0.95 → image quasi-monochromatique. r ≈ 0 → canaux indépendants.
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/50 bg-card p-1">
      <div className="text-muted-foreground text-[9px] leading-tight">{label}</div>
      <div className="font-mono text-[11px] tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Renders the FFT 2D log-magnitude heatmap on a canvas using an inferno-like colormap.
 */
function FFTHeatmapCanvas({ heatmap }: { heatmap: SpectralHeatmap }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, data } = heatmap;
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255; // 0..1
      const [r, g, b] = infernoColormap(v);
      const idx = i * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [heatmap]);

  return (
    <div className="relative rounded border border-border/50 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${heatmap.width} / ${heatmap.height}` }}
      />
      {/* Legend bar */}
      <div className="flex items-center gap-1 px-1 py-0.5">
        <span className="text-[8px] text-muted-foreground">0</span>
        <div
          className="flex-1 h-1.5 rounded"
          style={{
            background: "linear-gradient(to right, #000004, #420a68, #932667, #dd513a, #fca50a, #fcffa4)",
          }}
        />
        <span className="text-[8px] text-muted-foreground">max</span>
      </div>
    </div>
  );
}

/**
 * Inferno-like colormap: maps 0..1 → [R, G, B] (0-255)
 */
function infernoColormap(t: number): [number, number, number] {
  // Simplified 6-stop inferno approximation
  const stops: [number, number, number, number][] = [
    [0.0, 0, 0, 4],
    [0.2, 66, 10, 104],
    [0.4, 147, 38, 103],
    [0.6, 221, 81, 58],
    [0.8, 252, 165, 10],
    [1.0, 252, 255, 164],
  ];

  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;

  const [t0, r0, g0, b0] = stops[i];
  const [t1, r1, g1, b1] = stops[i + 1];
  const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;

  return [
    Math.round(r0 + f * (r1 - r0)),
    Math.round(g0 + f * (g1 - g0)),
    Math.round(b0 + f * (b1 - b0)),
  ];
}
