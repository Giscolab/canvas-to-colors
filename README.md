# 🎨 Paint by Numbers Generator — Pro Edition

Application web riche construite avec **React, TypeScript, Vite et Tailwind CSS** pour transformer n'importe quelle photo en modèle Paint by Numbers haute fidélité. Le projet combine un pipeline de traitement d'image avancé, une interface soignée propulsée par shadcn/ui et des fonctionnalités Premium (authentification, historique cloud, export multi-formats).

---

## 📚 Sommaire

1. [Aperçu rapide](#-aperçu-rapide)
2. [Fonctionnalités clés](#-fonctionnalités-clés)
3. [Expérience utilisateur](#-expérience-utilisateur)
4. [Pipeline de traitement d'image](#-pipeline-de-traitement-dimage)
5. [Architecture & organisation](#-architecture--organisation)
6. [Technologies principales](#-technologies-principales)
7. [Prérequis & installation](#-prérequis--installation)
8. [Configuration Supabase](#-configuration-supabase)
9. [Scripts npm disponibles](#-scripts-npm-disponibles)
10. [Qualité & bonnes pratiques](#-qualité--bonnes-pratiques)
11. [Aller plus loin](#-aller-plus-loin)

---

## ⚡ Aperçu rapide

- **Objectif** : générer en quelques clics un kit complet de peinture numérotée (zones, palette, exports) à partir d'une photo personnelle.
- **Interface** : tableau de bord ergonomique avec panneaux contextuels, notifications sonner, confettis de succès et mode sombre.
- **Performance** : traitement intensif déporté dans un Web Worker, cache LRU pour rejouer instantanément les paramètres déjà calculés et normalisation EXIF automatique.

---

## ✨ Fonctionnalités clés

### Traitement et analyse d'image
- Import par glisser-déposer avec normalisation (`resizeForDisplay`) et vérification de taille maximale (`IMAGE_PROCESSING.MAX_FILE_SIZE_MB`).
- Analyse colorimétrique proactive (`analyzeImageColors`) : détection des dominantes, complexité et recommandations auto-appliquées (nombre optimal de couleurs, taille de zones).
- Pipeline paramétrable : nombre de couleurs, taille minimale des régions, douceur des contours et suivi de progression en temps réel (`ProcessingProgress`).
- Timeout configurable de **5 minutes** pour les traitements complexes (ajustable via `WORKER_TIMEOUT_MS`).

### Studio Mode — Interface professionnelle
- **Layout redimensionnable** (`ResizableStudioLayout`) : panneaux gauche/droite ajustables avec persistance des positions.
- **Contexte global** (`StudioContext`) : gestion centralisée de l'état (projet actif, vue, paramètres, préférences utilisateur).
- **Tabs améliorés** (`EnhancedViewTabs`) : 5 modes de visualisation avec cache intelligent pour navigation instantanée :
  - **Original** : image source
  - **Colorisé** : rendu avec palette quantifiée
  - **Contours** : tracés vectoriels des zones
  - **Numéroté** : modèle final avec labels
  - **Comparer** : slider avant/après interactif
- **Overlay d'inspection** (`InspectionOverlay`) : survol interactif affichant numéro de zone, couleur HEX, surface en temps réel.
- **Mode Debug scientifique** (`DebugPanel`) : visualisation des étapes intermédiaires du pipeline (quantification, fusion, lissage).

### Gestion de projets & persistance
- **Gestionnaire de projets avancé** (`EnhancedProjectManager`) :
  - Sauvegarde/chargement de projets locaux (localStorage)
  - Export/import de fichiers `.pbnproj` (JSON complet)
  - **Auto-sauvegarde** toutes les 2 minutes (activable/désactivable)
  - Gestion des préférences utilisateur (thème, dernière vue, dernier projet)
- Format de projet structuré : image, paramètres, résultats, analyse colorimétrique.
- Persistance automatique des préférences entre sessions.

### Restitution graphique
- Zoom, pan, remise à zéro, plein écran, surbrillance animée des zones ou couleurs (`useCanvasInteractions`).
- Palette dynamique avec sélection, stats par couleur et liste des zones associées (`ColorPalette`, `PalettePanel`).

### Export & productivité
- Export PNG, JSON et SVG (structure de zones, palette, paramètres) via `useExport`.
- Historique des traitements sauvegardé dans Supabase (`useImageHistory`) avec pagination et tri antichronologique (`HistoryPanel`).
- Notifications toast/success & confettis réglés via `UI.CONFETTI_*`.

### Authentification & profils
- Auth email/mot de passe gérée par Supabase (`useAuth`).
- Panneau de connexion/inscription (`AuthPanel`) et mise à jour du profil (`ProfilePanel`).
- Stratégies RLS côté base (migrations Supabase) garantissant que chaque utilisateur ne voit que ses jobs.

---

## 🖥️ Expérience utilisateur

1. **Charger une image** : support PNG/JPG jusqu'à 16 MP, feedback immédiat et preview.
2. **Analyser automatiquement** : recommandations intelligentes appliquées aux sliders de paramètres.
3. **Lancer le traitement** : suivi étape par étape avec messages d'avancement (timeout max : 5 minutes).
4. **Explorer le rendu** : 
   - Navigation fluide entre 5 modes de visualisation (Original, Colorisé, Contours, Numéroté, Comparer)
   - Inspection interactive : survolez une zone pour voir ses métadonnées (numéro, couleur, surface)
   - Zoom, pan, surbrillance de zones/couleurs, stats détaillées
   - Comparateur avant/après avec slider ajustable
5. **Gérer ses projets** :
   - Sauvegarde manuelle ou automatique (toutes les 2 min)
   - Export/import de projets complets (.pbnproj)
   - Liste des projets enregistrés avec aperçu
6. **Mode Debug** : visualisation des étapes intermédiaires du pipeline pour diagnostic et optimisation.
7. **Exporter et sauvegarder** : téléchargement PNG/JSON/SVG, stockage de l'opération dans l'historique cloud.

---

## 🧠 Pipeline de traitement d'image

Le cœur métier réside dans `src/lib/imageProcessing.ts` et le worker `src/workers/imageProcessor.worker.ts` :

| Étape | Description | Bibliothèques / modules |
|-------|-------------|--------------------------|
| 1. Normalisation | Correction EXIF, redimensionnement, hashage pour le cache | `imageNormalization.ts`, Canvas API |
| 2. Quantification | K-means++ + distance perceptuelle ΔE2000 | `colorUtils.ts`, `perceptualDistance` |
| 3. Segmentation | Détection de régions et contours | `marchingsquares`, flood-fill maison |
| 4. Fusion topologique | Union de polygones adjacents | `martinez-polygon-clipping` |
| 5. Simplification | Lissage adaptatif des contours | `simplify-js` |
| 6. Placement des labels | Centre de gravité perceptuel | `polylabel` |
| 7. Cache & export | LRU cache, exports SVG/PNG/JSON, logging progress | `lruCache.ts`, hooks `useExport` |

Toutes les opérations lourdes se font dans un Web Worker (`processImageWithWorker`) qui diffuse des événements de progression vers l'UI.

---

## 🏗️ Architecture & organisation

```
src/
├─ components/
│  ├─ studio/              # Composants Studio Mode (Phase 2)
│  │  ├─ ResizableStudioLayout.tsx   # Layout avec panneaux redimensionnables
│  │  ├─ EnhancedViewTabs.tsx        # Système de tabs avec cache intelligent
│  │  ├─ EnhancedProjectManager.tsx  # Gestionnaire de projets avancé
│  │  ├─ InspectionOverlay.tsx       # Overlay d'inspection interactif
│  │  ├─ CompareSlider.tsx           # Comparateur avant/après
│  │  ├─ DebugPanel.tsx              # Panel de debug scientifique
│  │  ├─ ExportBar.tsx               # Barre d'export multi-formats
│  │  └─ ...                         # ProjectManager, ViewTabs, StudioLayout (legacy)
│  ├─ ui/                  # Primitives shadcn/ui (button, card, tabs, etc.)
│  └─ ...                  # Canvas, Upload, Panels, Auth, etc.
├─ contexts/
│  └─ StudioContext.tsx    # Contexte global (état, préférences, projets)
├─ hooks/
│  ├─ useAutoSave.ts       # Hook d'auto-sauvegarde intelligente
│  └─ ...                  # useAuth, useExport, useCanvasInteractions, etc.
├─ lib/                    # Traitement d'image, cache, utilitaires couleurs
├─ workers/                # Web Worker de génération
├─ config/                 # Constantes globales (UI, image, export, timeouts)
├─ integrations/supabase/  # Client Supabase typé + types générés
├─ pages/                  # Pages routées (Index, NotFound)
└─ main.tsx                # Entrée React/Vite
```

### Architecture de contexte (Phase 2)
Le `StudioContext` centralise :
- **État projet** : projet actif, vue sélectionnée, résultats de traitement
- **Paramètres** : nombre de couleurs, taille régions, lissage, tolérance de fusion
- **Préférences utilisateur** : thème, dernière vue, auto-sauvegarde, dernier projet
- **Actions** : sauvegarde/chargement de projets, gestion des préférences

Tous les composants Studio accèdent à ce contexte via `useStudio()`, éliminant le prop-drilling et garantissant la cohérence de l'état.

Autres dossiers :
- `supabase/` — configuration CLI + migrations SQL (tables `profiles`, `image_jobs`, politiques RLS).
- `components.json` — configuration shadcn/ui.
- `tailwind.config.ts`, `postcss.config.js` — pipeline CSS.

---

## 🛠️ Technologies principales

| Domaine | Stack |
|---------|-------|
| Front-end | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Visualisation | Canvas API, custom hooks d'interactions, lucide-react |
| Traitement d'image | marchingsquares, martinez-polygon-clipping, simplify-js, polylabel, ΔE2000 |
| Etat & formulaires | React Hook Form, sonner/toaster pour feedback |
| Backend-as-a-service | Supabase (Auth, Postgres, RLS, migrations) |

---

## 📦 Prérequis & installation

1. **Cloner le dépôt**
   ```bash
   git clone <repo-url>
   cd canvas-to-colors
   ```
2. **Installer les dépendances**
   ```bash
   npm install
   ```
3. **Configurer l'environnement** (voir section Supabase ci-dessous).
4. **Lancer le serveur de dev**
   ```bash
   npm run dev
   ```
   L'application est accessible sur [http://localhost:5173](http://localhost:5173).

Pour une build production : `npm run build` puis `npm run preview`.

---

## 🔐 Configuration Supabase

1. Créez un projet Supabase (ou utilisez la config fournie `supabase/config.toml`).
2. Copiez les variables d'environnement dans un fichier `.env.local` à la racine :
   ```env
   VITE_SUPABASE_URL=<https://...supabase.co>
   VITE_SUPABASE_PUBLISHABLE_KEY=<clé-anonyme>
   ```
3. Optionnel : pour un environnement local complet, installez le [CLI Supabase](https://supabase.com/docs/guides/cli) puis exécutez :
   ```bash
   supabase start
   supabase db reset   # applique les migrations du dossier supabase/migrations
   ```
4. Mettez à jour les politiques ou schémas via `supabase migration new` puis `supabase db push`.

Les migrations fournies créent les tables `profiles` & `image_jobs` avec politiques RLS garantissant la confidentialité des historiques.

---

## 🧩 Scripts npm disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre Vite en mode développement |
| `npm run build` | Génère la build production |
| `npm run build:dev` | Build avec configuration `development` (profilage) |
| `npm run preview` | Sert la build de production localement |
| `npm run lint` | Vérifie le code avec ESLint |

---

## ✅ Qualité & bonnes pratiques

- Respectez la configuration ESLint/TypeScript fournie (`eslint.config.js`, `tsconfig.*`).
- Les composants UI réutilisent les primitives shadcn : privilégiez `@/components/ui/*` pour homogénéité.
- Utilisez les hooks maison (`useAuth`, `useImageHistory`, `useCanvasInteractions`, `useAutoSave`, etc.) plutôt que de réinventer la roue.
- **Architecture de contexte** : accédez à l'état global via `useStudio()` plutôt que du prop-drilling.
- Pour de nouvelles opérations de traitement, pensez au Web Worker (`processImageWithWorker`) afin de garder l'UI fluide.
- **Persistance** : le `StudioContext` gère automatiquement la sauvegarde des préférences dans localStorage.
- **Cache intelligent** : `EnhancedViewTabs` utilise un cache mémoire pour éviter les recalculs lors de la navigation.

---

## 🚀 Aller plus loin

### Phase 3 — Roadmap envisagée
- **Post-processing AI** : colorisation adaptative, segmentation intelligente.
- **Export avancé** : génération SVG optimisée, presets d'impression (PDF, planches A4/A3).
- **UX avancée** : mini-map de navigation, mode focus plein écran, statistiques détaillées du pipeline.
- **Collaboration** : mode collaboratif via Supabase Realtime (partage de palettes & historiques).
- **Tests** : couverture unitaire (Vitest) pour sécuriser le pipeline de traitement d'image.

### État actuel du projet
✅ **Phase 1 complétée** : pipeline d'image robuste, UI modulaire, auth/historique.  
✅ **Phase 2 complétée** : Studio Mode interactif, gestion de projets, persistance, debug scientifique.  
🚧 **Phase 3 en préparation** : post-processing AI, export SVG avancé, UX pro.

Bonnes créations !

