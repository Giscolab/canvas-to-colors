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

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({
          title: "Format invalide",
          description: "Veuillez sélectionner une image PNG, JPG ou JPEG.",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAccept(e.target.files?.[0]);
    // reset input pour autoriser re-sélection du même fichier
    e.currentTarget.value = "";
  };

  const handleClick = () => fileInputRef.current?.click();

  // DnD
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // si plusieurs fichiers, on prend le premier image/*
    const fileList = Array.from(e.dataTransfer.files || []);
    const firstImage = fileList.find((f) => ACCEPTED_TYPES.includes(f.type));
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
      handleClick();
    }
  };

  return (
    <Card
      aria-labelledby={dropId}
      aria-describedby={helpId}
      role="region"
      className={[
        "p-6 border-2 border-dashed transition-all duration-200 rounded-xl",
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
          onClick={handleClick}
          className={[
            "flex flex-col items-center justify-center py-8 space-y-4",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg cursor-pointer",
          ].join(" ")}
        >
          <div className={`p-4 rounded-full bg-primary/10 transition-transform ${isDragging ? "scale-125 animate-pulse" : ""}`}>
            <Upload className="h-8 w-8 text-primary" />
          </div>

          <div className="text-center space-y-2">
            <h2 id={dropId} className="font-semibold text-foreground text-lg">
              {isDragging ? "Déposez votre image ici !" : "Importer une image"}
            </h2>
            <p id={helpId} className="text-sm text-muted-foreground">
              Glissez-déposez ou cliquez pour choisir
            </p>
            <Badge variant="secondary" className="mt-2">
              PNG, JPG ou JPEG • Max {IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB • Format conseillé : HD 1920×1080
            </Badge>
          </div>

          <Button
            type="button"
            onClick={handleClick}
            className="bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choisir une image
          </Button>
        </div>
      ) : (
        // ÉTAT AVEC APERÇU
        <div className="space-y-4">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary border">
            <img
              src={selectedImage}
              alt={imageInfo?.name ? `Aperçu – ${imageInfo.name}` : "Aperçu de l’image sélectionnée"}
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div
              className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full shadow-sm"
              aria-label="Image chargée avec succès"
              title="Image chargée avec succès"
            >
              <Check className="h-4 w-4" />
            </div>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            {imageInfo?.name && (
              <Badge variant="outline" className="gap-1 max-w-full truncate">
                🗂️ <span className="truncate">{imageInfo.name}</span>
              </Badge>
            )}
            {imageInfo && (
              <>
                <Badge variant="outline" className="gap-1">
                  📐 {imageInfo.width} × {imageInfo.height}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  💾 {imageInfo.size}
                </Badge>
              </>
            )}
            {(imageInfo?.width ?? 0) > 4000 || (imageInfo?.height ?? 0) > 4000 ? (
              <Badge variant="destructive" className="gap-1">
                <FileWarning className="h-3 w-3" />
                Image très grande — temps de traitement plus long
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleClick}
              variant="outline"
              className="flex-1 hover:border-primary"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Changer d’image
            </Button>
            <Button
              type="button"
              onClick={() => {
                // reset local uniquement ; le parent gère selectedImage via onImageSelect -> charge une autre image pour écraser
                setActualFile(null);
              }}
              variant="ghost"
              className="text-xs text-muted-foreground"
              title="Réinitialiser l’info locale (nom/taille)"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
