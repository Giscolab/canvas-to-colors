import { Palette } from "lucide-react";

/**
 * TopBar Figma-like optimisée pour theme-pro.css :
 * - Sticky 64px, fond semi-opaque (bg-card/95), blur, bord bas et ombre subtile
 * - 3 zones : gauche (titre), centre (tabs/modes), droite (actions)
 * - Accessibilité : <header role="banner">, <nav aria-label="Modes">
 * - Utilisation des tokens de notre design system pour une cohérence parfaite
 */

export const Header = () => {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 h-16 bg-card/95 backdrop-blur border-b shadow-elev-1"
    >
      <div className="container h-full flex items-center gap-3">
        {/* Zone gauche : icône + titre + baseline (truncate pour petits écrans) */}
        <div className="min-w-0 flex items-center gap-2">
          <Palette aria-hidden="true" className="h-6 w-6 text-foreground/60" />
          <span className="truncate text-sm font-medium text-foreground/90">
            Image2Canvas Pro
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            – Convertissez vos visuels en modèles prêts à peindre
          </span>
        </div>

        {/* Zone centrale : modes/tabs (placeholder visuel, pas de logique ici) */}
        <nav
          aria-label="Modes"
          className="mx-auto hidden md:flex items-center gap-1"
        >
          {/* Les onglets seront ajoutés ici avec le style approprié :
              <button data-active className="h-9 px-3 rounded-md transition-colors
                      data-[active=true]:bg-accent data-[active=true]:text-foreground
                      hover:bg-accent/60">
                Original
              </button>
           */}
        </nav>

        {/* Zone centrale (tabs/modes) - pour le rendu dynamique */}
        <div id="topbar-tabs" className="flex-1 flex justify-center" />

        {/* Zone droite : actions (placeholder visuel) */}
        <div className="ml-auto flex items-center gap-2">
          {/* Exemple d'emplacements :
              <button className="h-9 px-3 rounded-md hover:bg-accent/60 transition-colors">Undo</button>
              <div className="text-xs text-muted-foreground tabular-nums">100%</div>
              <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground shadow-elev-1 hover:opacity-90 transition-opacity">
                Générer
              </button>
           */}
        </div>
      </div>
    </header>
  );
};