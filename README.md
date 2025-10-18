# 🎨 Canvas to Colors

Canvas to Colors est un studio web professionnel qui convertit n'importe quelle photo en planche de peinture numérotée prête à l'emploi. L'application marie un pipeline d'analyse colorimétrique avancé, un traitement d'image hautes performances exécuté dans un Web Worker et une interface pilotée par shadcn/ui pour accompagner illustrateurs, ateliers loisirs créatifs et imprimeurs d'art personnalisable.

## 🎯 Objectif & public cible
- **Objectif** : générer un kit complet (zones, numéros, palette, exports) à partir d'une photo en quelques minutes tout en conservant le contrôle fin des paramètres.
- **Public visé** : studios créatifs, boutiques d'impression à la demande, artistes souhaitant préparer des ateliers paint-by-numbers et équipes produit explorant la conversion d'images en artefacts physiques.

## ✨ Fonctionnalités principales
- **Analyse intelligente des couleurs** : estimation de la complexité, recommandations automatiques et détection des dominantes via `analyzeImageColors` avant tout traitement lourd.【F:src/lib/imageProcessing.ts†L204-L274】
- **Pipeline paramétrable** : contrôle du nombre de couleurs, taille minimale des zones, lissage, tolérance ΔE pour la fusion artistique, palette « smart » et effets de post-traitement aquarelle/huile/pencil.【F:src/contexts/StudioContext.tsx†L7-L108】【F:src/components/ParametersPanel.tsx†L1-L160】
- **Studio interactif** : panneaux redimensionnables, navigation multi-vues, inspection des zones, zoom/pan fluide et surbrillance animée grâce à `useCanvasInteractions` et `EnhancedViewTabs`.【F:src/hooks/useCanvasInteractions.ts†L1-L304】【F:src/components/studio/EnhancedViewTabs.tsx†L1-L160】
- **Gestion de projets** : sauvegarde locale, auto-save optionnel, import/export `.pbnproj`, préférences persistées et historique Supabase des traitements avec pagination.【F:src/components/studio/EnhancedProjectManager.tsx†L1-L200】【F:src/hooks/useAutoSave.ts†L1-L40】【F:src/hooks/useImageHistory.ts†L1-L96】
- **Exports multi-formats** : génération directe PNG, JSON structuré et SVG optimisé avec groupement par couleur et métadonnées enrichies.【F:src/hooks/useExport.ts†L1-L84】【F:src/lib/exportSvg.ts†L1-L208】
- **Profiling & monitoring** : timeline des étapes mesurées, indicateurs de cache LRU et statistiques mémoire via le panel de profilage dédié.【F:src/hooks/useProfiler.ts†L1-L204】【F:src/components/studio/ProfilerPanel.tsx†L1-L200】

## 🧪 Pipeline de traitement d'image
1. **Normalisation & cache** – Décodage de l'image, correction EXIF, redimensionnement max 1200px et génération d'un hash pour la clé LRU.【F:src/lib/imageProcessing.ts†L210-L248】【F:src/lib/imageProcessing.ts†L292-L347】
2. **Quantification perceptuelle** – K-means++ sur échantillonnage adaptatif avec distance ΔE2000 et consolidation des palettes proches.【F:src/lib/imageProcessing.ts†L400-L533】【F:src/lib/imageProcessing.ts†L340-L399】
3. **Segmentation des zones** – Flood fill optimisé qui bâtit labels/zones et calcule centroïdes et surfaces.【F:src/lib/imageProcessing.ts†L980-L1203】
4. **Fusion artistique** – Regroupement de régions voisines selon ΔE et surface minimum configurable (`artisticMerge`).【F:src/lib/regionMerge.ts†L1-L212】
5. **Contours & labels** – Marching Squares, union polygonale et placement optimisé des numéros avec `polylabel` pour garantir la lisibilité.【F:src/lib/imageProcessing.ts†L1504-L1702】
6. **Effets optionnels** – Application non destructive d'effets aquarelle/pinceau/huile/pencil sur le rendu final en fonction des réglages utilisateur.【F:src/lib/postProcessing.ts†L1-L196】【F:src/lib/artisticEffects.ts†L1-L200】
7. **Exports & légende** – Fusion preview, génération des légendes, export JSON/SVG/PNG et mise en cache structurée des résultats.【F:src/lib/imageProcessing.ts†L1703-L1849】【F:src/hooks/useExport.ts†L1-L84】

## 🗂️ Architecture du projet
```
src/
├─ components/             # UI métier (upload, palettes, studio, auth)
│  ├─ studio/              # Layout redimensionnable, tabs, export, debug, profiler
│  └─ ui/                  # Primitives shadcn/ui mutualisées
├─ contexts/               # `StudioContext` (état global & projets)
├─ hooks/                  # Auth, Supabase, canvas, export, auto-save, profiler
├─ lib/                    # Traitement d'image, effets, cache, export SVG
├─ workers/                # Worker `imageProcessor.worker.ts` orchestré par `imageProcessingWorker.ts`
├─ integrations/supabase/  # Client typé et définitions de schéma
├─ config/                 # Constantes (timeouts, limites, UI)
├─ pages/                  # Pages routées (Index, NotFound)
└─ main.tsx / App.tsx      # Entrées React & routing
```
Les styles globaux sont gérés via Tailwind (`tailwind.config.ts`, `index.css`) et shadcn/ui (`components.json`).【F:src/components/studio/ResizableStudioLayout.tsx†L1-L88】【F:src/lib/imageProcessingWorker.ts†L1-L188】

## 🧰 Stack technique
| Domaine | Technologies |
|---------|--------------|
| Front-end | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Traitement d'image | Canvas API, marchingsquares, martinez-polygon-clipping, simplify-js, polylabel, ΔE2000 custom | 
| États & hooks | Contexte React, hooks maison (auto-save, profiler, canvas) |
| Notifications & UI | sonner, Toaster shadcn, lucide-react |
| Backend-as-a-service | Supabase (Auth, Postgres, RLS, migrations) |

## 🧑‍💻 Expérience utilisateur
1. **Importer** une image (drag & drop) avec vérification de format et dimension max, preview immédiate et fiche technique.【F:src/components/ImageUpload.tsx†L1-L120】
2. **Analyser** automatiquement la palette : complexité, recommandations et mode vectoriel/photo appliqués aux réglages.【F:src/pages/Index.tsx†L33-L108】
3. **Configurer** finement le pipeline via sliders/toggles (palette intelligente, fusion artistique, effets, profilage).【F:src/components/ParametersPanel.tsx†L1-L200】
4. **Traiter** l'image dans le Web Worker avec suivi de progression, timeout adaptatif et confettis de succès.【F:src/lib/imageProcessingWorker.ts†L1-L188】【F:src/pages/Index.tsx†L109-L208】
5. **Explorer** le rendu : onglets Original/Colorisé/Contours/Numéroté/Comparer, inspection interactive et panel debug.【F:src/components/studio/EnhancedViewTabs.tsx†L1-L200】【F:src/components/studio/DebugPanel.tsx†L1-L160】
6. **Sauvegarder & partager** : auto-save, projets locaux, export `.pbnproj`, historique cloud et exports PNG/JSON/SVG.【F:src/components/studio/EnhancedProjectManager.tsx†L1-L200】【F:src/hooks/useExport.ts†L1-L84】
7. **Profiler** les performances : timeline par étape, ratio de cache hit et nettoyage de l'historique dans le panel dédié.【F:src/components/studio/ProfilerPanel.tsx†L1-L200】

## 🚀 Installation & configuration
1. **Cloner le dépôt**
   ```bash
   git clone <repo-url>
   cd canvas-to-colors
   ```
2. **Installer les dépendances**
   ```bash
   npm install
   ```
3. **Configurer l'environnement**
   - Créer un fichier `.env.local` :
     ```env
     VITE_SUPABASE_URL=... // URL du projet Supabase
     VITE_SUPABASE_PUBLISHABLE_KEY=... // clé anonyme
     ```
   - (Optionnel) Démarrer Supabase en local : `supabase start` puis `supabase db reset` pour appliquer les migrations fournies.
4. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```
   L'application est disponible sur [http://localhost:5173](http://localhost:5173).
5. **Build production**
   ```bash
   npm run build
   npm run preview
   ```

## 🗃️ Fonctionnalités Supabase
- **Authentification** : email/mot de passe avec persistance de session locale et toasts de feedback (`useAuth`).【F:src/hooks/useAuth.ts†L1-L84】
- **Profils utilisateurs** : table `profiles` (avatar, username) accessible via `useUserProfile` et protégée par RLS.【F:src/hooks/useUserProfile.ts†L1-L92】【F:src/integrations/supabase/types.ts†L1-L64】
- **Historique des traitements** : table `image_jobs` sauvegardant paramètres, temps de calcul et palette ; filtrage par utilisateur connecté et fallback pour anonymes.【F:src/hooks/useImageHistory.ts†L1-L96】【F:src/components/HistoryPanel.tsx†L1-L72】
- **Client typé** : `supabase` exposé via `integrations/supabase/client.ts` pour bénéficier de l'autocomplétion TypeScript.【F:src/integrations/supabase/client.ts†L1-L15】

## 📜 Commandes npm
| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance Vite en mode développement |
| `npm run build` | Compile la version production |
| `npm run build:dev` | Build avec configuration development (profiling) |
| `npm run preview` | Sert la build production localement |
| `npm run lint` | Analyse le code avec ESLint |

## ✅ Bonnes pratiques
- Reposer les opérations lourdes sur le Web Worker (`processImageWithWorker`) pour préserver la fluidité UI.【F:src/lib/imageProcessingWorker.ts†L1-L188】
- Tirer parti du `StudioContext` et des hooks utilitaires plutôt que du prop-drilling pour garder un état cohérent.【F:src/contexts/StudioContext.tsx†L37-L189】
- Exploiter la palette d'effets via `applyPaintEffect` / `applyArtisticEffect` uniquement sur des `ImageData` clonées afin de rester non destructif.【F:src/lib/postProcessing.ts†L1-L196】【F:src/lib/artisticEffects.ts†L1-L200】
- Utiliser les composants UI shadcn mutualisés (`@/components/ui`) pour conserver un design système homogène.【F:src/components/ParametersPanel.tsx†L1-L80】
- Profiler régulièrement grâce au panel dédié pour calibrer les tolérances et tailles de zones selon les cas d'usage.【F:src/components/studio/ProfilerPanel.tsx†L1-L200】

## 🔮 Prochaines phases
- **Build desktop** (Tauri/Electron) pour permettre une exécution hors-ligne.
- **Traitement batch** de plusieurs visuels avec file d'attente et notifications.
- **Automatisation d'impression** : export PDF multi-pages calibré pour ateliers.
