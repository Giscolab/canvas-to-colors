import { useRef, useState, useEffect, useCallback } from "react";
import { Upload, Image as ImageIcon, Check, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
}

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileDetails, setFileDetails] = useState<{ bytes?: number; label: string } | null>(null);

  const formatFileSize = useCallback((bytes: number) => {
    const sizeInKB = bytes / 1024;
    if (sizeInKB < 1024) {
      return `${Math.round(sizeInKB)} KB`;
    }
    const sizeInMB = sizeInKB / 1024;
    return `${sizeInMB.toFixed(2)} MB`;
  }, []);

  const ensureFallbackFileSize = useCallback(
    (dataUrl: string) => {
      setFileDetails((current) => {
        if (current?.bytes || !dataUrl.startsWith("data:")) {
          return current;
        }

        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          return current;
        }

        const padding = base64.match(/=+$/)?.[0].length ?? 0;
        const approximateBytes = Math.floor(base64.length * 0.75) - padding;
        if (approximateBytes <= 0) {
          return current;
        }

        const label = formatFileSize(approximateBytes);
        if (current?.label === label) {
          return current;
        }

        return { label };
      });
    },
    [formatFileSize]
  );

  // Analyse automatique des dimensions de l’image
  useEffect(() => {
    if (!selectedImage) {
      setImageDimensions(null);
      setFileDetails(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageDimensions({
        width: img.width,
        height: img.height
      });
      ensureFallbackFileSize(selectedImage);
    };
    img.src = selectedImage;

    return () => {
      img.onload = null;
    };
  }, [ensureFallbackFileSize, selectedImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setFileDetails({ bytes: file.size, label: formatFileSize(file.size) });
      onImageSelect(file);
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && ["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setFileDetails({ bytes: file.size, label: formatFileSize(file.size) });
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <Card 
      className={`p-6 border-2 border-dashed glass transition-all duration-300 ${
        isDragging ? 'border-primary shadow-2xl scale-[1.02]' : 'border-border hover:border-primary'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!selectedImage ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className={`p-4 rounded-full bg-primary/10 transition-all ${isDragging ? 'scale-125' : ''}`}>
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="font-semibold text-foreground text-lg">
              {isDragging ? 'Déposez votre image ici !' : 'Importer une image'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Glissez-déposez ou cliquez pour choisir
            </p>
            <Badge variant="secondary" className="mt-2">
              PNG, JPG ou JPEG • Format conseillé : A4 (HD 1920×1080)
            </Badge>
          </div>
          <Button 
            onClick={handleClick} 
            className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all shadow-md"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choisir une image
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary shadow-md">
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full shadow-md">
              <Check className="h-4 w-4" />
            </div>
          </div>
          
          {(imageDimensions || fileDetails?.label) && (
            <div className="flex gap-2 justify-center flex-wrap">
              {imageDimensions && (
                <Badge variant="outline" className="gap-1">
                  📐 {imageDimensions.width} × {imageDimensions.height}
                </Badge>
              )}
              {fileDetails?.label && (
                <Badge variant="outline" className="gap-1">
                  💾 {fileDetails.label}
                </Badge>
              )}
              {imageDimensions && (imageDimensions.width > 4000 || imageDimensions.height > 4000) && (
                <Badge variant="destructive" className="gap-1">
                  <FileWarning className="h-3 w-3" />
                  Image trop grande
                </Badge>
              )}
            </div>
          )}
          
          <Button 
            onClick={handleClick} 
            variant="outline" 
            className="w-full hover:border-primary"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Changer d'image
          </Button>
        </div>
      )}
    </Card>
  );
};
