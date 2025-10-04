import { Palette } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Palette className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              PaintByNumbers Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Transformez votre image en peinture par numéros
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
