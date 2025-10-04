# 🎨 Paint by Numbers Generator

Une application web moderne qui transforme vos photos en magnifiques dessins Paint by Numbers, avec numérotation automatique des zones et palette de couleurs extraite.

[![Made with Lovable](https://img.shields.io/badge/Made%20with-Lovable-ff4b6e)](https://lovable.dev)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38bdf8)](https://tailwindcss.com/)

## ✨ Fonctionnalités

### 🖼️ Traitement d'Image Avancé
- **Upload facile** : Glissez-déposez vos images (PNG, JPG, JPEG)
- **Détection de contours** : Algorithme Canny edge detection pour des contours précis
- **Quantification de couleurs** : K-means clustering pour extraire les couleurs dominantes
- **Numérotation automatique** : Chaque zone est numérotée selon sa couleur
- **Zones fusionnées** : Les petites zones sont intelligemment regroupées

### 🎨 Visualisation Interactive
- **Canvas interactif** : Zoom, pan, et exploration fluide
- **Modes d'affichage multiples** :
  - Image originale
  - Contours détectés
  - Zones numérotées
  - Aperçu final
- **Palette de couleurs** : Visualisation et copie des couleurs extraites
- **Statistiques en temps réel** : Nombre de zones, couleurs, dimensions

### 🎯 Paramètres Personnalisables
- **Nombre de couleurs** : 5 à 50 couleurs (recommandé : 20)
- **Seuil de contours** : 20 à 200 (recommandé : 100)
- **Taille minimale de zone** : 50 à 1000 pixels (recommandé : 200)
- **Rayon de flou** : 0 à 10 (recommandé : 3)
- **Presets intelligents** : Simple, Détaillé, Artistique

### ✨ UX Premium
- **Design glassmorphism** : Effets de verre et transparence élégants
- **Animations fluides** : Micro-interactions et transitions sophistiquées
- **Dark mode** : Interface sombre avec contrastes vibrants
- **Responsive** : Optimisé pour desktop, tablette et mobile
- **Toast notifications** : Retours visuels élégants
- **Confetti celebration** : Animation de succès après traitement

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (v18 ou supérieur)
- npm ou bun

### Installation

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>

# Naviguer dans le dossier
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🛠️ Technologies

### Frontend
- **React 18** : Bibliothèque UI avec hooks modernes
- **TypeScript** : Typage statique pour plus de fiabilité
- **Vite** : Build tool ultra-rapide
- **Tailwind CSS** : Framework CSS utility-first
- **shadcn/ui** : Composants UI accessibles et personnalisables

### Librairies Principales
- **Lucide React** : Icônes élégantes
- **React Hook Form** : Gestion de formulaires
- **Sonner** : Toast notifications
- **React Confetti** : Animations de célébration

### Algorithmes
- **K-means clustering** : Quantification de couleurs
- **Canny edge detection** : Détection de contours
- **Flood fill** : Segmentation de zones
- **Gaussian blur** : Lissage d'image

## 📖 Utilisation

### 1. Upload d'Image
- Cliquez sur la zone d'upload ou glissez-déposez une image
- Formats acceptés : PNG, JPG, JPEG
- Taille maximale recommandée : 4000×4000 pixels

### 2. Ajustement des Paramètres
- **Couleurs** : Plus de couleurs = plus de détails (recommandé : 20)
- **Contours** : Seuil plus bas = plus de contours détectés
- **Zone minimale** : Taille en dessous de laquelle les zones sont fusionnées
- **Flou** : Lissage de l'image avant traitement

### 3. Génération
- Cliquez sur "Générer Paint by Numbers"
- Attendez le traitement (quelques secondes selon la taille)
- Explorez les différents onglets (Original, Contours, Numéroté, Aperçu)

### 4. Export
- Visualisez la palette de couleurs extraite
- Cliquez sur une couleur pour copier son code hexadécimal
- Utilisez les boutons d'export pour télécharger vos créations

## 🎨 Personnalisation du Design

Le projet utilise un système de design tokens dans `src/index.css` et `tailwind.config.ts` :

```css
/* Couleurs principales */
--primary: hsl(...)
--secondary: hsl(...)

/* Effets spéciaux */
--gradient-mesh: linear-gradient(...)
--shadow-glow: 0 0 40px ...
--glass-bg: rgba(255, 255, 255, 0.1)
```

Tous les composants utilisent ces tokens pour une cohérence parfaite.

## 📁 Structure du Projet

```
src/
├── components/
│   ├── Canvas.tsx              # Zone d'affichage interactive
│   ├── ColorPalette.tsx        # Palette de couleurs
│   ├── Header.tsx              # En-tête de l'application
│   ├── ImageUpload.tsx         # Upload d'image
│   ├── ParametersPanel.tsx     # Panneau de paramètres
│   └── ui/                     # Composants shadcn/ui
├── hooks/
│   ├── useCanvasInteractions.ts # Zoom/pan du canvas
│   └── useWindowSize.ts        # Taille de fenêtre
├── lib/
│   ├── imageProcessing.ts      # Algorithmes de traitement
│   └── utils.ts                # Utilitaires
├── pages/
│   └── Index.tsx               # Page principale
└── index.css                   # Design system global
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Pushez sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Développement Local

```bash
# Installation
npm install

# Développement avec hot-reload
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview

# Linting
npm run lint
```

## 🐛 Résolution de Problèmes

### L'image ne se charge pas
- Vérifiez que le format est PNG, JPG ou JPEG
- Vérifiez que la taille ne dépasse pas 4000×4000 pixels

### Le traitement est long
- Réduisez le nombre de couleurs
- Augmentez la taille minimale de zone
- Redimensionnez votre image avant upload

### Les contours ne sont pas visibles
- Augmentez le seuil de contours
- Essayez avec un rayon de flou différent

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔗 Liens Utiles

- [Documentation Lovable](https://docs.lovable.dev/)
- [Documentation React](https://react.dev/)
- [Documentation Tailwind CSS](https://tailwindcss.com/)
- [Documentation shadcn/ui](https://ui.shadcn.com/)

## 🌟 Remerciements

Créé avec ❤️ en utilisant [Lovable](https://lovable.dev) - La plateforme pour créer des applications web modernes.

---

**URL du projet** : https://lovable.dev/projects/fab9df50-68d4-41f6-a5ba-117d4e596406
