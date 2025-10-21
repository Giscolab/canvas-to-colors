import { Palette } from "lucide-react";

/**
 * TopBar Figma-like :
 * - Sticky 64px, fond semi-opaque (bg-card/95), blur, bord bas
 * - 3 zones : gauche (titre), centre (tabs/modes - placeholder), droite (actions - placeholder)
 * - Accessibilité : <header role="banner">, <nav aria-label="Modes">
 * - Zéro inline style ; uniquement design tokens (index.css) pour éviter de casser le thème
 */

export const Header = () => {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 h-16 bg-card/95 backdrop-blur border-b"
    >
      <div className="mx-auto max-w-[1600px] h-full px-3 sm:px-4 flex items-center gap-3">
        {/* Zone gauche : icône + titre + baseline (truncate pour petits écrans) */}
        <div className="min-w-0 flex items-center gap-2">
          <Palette aria-hidden="true" className="h-5 w-5 text-foreground/60" />
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
          {/* Place tes onglets existants ici quand tu voudras les déplacer visuellement */}
          {/* Exemple de style pour un tab :
              <button data-active className="h-9 px-3 rounded-md hover:bg-accent/60
                      data-[active=true]:bg-accent data-[active=true]:text-foreground">
                Original
              </button>
           */}
        </nav>

        {/* Zone centrale (tabs/modes) */}
        <div id="topbar-tabs" className="flex-1 flex justify-center" />

        {/* Zone droite : actions (placeholder visuel, garde ta logique ailleurs pour l'instant) */}
        <div className="ml-auto flex items-center gap-2">
          {/* Exemple d'emplacements :
              <button className="h-9 px-3 rounded-md hover:bg-accent/60">Undo</button>
              <div className="text-xs text-muted-foreground tabular-nums">100%</div>
              <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground shadow hover:opacity-90">
                Générer
              </button>
           */}
        </div>
      </div>
    </header>
  );
};