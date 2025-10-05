import { Palette } from "lucide-react";

/**
 * Header centré, style neumorph gris/blanc, texte avec effet "creusé" (deboss).
 * Aucun logo, aucune animation. Police pro recommandée : Inter / Segoe UI / Roboto.
 */

export const Header = () => {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 bg-[#f0f0f3] border-b border-[#e6e6e9]"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div
          className="w-full rounded-lg mx-auto text-center"
          style={{
            background: "#f0f0f3",
            boxShadow:
              "8px 8px 20px rgba(0,0,0,0.06), -8px -8px 20px rgba(255,255,255,0.95)",
            padding: 22,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: 820,
              width: "100%",
              fontFamily:
                "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 600,
                color: "#2a2a2a",
                letterSpacing: "-0.2px",
                lineHeight: 1.05,
                /* ===== texte "creusé" =====
                   - Couleur principale sombre pour lisibilité
                   - Ombre claire en haut/à gauche et ombre foncée en bas/à droite
                   - Optionnel : léger text-stroke pour accentuer le relief
                */
                textShadow:
                  "0.6px 0.6px 0 rgba(255,255,255,0.9), -1.6px -1.6px 0 rgba(0,0,0,0.06), 1.6px 1.6px 6px rgba(0,0,0,0.06)",
                WebkitTextStroke: "0.2px rgba(0,0,0,0.04)",
                /*
                  Pour un effet plus prononcé (si souhaité) : inverser couleurs
                  et augmenter la seconde ombre pour simuler un creux plus profond.
                */
              }}
            >
              Image2Canvas Pro
            </h1>

            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 14,
                color: "#6b6b6b",
                fontWeight: 400,
                /*
                  Sous-texte légèrement "emprisonné" par le même principe
                  d'ombres pour cohérence visuelle.
                */
                textShadow: "0.4px 0.4px 0 rgba(255,255,255,0.9), 0.8px 0.8px 2px rgba(0,0,0,0.04)",
              }}
            >
              Convertissez vos visuels en modèles prêts à peindre, avec précision.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};