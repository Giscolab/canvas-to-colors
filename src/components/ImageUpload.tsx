import { useRef, useState, useEffect } from "react";
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

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: string } | null>(null);
  const { toast } = useToast();

  // Analyse automatique de la taille de l'image avec file.size réel
  useEffect(() => {
    if (selectedImage && actualFile) {
      const img = new Image();
      img.onload = () => {
        const sizeKB = Math.round(actualFile.size / 1024);
        const sizeMB = (sizeKB / 1024).toFixed(2);
        setImageInfo({
          width: img.width,
          height: img.height,
          size: sizeKB > 1024 ? `${sizeMB} MB` : `${sizeKB} KB`
        });
      };
      img.src = selectedImage;
      
      // Nettoyage pour éviter les fuites mémoire
      return () => {
        img.onload = null;
      };
    }
  }, [selectedImage, actualFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
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
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
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
          <div className={`p-4 rounded-full bg-primary/10 transition-all ${isDragging ? 'scale-125 animate-pulse' : ''}`}>
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
              PNG, JPG ou JPEG • Max {IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB • Format conseillé : HD 1920×1080
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
            <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full shadow-md animate-scale-in">
              <Check className="h-4 w-4" />
            </div>
          </div>
          
          {imageInfo && (
            <div className="flex gap-2 justify-center flex-wrap">
              <Badge variant="outline" className="gap-1">
                📐 {imageInfo.width} × {imageInfo.height}
              </Badge>
              <Badge variant="outline" className="gap-1">
                💾 {imageInfo.size}
              </Badge>
              {(imageInfo.width > 4000 || imageInfo.height > 4000) && (
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
