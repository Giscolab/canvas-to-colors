
# Integration du BruteImageSignalAnalyzer dans Canvas to Colors

## Contexte

Le fichier Python fournit une analyse de signal image brute en 6 sections :
1. **Proprietes physiques** (dimensions, dtype, plage de valeurs)
2. **Statistiques descriptives** (moyenne, variance, skewness, kurtosis, symboles uniques par canal)
3. **Theorie de l'information** (entropie de Shannon par canal)
4. **Energie spectrale** (FFT 2D, ratio basses/hautes frequences)
5. **Gradient spatial** (Sobel, magnitude et orientation)
6. **Correlation inter-canaux** (matrice de Pearson)

Le projet a deja une analyse colorimetrique (`analyzeImageColors` dans `imageProcessing.ts`) qui couvre partiellement les points 1, 2, 3 et 5. Il manque les points 4 (FFT spectrale) et 6 (correlation canaux), et les statistiques existantes sont incompletes (pas de skewness, kurtosis, variance par canal).

## Problemes a corriger (build errors)

### 1. Erreur TypeScript `sourceType`
Dans `Index.tsx` (lignes 94 et 116), `isVectorSource ? "vector" : "raster"` retourne `string` au lieu de `"vector" | "raster"`. Il faut ajouter un cast `as const` ou une annotation de type explicite.

### 2. Repertoire `supabase/functions` manquant
Le build signale l'absence de `supabase/functions`. Il faut creer un repertoire minimal avec une fonction placeholder ou ajuster la configuration.

## Plan d'implementation

### Etape 1 : Corriger les build errors

**Fichier `src/pages/Index.tsx`** :
- Ligne 94 : caster `sourceType` avec `as const` pour que TypeScript infere le type litteral :
```typescript
sourceType: isVectorSource ? "vector" as const : "raster" as const,
```
- Ligne 116 : meme correction sur le second objet.

**Repertoire `supabase/functions`** :
- Creer un fichier `supabase/functions/.gitkeep` pour que le repertoire existe.

### Etape 2 : Creer le module `src/lib/bruteSignalAnalyzer.ts`

Port TypeScript du script Python, adapte pour fonctionner avec l'API Canvas/ImageData du navigateur (pas de numpy/scipy/cv2).

Le module exportera :
- Un type `BruteSignalReport` contenant les 6 sections
- Une fonction `analyzeBruteSignal(imageData: ImageData): BruteSignalReport`

Implementations par section :

| Section Python | Implementation TypeScript |
|---|---|
| `get_physical_properties()` | Extraction directe depuis `ImageData` (width, height, channels=4 RGBA, dtype toujours uint8 en canvas) |
| `get_raw_statistics()` | Boucle sur `ImageData.data` par canal R/G/B(/A) : moyenne, variance, ecart-type, min, max, skewness, kurtosis, symboles uniques |
| `get_raw_entropy()` | Histogramme 256 bins par canal, calcul Shannon `H = -sum(p * log2(p))` |
| `get_spectral_energy()` | FFT 2D en pur JS (implementation Cooley-Tukey radix-2 sur chaque canal), ratio energie basse/haute frequence |
| `get_gradient_stats()` | Filtre Sobel 3x3 en JS (gx, gy), magnitude et orientation par canal |
| `get_channel_correlation()` | Coefficient de Pearson entre chaque paire de canaux R-G, R-B, G-B |

Notes techniques importantes :
- La FFT 2D sera implementee en pur TypeScript (pas de dependance externe). Pour les images qui ne sont pas des puissances de 2, on zero-paddera a la puissance de 2 superieure.
- Le calcul sera fait sur le thread principal mais optimise avec des `Float64Array` pour eviter les allocations.
- Les canaux seront R=0, G=1, B=2 (on ignore A=3 sauf si specifiquement demande).

### Etape 3 : Integrer dans le pipeline d'analyse existant

**Fichier `src/lib/imageProcessing.ts`** :
- Enrichir le type `ColorAnalysis` avec un champ optionnel :
```typescript
bruteSignal?: BruteSignalReport;
```
- Dans `analyzeImageColors()`, appeler `analyzeBruteSignal(imageData)` apres le comptage des couleurs et stocker le resultat dans l'objet retourne.

### Etape 4 : Afficher les resultats dans le panneau d'analyse

**Fichier `src/components/ColorAnalysisPanel.tsx`** :
- Ajouter une nouvelle section "Analyse du signal" dans le panneau existant, apres les mesures actuelles.
- Afficher les sections du rapport brut dans des sous-blocs accordeons :
  - **Proprietes physiques** : dimensions, canaux, plage de valeurs
  - **Statistiques par canal** : tableau R/G/B avec moyenne, variance, ecart-type, skewness, kurtosis, symboles uniques
  - **Entropie Shannon** : valeur par canal + visualisation
  - **Energie spectrale** : ratio basses/hautes frequences par canal avec barre de progression
  - **Gradient spatial** : magnitude et orientation moyennes par canal
  - **Correlation canaux** : matrice de correlation R-G, R-B, G-B

### Etape 5 : Connecter les recommandations

**Fichier `src/lib/imageProcessing.ts`** (`getRecommendationsFromAnalysis`)** :
- Utiliser les nouvelles metriques pour affiner les recommandations :
  - Ratio haute frequence eleve -> augmenter `minRegionSize` (image bruitee)
  - Kurtosis eleve -> ajuster `numColors` (distribution a queue lourde)
  - Forte correlation inter-canaux -> reduire `numColors` (image peu chromatique)

## Resume des fichiers modifies/crees

| Fichier | Action |
|---|---|
| `src/pages/Index.tsx` | Fix cast `sourceType` (2 lignes) |
| `supabase/functions/.gitkeep` | Creer (repertoire vide) |
| `src/lib/bruteSignalAnalyzer.ts` | **Creer** - Port TypeScript complet du script Python |
| `src/lib/imageProcessing.ts` | Enrichir `ColorAnalysis` + appel dans `analyzeImageColors()` |
| `src/components/ColorAnalysisPanel.tsx` | Ajouter section "Analyse du signal" avec accordeons |

## Section technique : FFT 2D en TypeScript

L'implementation FFT sera basee sur l'algorithme Cooley-Tukey radix-2 :
- Input : tableau 1D `Float64Array` de longueur N (puissance de 2)
- Pour la 2D : FFT sur chaque ligne, puis FFT sur chaque colonne
- Zero-padding automatique a la puissance de 2 superieure
- Le resultat sera le module au carre (energie spectrale)
- Decoupe spectrale : masque circulaire a 1/8 de la dimension minimale

Cette approche est plus lente que numpy/scipy mais suffisante pour les tailles d'image du projet (max 1200x1200 apres normalisation, soit ~1.4M pixels par canal).
