import { Upload, Image as ImageIcon, Check, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRef, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
}

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: string } | null>(null);

  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.onload = () => {
        const sizeKB = Math.round(img.src.length / 1024);
        const sizeMB = (sizeKB / 1024).toFixed(2);
        setImageInfo({
          width: img.width,
          height: img.height,
          size: sizeKB > 1024 ? `${sizeMB} MB` : `${sizeKB} KB`
        });
      };
      img.src = selectedImage;
    }
  }, [selectedImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg")) {
      onImageSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg")) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <Card 
      className={`p-6 border-2 border-dashed glass hover-lift transition-all duration-300 ${
        isDragging ? 'border-primary shadow-2xl scale-105 animate-glow-pulse' : 'border-border hover:border-primary'
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
          <div className={`p-4 rounded-full bg-primary/10 transition-all duration-300 ${
            isDragging ? 'scale-125 animate-glow-pulse' : ''
          }`}>
            <Upload className={`h-8 w-8 text-primary transition-transform ${
              isDragging ? 'animate-bounce' : ''
            }`} />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-foreground text-lg">
              {isDragging ? 'Déposez votre image ici !' : 'Uploadez votre image'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Glissez-déposez ou cliquez pour choisir
            </p>
            <Badge variant="secondary" className="mt-2">
              PNG, JPG ou JPEG (max 4000×4000)
            </Badge>
          </div>
          <Button 
            onClick={handleClick} 
            className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choisir une image
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary shadow-lg group">
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full shadow-lg animate-scale-in">
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
            className="w-full hover-lift hover:border-primary"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Changer l'image
          </Button>
        </div>
      )}
    </Card>
  );
};
