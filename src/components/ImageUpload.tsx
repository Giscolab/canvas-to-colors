import { Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRef } from "react";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
}

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg")) {
      onImageSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-6 border-2 border-dashed border-border hover:border-primary transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!selectedImage ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="p-4 rounded-full bg-secondary">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-foreground">Upload votre image</h3>
            <p className="text-sm text-muted-foreground">
              PNG, JPG ou JPEG (max 4000×4000)
            </p>
          </div>
          <Button onClick={handleClick} className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
            <Upload className="mr-2 h-4 w-4" />
            Choisir une image
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="w-full h-full object-contain"
            />
          </div>
          <Button 
            onClick={handleClick} 
            variant="outline" 
            className="w-full"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Changer l'image
          </Button>
        </div>
      )}
    </Card>
  );
};
