import { useRef, useState, useEffect, useCallback, useId } from "react";
import { Upload, Image as ImageIcon, Check, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IMAGE_PROCESSING } from "@/config/constants";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const isSupportedFile = (file: File) =>
  ACCEPTED_TYPES.includes(file.type) || file.name.toLowerCase().endsWith(".svg");

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Empêche les doubles .click() qui rouvrent la boîte (clé du bug)
  const openingRef = useRef(false);
  const [openLock, setOpenLock] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: string; name?: string } | null>(null);
  const { toast } = useToast();
  const dropId = useId();
  const helpId = useId();

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const validateAndAccept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;

      if (!isSupportedFile(file)) {
        toast({
          title: "Format invalide",
          description: "Veuillez sélectionner une image PNG, JPG, JPEG ou SVG.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > IMAGE_PROCESSING.MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Image trop volumineuse",
          description: `La taille maximale est de ${IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB.`,
          variant: "destructive",
        });
        return;
      }

      setActualFile(file);
      onImageSelect(file);
    },
    [onImageSelect, toast]
  );

  // Analyse dimensions & taille une fois l'aperçu dispo
  useEffect(() => {
    if (selectedImage && actualFile) {
      const img = new Image();
      img.onload = () => {
        setImageInfo({
          width: img.width,
          height: img.height,
          size: formatSize(actualFile.size),
          name: actualFile.name,
        });
      };
      img.src = selectedImage;
      return () => {
        img.onload = null;
      };
    } else {
      setImageInfo(null);
    }
  }, [selectedImage, actualFile]);

  // Protège l'ouverture de la boîte de dialogue
  const openFileDialog = useCallback(() => {
    if (openingRef.current || openLock) return;
    openingRef.current = true;
    setOpenLock(true);
    // petit délai de déverrouillage pour laisser le navigateur "respirer"
    const unlock = () => {
      openingRef.current = false;
      setTimeout(() => setOpenLock(false), 250);
    };

    const input = fileInputRef.current;
    if (!input) {
      unlock();
      return;
    }

    // Écoute l'événement "cancel" natif (Chrome/Edge/Safari)
    const onCancel = () => unlock();
    input.addEventListener("cancel", onCancel, { once: true });

    // Sur certains navigateurs, "cancel" n'existe pas — on met un filet de sécurité
    const safety = setTimeout(unlock, 1500);

    input.click();

    // Quand on aura un change, on clean
    const onChange = () => {
      clearTimeout(safety);
      input.removeEventListener("cancel", onCancel);
      unlock();
    };
    input.addEventListener("change", onChange, { once: true });
  }, [openLock]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAccept(e.target.files?.[0]);
    // reset input pour autoriser re-sélection du même fichier
    e.currentTarget.value = "";
  };

  // DnD
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const fileList = Array.from(e.dataTransfer.files || []);
    const firstImage = fileList.find((f) => isSupportedFile(f));
    validateAndAccept(firstImage);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Accessibilité clavier : Enter/Espace pour ouvrir le sélecteur
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFileDialog();
    }
  };

  return (
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
        // ÉTAT VIDE
          <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            // ⚠️ zone cliquable — protégée par openLock/openingRef
            onClick={(e) => {
              if (openLock) return; // empêche les relances
              openFileDialog();
            }}
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
              Glissez-déposez ou cliquez pour choisir
            </p>
            <Badge variant="secondary" className="mt-0.5 text-[9px] px-1.5 py-0">
              PNG, JPG, JPEG ou SVG • Max {IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB
            </Badge>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
            disabled={openLock}
            className="bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm text-xs h-7 px-2"
          >
            <Upload className="mr-1 h-3 w-3" />
            Choisir une image
          </Button>
        </div>
      ) : (
        // ÉTAT AVEC APERÇU
        <div className="space-y-1.5">
          <div className="relative h-24 rounded-lg overflow-hidden bg-secondary border">
            <img
              src={selectedImage}
              alt={imageInfo?.name ? `Aperçu – ${imageInfo.name}` : "Aperçu de l'image sélectionnée"}
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div
              className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded-full shadow-sm"
              aria-label="Image chargée avec succès"
              title="Image chargée avec succès"
            >
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
                <Badge variant="outline" className="gap-0.5 text-[9px] px-1 py-0">
                  📐 {imageInfo.width} × {imageInfo.height}
                </Badge>
                <Badge variant="outline" className="gap-0.5 text-[9px] px-1 py-0">
                  💾 {imageInfo.size}
                </Badge>
              </>
            )}
            {(imageInfo?.width ?? 0) > 4000 || (imageInfo?.height ?? 0) > 4000 ? (
              <Badge variant="destructive" className="gap-0.5 text-[9px] px-1 py-0">
                <FileWarning className="h-2.5 w-2.5" />
                Image très grande
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              variant="outline"
              disabled={openLock}
              className="flex-1 hover:border-primary text-xs h-7"
            >
              <ImageIcon className="mr-1.5 h-3 w-3" />
              Changer d'image
            </Button>
            <Button
              type="button"
              onClick={() => setActualFile(null)}
              variant="ghost"
              className="text-[10px] text-muted-foreground h-7 px-2"
              title="Réinitialiser l'info locale (nom/taille)"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
