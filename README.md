# 🎨 Paint by Numbers Generator — Pro Edition
### Une application web complète pour transformer vos photos en magnifiques dessins Paint by Numbers, avec un moteur de traitement d'image professionnel inspiré de Mimipanda.

> Made with ❤️ using **React + TypeScript + Tailwind + Vite + shadcn/ui**

---

## ✨ Fonctionnalités principales

### 🖼️ Traitement d'image avancé
- **Upload facile** : glissez-déposez vos images (PNG, JPG, JPEG)
- **Quantification perceptuelle** : K-means++ avec distance ΔE2000 (CIEDE2000)
- **Contours précis** : Marching Squares + post-traitement topologique
- **Numérotation automatique** : placement intelligent via `polylabel`
- **Zones fusionnées** : regroupement des petites zones avec `martinez-polygon-clipping`

### 🎨 Visualisation interactive
- Canvas interactif avec zoom/pan
- Modes : Original | Contours | Numéroté | Aperçu
- Palette de couleurs dynamique
- Statistiques : zones, couleurs, dimensions
- Export SVG / PNG / JSON

### 🎯 Paramètres personnalisables
| Paramètre | Description |
|------------|-------------|
| **Nombre de couleurs** | 5 à 50 (recommandé : 20) |
| **Taille minimale de zone** | 50 à 1000 px² |
| **Douceur des bords** | 0 à 100 % |
| **Presets intelligents** | Simple, Détaillé, Artistique |

### 💎 Expérience utilisateur premium
- Design **glassmorphism** moderne  
- **Animations fluides**, micro-interactions et transitions  
- **Dark mode** intégré  
- **Responsive** (desktop, tablette, mobile)  
- **Notifications élégantes** et **confetti de succès**

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js ≥ 18  
- npm ou bun

### Installation
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

L'application sera disponible sur : [http://localhost:5173](http://localhost:5173)

---

## 🧠 Pipeline professionnel (Core Engine)

| Étape | Description | Librairie |
|-------|-------------|-----------|
| 1️⃣ Chargement | Normalisation EXIF, hash, redimensionnement | Canvas API |
| 2️⃣ Quantification | K-means++ + ΔE2000 (perceptual color distance) | `colorUtils.ts` |
| 3️⃣ Segmentation | Flood-fill + Marching Squares | `marchingsquares` |
| 4️⃣ Fusion topologique | Union de polygones adjacents | `martinez-polygon-clipping` |
| 5️⃣ Simplification adaptative | Tolerance dynamique selon surface | `simplify-js` |
| 6️⃣ Placement des labels | Pole of inaccessibility (centre visuel) | `polylabel` |
| 7️⃣ Export | SVG, PNG, JSON | Canvas |
| 8️⃣ Cache | Hash(image + params) | interne |
| 9️⃣ Web Worker | Traitement non-bloquant | navigateur |

---

## ⚙️ Architecture technique

```
📦 src/
 ┣ 📂 components/          # Interface utilisateur
 ┃ ┣ Canvas.tsx
 ┃ ┣ ColorPalette.tsx
 ┃ ┣ ParametersPanel.tsx
 ┣ 📂 lib/
 ┃ ┣ imageProcessing.ts    # Pipeline principal (core)
 ┃ ┣ colorUtils.ts         # Conversion Lab / ΔE2000
 ┣ 📂 workers/
 ┃ ┣ imageWorker.ts        # Web Worker (thread de traitement)
 ┣ 📂 types/
 ┃ ┣ external.d.ts         # Types des libs externes
 ┣ 📜 index.tsx            # Point d'entrée front-end
 ┣ 📜 tailwind.config.ts
 ┗ 📜 index.css            # Design tokens & thèmes
```

---

## 🧩 Technologies principales

| Domaine | Outils |
|---------|--------|
| UI | React 18, Tailwind CSS, shadcn/ui |
| Build | Vite |
| Typage | TypeScript |
| Interaction | React Hook Form, Sonner, Lucide React |
| Traitement d'image | `martinez-polygon-clipping`, `simplify-js`, `marchingsquares`, `polylabel` |
| Math / Couleur | ΔE2000, K-means++, RGB↔Lab conversion |

---

## 📖 Utilisation

1. **Upload d'image**
   - Formats acceptés : PNG / JPG / JPEG
   - Taille max recommandée : 4000×4000 px

2. **Ajustez les paramètres**
   - Couleurs → plus de détails
   - Taille min → fusionne les petites zones
   - Lissage → bords plus doux

3. **Cliquez sur "Générer le modèle"**
   - Le moteur analyse et vectorise automatiquement
   - Résultat visible en quelques secondes

4. **Explorez les onglets**
   - Original | Contours | Numéroté | Aperçu

5. **Exportez vos créations**
   - Téléchargez SVG / PNG / JSON
   - Copiez la palette hexadécimale

---

## 🧱 Paramètres du moteur

```ts
interface ProcessedResult {
  contours: ImageData;
  numbered: ImageData;
  colorized: ImageData;
  palette: string[];
  zones: Zone[];
  svg: string;
  legend: LegendEntry[];
  labels?: Int32Array;
  colorZoneMapping?: Map<number, number[]>;
}
```

---

## 📦 Algorithmes intégrés

| Algorithme | Rôle |
|------------|------|
| **K-means++** | Quantification de couleurs stable |
| **ΔE2000 (CIEDE2000)** | Distance perceptuelle précise |
| **Flood-fill / Labeling** | Segmentation des zones |
| **Marching Squares** | Extraction vectorielle |
| **Martinez Polygon Clipping** | Fusion topologique |
| **Simplify-js** | Lissage adaptatif |
| **Polylabel** | Placement des labels |

---

## 🧠 Conseils d'utilisation

| Problème | Solution |
|----------|----------|
| Image trop lente | Réduire `numColors` ou la taille |
| Contours trop fins | Augmenter le paramètre de lissage |
| Zones trop nombreuses | Augmenter `minRegionSize` |
| Numéros mal centrés | Activer la simplification adaptative |

---

## 🖋️ Design system

Fichier : `src/index.css`

```css
:root {
  --primary: hsl(220, 90%, 60%);
  --secondary: hsl(160, 70%, 45%);
  --gradient-mesh: linear-gradient(...);
  --glass-bg: rgba(255, 255, 255, 0.1);
  --shadow-glow: 0 0 40px var(--primary);
}
```

---

## 🤝 Contribution

1. Forkez le projet
2. Créez une branche :
   `git checkout -b feature/awesome-feature`
3. Committez vos changements
4. Pushez :
   `git push origin feature/awesome-feature`
5. Ouvrez une Pull Request ✨

---

## 🧰 Commandes utiles

```bash
npm run dev       # Dev + hot reload
npm run build     # Build production
npm run preview   # Preview du build
npm run lint      # Vérification du code
```

---

## 📄 Licence

Ce projet est sous licence **MIT**.
Libre d'utilisation, modification et distribution.

---

> *"Build sharp. Keep it local. Ship clean."*
