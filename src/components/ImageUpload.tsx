import { useRef, useState, useEffect, useCallback, useId } from "react";
import { Upload, Image as ImageIcon, Check, FileWarning, Link, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IMAGE_PROCESSING } from "@/config/constants";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WebcamCapture } from "@/components/WebcamCapture";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const isSupportedFile = (file: File) =>
  ACCEPTED_TYPES.includes(file.type) || file.name.toLowerCase().endsWith(".svg");

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openingRef = useRef(false);
  const [openLock, setOpenLock] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: string; name?: string } | null>(null);
  const { toast } = useToast();
  const dropId = useId();
  const helpId = useId();

  // URL import state
  const [urlInput, setUrlInput] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Webcam state
  const [showWebcam, setShowWebcam] = useState(false);

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const validateAndAccept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!isSupportedFile(file)) {
        toast({ title: "Format invalide", description: "Veuillez sélectionner une image PNG, JPG, JPEG ou SVG.", variant: "destructive" });
        return;
      }
      if (file.size > IMAGE_PROCESSING.MAX_FILE_SIZE_BYTES) {
        toast({ title: "Image trop volumineuse", description: `La taille maximale est de ${IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB.`, variant: "destructive" });
        return;
      }
      setActualFile(file);
      onImageSelect(file);
    },
    [onImageSelect, toast]
  );

  useEffect(() => {
    if (selectedImage && actualFile) {
      const img = new Image();
      img.onload = () => {
        setImageInfo({ width: img.width, height: img.height, size: formatSize(actualFile.size), name: actualFile.name });
      };
      img.src = selectedImage;
      return () => { img.onload = null; };
    } else {
      setImageInfo(null);
    }
  }, [selectedImage, actualFile]);

  const openFileDialog = useCallback(() => {
    if (openingRef.current || openLock) return;
    openingRef.current = true;
    setOpenLock(true);
    const unlock = () => {
      openingRef.current = false;
      setTimeout(() => setOpenLock(false), 250);
    };
    const input = fileInputRef.current;
    if (!input) { unlock(); return; }
    const onCancel = () => unlock();
    input.addEventListener("cancel", onCancel, { once: true });
    const safety = setTimeout(unlock, 1500);
    input.click();
    const onChange = () => {
      clearTimeout(safety);
      input.removeEventListener("cancel", onCancel);
      unlock();
    };
    input.addEventListener("change", onChange, { once: true });
  }, [openLock]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAccept(e.target.files?.[0]);
    e.currentTarget.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const fileList = Array.from(e.dataTransfer.files || []);
    const firstImage = fileList.find((f) => isSupportedFile(f));
    validateAndAccept(firstImage);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFileDialog(); }
  };

  // === URL IMPORT ===
  const handleImportUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;

    try {
      new URL(url);
    } catch {
      toast({ title: "URL invalide", description: "Veuillez entrer une URL valide.", variant: "destructive" });
      return;
    }

    setIsLoadingUrl(true);
    try {
      // Try direct fetch first
      let blob: Blob;
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("CORS or HTTP error");
        blob = await resp.blob();
      } catch {
        // Fallback to edge function proxy
        const { data, error } = await supabase.functions.invoke("fetch-image-url", {
          body: { url },
        });
        if (error) throw new Error(error.message || "Erreur proxy");
        blob = data as Blob;
      }

      const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() || "png";
      const name = `url-import-${Date.now()}.${ext}`;
      const file = new File([blob], name, { type: blob.type || "image/png" });
      validateAndAccept(file);
      setUrlInput("");
      toast({ title: "Image importée depuis l'URL" });
    } catch (err: any) {
      console.error("URL import error:", err);
      toast({ title: "Échec de l'import", description: err.message || "Impossible de télécharger l'image.", variant: "destructive" });
    } finally {
      setIsLoadingUrl(false);
    }
  };

  return (
    <>
      <Card
        aria-labelledby={dropId}
        aria-describedby={helpId}
        role="region"
        className={[
          "p-2 border-2 border-dashed transition-all duration-200 rounded-lg",
          "bg-card/60 backdrop-blur hover:border-primary/60",
          isDragging ? "border-primary shadow-md scale-[1.01]" : "border-border",
        ].join(" ")}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedImage ? (
          <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={(e) => { if (openLock) return; openFileDialog(); }}
            className={[
              "flex flex-col items-center justify-center py-3 space-y-1.5",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg",
              openLock ? "pointer-events-none opacity-70" : "cursor-pointer",
            ].join(" ")}
          >
            <div className={`p-2 rounded-full bg-primary/10 transition-transform ${isDragging ? "scale-125 animate-pulse" : ""}`}>
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center space-y-0.5">
              <h2 id={dropId} className="font-semibold text-foreground text-sm">
                {isDragging ? "Déposez votre image ici !" : "Importer une image"}
              </h2>
              <p id={helpId} className="text-[10px] text-muted-foreground">
                Glissez-déposez, collez une URL, ou utilisez la webcam
              </p>
              <Badge variant="secondary" className="mt-0.5 text-[9px] px-1.5 py-0">
                PNG, JPG, JPEG ou SVG • Max {IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                onClick={(e) => { e.stopPropagation(); openFileDialog(); }}
                disabled={openLock}
                className="bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm text-xs h-7 px-2"
              >
                <Upload className="mr-1 h-3 w-3" /> Fichier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); setShowWebcam(true); }}
                className="text-xs h-7 px-2"
              >
                <Camera className="mr-1 h-3 w-3" /> Webcam
              </Button>
            </div>

            {/* URL import */}
            <div
              className="flex items-center gap-1 w-full px-1 mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                type="url"
                placeholder="https://exemple.com/image.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImportUrl(); } }}
                className="h-7 text-xs flex-1"
                disabled={isLoadingUrl}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleImportUrl}
                disabled={!urlInput.trim() || isLoadingUrl}
                aria-label="Importer l'image depuis l'URL"
                title="Importer l'image depuis l'URL"
                className="h-7 px-2 text-xs shrink-0"
              >
                {isLoadingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="relative h-24 rounded-lg overflow-hidden bg-secondary border">
              <img
                src={selectedImage}
                alt={imageInfo?.name ? `Aperçu – ${imageInfo.name}` : "Aperçu de l'image sélectionnée"}
                className="w-full h-full object-contain"
                draggable={false}
              />
              <div className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded-full shadow-sm" aria-label="Image chargée avec succès" title="Image chargée avec succès">
                <Check className="h-2.5 w-2.5" />
              </div>
            </div>
            <div className="flex gap-1 justify-center flex-wrap">
              {imageInfo?.name && (
                <Badge variant="outline" className="gap-0.5 max-w-full truncate text-[9px] px-1 py-0">
                  🗂️ <span className="truncate max-w-[140px]">{imageInfo.name}</span>
                </Badge>
              )}
              {imageInfo && (
                <>
                  <Badge variant="outline" className="gap-0.5 text-[9px] px-1 py-0">📐 {imageInfo.width} × {imageInfo.height}</Badge>
                  <Badge variant="outline" className="gap-0.5 text-[9px] px-1 py-0">💾 {imageInfo.size}</Badge>
                </>
              )}
              {(imageInfo?.width ?? 0) > 4000 || (imageInfo?.height ?? 0) > 4000 ? (
                <Badge variant="destructive" className="gap-0.5 text-[9px] px-1 py-0">
                  <FileWarning className="h-2.5 w-2.5" /> Image très grande
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="button" onClick={(e) => { e.stopPropagation(); openFileDialog(); }} variant="outline" disabled={openLock} className="flex-1 hover:border-primary text-xs h-7">
                <ImageIcon className="mr-1.5 h-3 w-3" /> Changer d'image
              </Button>
              <Button type="button" onClick={() => setActualFile(null)} variant="ghost" className="text-[10px] text-muted-foreground h-7 px-2" title="Réinitialiser l'info locale (nom/taille)">
                Réinitialiser
              </Button>
            </div>
          </div>
        )}
      </Card>

      <WebcamCapture open={showWebcam} onOpenChange={setShowWebcam} onCapture={(file) => validateAndAccept(file)} />
    </>
  );
};
