import { Palette } from "lucide-react";

export const Header = () => {
  return (
    <header className="glass border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow animate-float hover-glow transition-all duration-300 hover:scale-110">
            <Palette className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent animate-pulse">
              PaintByNumbers Studio
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Transformez votre image en chef-d'œuvre numéroté ✨
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
