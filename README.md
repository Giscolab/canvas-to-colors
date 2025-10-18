# 🎨 Canvas to Colors

![Canvas to Colors](https://img.shields.io/badge/Canvas_to_Colors-Professional_Web_Studio-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![React](https://img.shields.io/badge/react-18.2.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue?style=for-the-badge&logo=typescript)

*Transformez n'importe quelle photo en planche de peinture numérotée prête à l'emploi*

[🚀 Démarrer](#-installation--configuration) • [📖 Documentation](#-pipeline-de-traitement-dimage) • [🎯 Fonctionnalités](#-fonctionnalités-principales) • [🤝 Contribuer](#-contribuer)

---
## ✨ À propos

**Canvas to Colors** est une application web professionnelle qui convertit automatiquement vos photos en planches de peinture numérotées personnalisables. Notre technologie combine un pipeline d'analyse colorimétrique avancé, un traitement d'image haute performance exécuté dans un Web Worker, et une interface moderne conçue avec shadcn/ui.

---

## 🎯 Objectif & Public Cible

| Objectif | Public Cible |
|----------|--------------|
| Génération de kits complets (zones, numéros, palette, exports) à partir d'une photo en quelques minutes | Studios créatifs |
| Contrôle fin des paramètres pour un résultat personnalisé | Boutiques d'impression à la demande |
| Interface intuitive pour une expérience utilisateur fluide | Artistes préparant des ateliers paint-by-numbers |
| Outils d'exportation variés pour une intégration facile | Équipes produit explorant la conversion d'images en artefacts physiques |

---

## 🌟 Fonctionnalités Principales

### 🎨 Analyse Intelligente des Couleurs
- Estimation de la complexité de l'image
- Recommandations automatiques de palette
- Détection des couleurs dominantes
- Analyse préliminaire avant tout traitement lourd

### ⚙️ Pipeline Paramétrable
- Contrôle précis du nombre de couleurs
- Configuration de la taille minimale des zones
- Options de lissage et de tolérance ΔE
- Palette "smart" avec effets de post-traitement (aquarelle, huile, crayon)

### 🖼️ Studio Interactif
- Panneaux redimensionnables pour une flexibilité maximale
- Navigation multi-vues (Original, Colorisé, Contours, Numéroté, Comparer)
- Inspection interactive des zones avec zoom/pan fluide
- Surbrillance animée des zones sélectionnées

### 💾 Gestion de Projets Avancée
- Sauvegarde locale avec auto-save optionnel
- Import/export de projets au format `.pbnproj`
- Historique cloud avec pagination via Supabase
- Préférences utilisateur persistées

### 📤 Exports Multi-Formats
- Génération directe en PNG haute qualité
- Export JSON structuré pour intégration
- Export SVG optimisé avec groupement par couleur
- Métadonnées enrichies pour chaque export

### 📊 Profiling & Monitoring
- Timeline détaillée des étapes de traitement
- Indicateurs de performance du cache LRU
- Statistiques mémoire en temps réel
- Panel de profilage dédié pour l'optimisation
---
## 🧪 Pipeline de Traitement d'Image
1. **Normalisation & Cache** – Décodage, correction EXIF, redimensionnement et génération de hash
2. **Quantification Perceptuelle** – K-means++ avec distance ΔE2000 et consolidation de palette
3. **Segmentation des Zones** – Flood fill optimisé avec calcul de centroïdes et surfaces
4. **Fusion Artistique** – Regroupement de régions selon ΔE et surface minimum
5. **Contours & Labels** – Marching Squares, union polygonale et placement optimisé des numéros
6. **Effets Optionnels** – Application non destructive d'effets artistiques
7. **Exports & Légende** – Génération des exports et mise en cache des résultats
---
## 🏗️ Architecture du Projet
```
src/
├─ components/             # UI métier
│  ├─ studio/              # Layout redimensionnable, onglets, export
│  └─ ui/                  # Composants shadcn/ui mutualisés
├─ contexts/               # État global (StudioContext)
├─ hooks/                  # Hooks personnalisés (auth, canvas, export)
├─ lib/                    # Traitement d'image, effets, cache
├─ workers/                # Web Workers pour le traitement d'image
├─ integrations/supabase/  # Client Supabase typé
├─ config/                 # Constantes de configuration
├─ pages/                  # Pages routées
└─ main.tsx / App.tsx      # Points d'entrée React
```
## 🛠️ Stack Technique
| Front-end | Traitement d'image | Backend |
|-----------|-------------------|---------|
| ![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react) | ![Canvas API](https://img.shields.io/badge/Canvas_API-FF6B6B?style=flat-square) | ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase) |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript) | ![ΔE2000](https://img.shields.io/badge/ΔE2000-Purple?style=flat-square) | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql) |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite) | ![Marching Squares](https://img.shields.io/badge/Marching_Squares-FF6B6B?style=flat-square) | ![RLS](https://img.shields.io/badge/Row_Level_Security-3FCF8E?style=flat-square) |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss) | ![Martinez Polygon](https://img.shields.io/badge/Martinez_Polygon-FF6B6B?style=flat-square) | |
| ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=flat-square) | ![Polylabel](https://img.shields.io/badge/Polylabel-FF6B6B?style=flat-square) | |
---
## 🎬 Expérience Utilisateur

1. **📤 Importer** une image (drag & drop) avec vérification automatique
2. **🔍 Analyser** automatiquement la palette et la complexité
3. **⚙️ Configurer** finement le pipeline via l'interface intuitive
4. **⚡ Traiter** l'image dans le Web Worker avec suivi de progression
5. **👁️ Explorer** le rendu avec les différentes vues disponibles
6. **💾 Sauvegarder & Partager** vos projets et exports
7. **📊 Profiler** les performances pour optimiser vos traitements
---
## 🚀 Installation & Configuration

### Prérequis

- Node.js 18+ 
- npm ou yarn
- Compte Supabase (optionnel)

### Installation

```bash
# Cloner le dépôt
git clone <repo-url>
cd canvas-to-colors

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos configurations Supabase

# Démarrer le serveur de développement
npm run dev
```
L'application sera disponible sur [http://localhost:5173](http://localhost:5173).

### Configuration Supabase (Optionnel)

```bash
# Démarrer Supabase en local
supabase start

# Appliquer les migrations
supabase db reset
```
## 📜 Commandes Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance Vite en mode développement |
| `npm run build` | Compile la version production |
| `npm run build:dev` | Build avec configuration development (profiling) |
| `npm run preview` | Sert la build production localement |
| `npm run lint` | Analyse le code avec ESLint |

---


**[⬆ Retour en haut](#-canvas-to-colors)**

