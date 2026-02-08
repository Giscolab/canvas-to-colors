import { IMAGE_PROCESSING } from "@/config/constants";

export interface RasterizedSvgResult {
  file: File;
  width: number;
  height: number;
}

interface SvgDimensions {
  width: number;
  height: number;
}

const DEFAULT_SVG_SIZE = 512;

const unitToPx = (value: number, unit: string): number => {
  switch (unit) {
    case "px":
    case "":
      return value;
    case "in":
      return value * 96;
    case "cm":
      return (value * 96) / 2.54;
    case "mm":
      return (value * 96) / 25.4;
    case "pt":
      return (value * 96) / 72;
    case "pc":
      return value * 16;
    default:
      return value;
  }
};

const parseLength = (raw: string | null): number | null => {
  if (!raw) return null;
  const match = raw.trim().match(/^([\d.]+)\s*(px|in|cm|mm|pt|pc)?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  const unit = (match[2] || "").toLowerCase();
  return unitToPx(value, unit);
};

const parseViewBox = (viewBox: string | null): SvgDimensions | null => {
  if (!viewBox) return null;
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [, , width, height] = parts;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
};

const resolveSvgDimensions = (svgElement: SVGSVGElement): SvgDimensions => {
  const widthAttr = parseLength(svgElement.getAttribute("width"));
  const heightAttr = parseLength(svgElement.getAttribute("height"));
  const viewBoxDims = parseViewBox(svgElement.getAttribute("viewBox"));

  if (widthAttr && heightAttr) {
    return { width: widthAttr, height: heightAttr };
  }

  if (viewBoxDims) {
    if (widthAttr && !heightAttr) {
      const ratio = viewBoxDims.height / viewBoxDims.width;
      return { width: widthAttr, height: widthAttr * ratio };
    }
    if (!widthAttr && heightAttr) {
      const ratio = viewBoxDims.width / viewBoxDims.height;
      return { width: heightAttr * ratio, height: heightAttr };
    }
    return { width: viewBoxDims.width, height: viewBoxDims.height };
  }

  if (widthAttr || heightAttr) {
    const size = widthAttr ?? heightAttr ?? DEFAULT_SVG_SIZE;
    return { width: size, height: size };
  }

  return { width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE };
};

const clampRasterSize = (dims: SvgDimensions): SvgDimensions => {
  const maxPixels = IMAGE_PROCESSING.MAX_PIXELS;
  const maxDimension = IMAGE_PROCESSING.MAX_DISPLAY_WIDTH * 4;
  const pixelCount = dims.width * dims.height;
  const pixelScale = pixelCount > maxPixels ? Math.sqrt(maxPixels / pixelCount) : 1;
  const dimensionScale = Math.max(dims.width, dims.height) > maxDimension
    ? maxDimension / Math.max(dims.width, dims.height)
    : 1;
  const scale = Math.min(pixelScale, dimensionScale);

  return {
    width: Math.max(1, Math.round(dims.width * scale)),
    height: Math.max(1, Math.round(dims.height * scale)),
  };
};

export async function rasterizeSvgFile(svgFile: File): Promise<RasterizedSvgResult> {
  const svgText = await svgFile.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgElement = doc.querySelector("svg");

  if (!svgElement) {
    throw new Error("Fichier SVG invalide : élément <svg> introuvable.");
  }

  if (!svgElement.getAttribute("xmlns")) {
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  const resolved = resolveSvgDimensions(svgElement);
  const rasterSize = clampRasterSize(resolved);

  svgElement.setAttribute("width", `${rasterSize.width}`);
  svgElement.setAttribute("height", `${rasterSize.height}`);

  const serialized = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "sync";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Impossible de rasteriser le SVG."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = rasterSize.width;
    canvas.height = rasterSize.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Contexte 2D indisponible pour rasteriser le SVG.");
    }

    ctx.clearRect(0, 0, rasterSize.width, rasterSize.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, 0, 0, rasterSize.width, rasterSize.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Conversion PNG du SVG échouée."));
          return;
        }
        resolve(result);
      }, "image/png");
    });

    const baseName = svgFile.name.replace(/\.svg$/i, "");
    const rasterFile = new File([blob], `${baseName || "svg-import"}.png`, {
      type: "image/png",
    });

    return { file: rasterFile, width: rasterSize.width, height: rasterSize.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const isSvgFile = (file: File): boolean => file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
