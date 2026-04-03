import jsPDF from "jspdf";
import type { ProcessedResult } from "@/lib/imageProcessing";

export interface PdfExportOptions {
  paperSize: "a4" | "a3" | "letter";
  orientation: "portrait" | "landscape";
  includeColorized: boolean;
  includeNumbered: boolean;
  includeLegend: boolean;
  includeInstructions: boolean;
}

const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
  letter: { w: 215.9, h: 279.4 },
};

const MARGIN = 15;

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  paperSize: "a4",
  orientation: "portrait",
  includeColorized: true,
  includeNumbered: true,
  includeLegend: true,
  includeInstructions: false,
};

function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function canvasToDataUrl(
  renderToCanvas: (mode: string, scale: number, bg: string) => HTMLCanvasElement | null,
  mode: string,
  scale: number
): string | null {
  const canvas = renderToCanvas(mode, scale, "#ffffff");
  return canvas?.toDataURL("image/png") ?? null;
}

function addImagePage(
  doc: jsPDF,
  dataUrl: string,
  title: string,
  pageW: number,
  pageH: number
) {
  const usableW = pageW - MARGIN * 2;
  const usableH = pageH - MARGIN * 2 - 15; // space for title

  doc.setFontSize(14);
  doc.text(title, MARGIN, MARGIN + 8);

  // Load image dimensions from dataUrl
  const img = new Image();
  img.src = dataUrl;

  const imgW = img.naturalWidth || usableW;
  const imgH = img.naturalHeight || usableH;
  const ratio = Math.min(usableW / imgW, usableH / imgH, 1);
  const drawW = imgW * ratio;
  const drawH = imgH * ratio;
  const x = MARGIN + (usableW - drawW) / 2;
  const y = MARGIN + 15 + (usableH - drawH) / 2;

  doc.addImage(dataUrl, "PNG", x, y, drawW, drawH);
}

export function exportToPdf(
  result: ProcessedResult,
  renderToCanvas: (mode: string, scale: number, bg: string) => HTMLCanvasElement | null,
  options: PdfExportOptions = DEFAULT_PDF_OPTIONS
): Blob {
  const paper = PAPER_SIZES[options.paperSize] || PAPER_SIZES.a4;
  const isLandscape = options.orientation === "landscape";
  const pageW = isLandscape ? paper.h : paper.w;
  const pageH = isLandscape ? paper.w : paper.h;

  const doc = new jsPDF({
    orientation: options.orientation,
    unit: "mm",
    format: options.paperSize,
  });

  let pageAdded = false;

  // Page 1: Colorized
  if (options.includeColorized) {
    const dataUrl = canvasToDataUrl(renderToCanvas, "colorized", 2);
    if (dataUrl) {
      if (pageAdded) doc.addPage();
      addImagePage(doc, dataUrl, "Image colorisée", pageW, pageH);
      pageAdded = true;
    }
  }

  // Page 2: Numbered contours
  if (options.includeNumbered) {
    const dataUrl = canvasToDataUrl(renderToCanvas, "numbered", 2);
    if (dataUrl) {
      if (pageAdded) doc.addPage();
      addImagePage(doc, dataUrl, "Contours numérotés — Prêt à peindre", pageW, pageH);
      pageAdded = true;
    }
  }

  // Page 3: Legend
  if (options.includeLegend && result.legend && result.legend.length > 0) {
    if (pageAdded) doc.addPage();
    pageAdded = true;

    doc.setFontSize(14);
    doc.text("Légende des couleurs", MARGIN, MARGIN + 8);

    const startY = MARGIN + 18;
    const colW = (pageW - MARGIN * 2) / 3;
    const rowH = 8;
    const swatchSize = 5;

    result.legend.forEach((entry, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MARGIN + col * colW;
      const y = startY + row * rowH;

      if (y + rowH > pageH - MARGIN) return; // overflow guard

      // Color swatch
      const hex = entry.hex || "#000000";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.rect(x, y, swatchSize, swatchSize, "F");
      doc.setDrawColor(0);
      doc.rect(x, y, swatchSize, swatchSize, "S");

      // Label
      doc.setFontSize(8);
      doc.setTextColor(0);
      const pct = entry.percent != null ? ` (${entry.percent.toFixed(1)}%)` : "";
      doc.text(`#${entry.id + 1} ${hex}${pct}`, x + swatchSize + 2, y + swatchSize - 1);
    });
  }

  // Page 4: Instructions
  if (options.includeInstructions) {
    if (pageAdded) doc.addPage();
    pageAdded = true;

    doc.setFontSize(16);
    doc.text("Comment utiliser ce modèle", MARGIN, MARGIN + 10);

    doc.setFontSize(10);
    const instructions = [
      "1. Imprimez la page « Contours numérotés » sur du papier adapté.",
      "2. Consultez la légende pour identifier chaque couleur par son numéro.",
      "3. Commencez par les grandes zones, puis passez aux détails.",
      "4. Utilisez la peinture acrylique ou aquarelle selon votre préférence.",
      "5. Laissez sécher chaque couleur avant de passer à la suivante.",
      "6. Pour un rendu optimal, appliquez 2 couches fines plutôt qu'une couche épaisse.",
      "",
      "Conseil : gardez l'image colorisée à portée de main comme référence !",
    ];

    let y = MARGIN + 22;
    instructions.forEach((line) => {
      doc.text(line, MARGIN, y);
      y += 6;
    });
  }

  if (!pageAdded) {
    doc.text("Aucun contenu sélectionné.", MARGIN, MARGIN + 10);
  }

  return doc.output("blob");
}
