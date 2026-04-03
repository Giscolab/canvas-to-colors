

# 4 nouvelles fonctionnalites : Import URL, Webcam, Export PDF, Export multi-resolution

## Vue d'ensemble

Ajout de 4 flux a l'application Paint by Numbers existante, dans une logique d'outil creatif personnel.

---

## 1. Import par URL

**Fichiers concernes :**
- `src/components/ImageUpload.tsx` — ajouter un champ URL avec bouton "Charger"
- `src/pages/Index.tsx` — nouvelle fonction `handleImageFromUrl`

**Fonctionnement :**
- Un champ texte + bouton "Importer" apparait sous la zone de drag-and-drop existante
- Au clic : fetch CORS via `fetch(url)` → conversion en `Blob` → creation d'un `File` objet
- Appel du meme `onImageSelect(file)` que le flux existant
- Gestion d'erreurs : URL invalide, CORS bloque, format non supporte, taille excessive
- Proxy fallback : si CORS echoue, tenter via une Edge Function `fetch-image-url` qui telecharge cote serveur et retourne le blob (evite les restrictions CORS navigateur)

**Edge Function `supabase/functions/fetch-image-url/index.ts` :**
- Accepte `{ url: string }` en POST
- Valide le format (PNG/JPG/SVG uniquement), limite de taille (20MB)
- Fetch cote serveur, retourne le contenu en `application/octet-stream`
- CORS headers inclus

---

## 2. Import Webcam

**Fichiers concernes :**
- Nouveau : `src/components/WebcamCapture.tsx`
- `src/components/ImageUpload.tsx` — bouton "Webcam" qui ouvre le composant
- `src/pages/Index.tsx` — integration du flux capture

**Fonctionnement :**
- Composant modal utilisant `navigator.mediaDevices.getUserMedia({ video: true })`
- Preview video live dans un element `<video>`
- Bouton "Capturer" : dessine le frame sur un `<canvas>`, exporte en `canvas.toBlob("image/png")`, cree un `File`
- Bouton "Reprendre" pour refaire la capture
- Bouton "Valider" appelle `onImageSelect(file)` et ferme le modal
- Gestion de permission refusee (message explicatif)
- Nettoyage du stream `MediaStream.getTracks().forEach(t => t.stop())` au unmount

---

## 3. Export PDF pret a imprimer

**Fichiers concernes :**
- Nouvelle dependance : `jspdf` (generation PDF cote client, pas de backend)
- Nouveau : `src/lib/exportPdf.ts`
- `src/components/studio/ExportBar.tsx` — bouton "Export PDF"
- `src/components/Header.tsx` — option PDF dans le dropdown ZIP

**Fonctionnement de `exportPdf.ts` :**
- Fonction `exportToPdf(result: ProcessedResult, studio, options)` retourne un `Blob`
- **Page 1 : Image colorisee** — rendu du canvas "colorized" a l'echelle, centre sur A4 (210x297mm)
- **Page 2 : Contours numerotes** — rendu "numbered" pret a peindre
- **Page 3 : Legende / Palette** — tableau des couleurs avec numeros, echantillons couleur, noms hex, pourcentage de surface
- **Page 4 (optionnelle) : Instructions** — "Comment utiliser ce modele", conseils de peinture
- Parametres : format papier (A4/A3/Letter), orientation (portrait/paysage), inclusion/exclusion des pages
- Utilisation de `jspdf` pour la generation, avec `canvas.toDataURL()` pour les images bitmap

**Integration UI :**
- Dialog "Export PDF" avec choix de format papier et pages a inclure
- Bouton dans ExportBar et dans le dropdown du Header

---

## 4. Export multi-resolution / configurable

**Fichiers concernes :**
- `src/components/studio/ExportBar.tsx` — enrichir le dialogue existant "Export avance"
- `src/hooks/useExport.ts` — nouvelles options

**Fonctionnement :**
- Le dialogue existant (echelle + couleur de fond) est enrichi avec :
  - **Presets DPI** : 72 (web), 150 (ecran), 300 (impression), personnalise
  - **Choix des layers** : checkboxes pour inclure/exclure contours, numerotation, palette, colorisation
  - **Dimensions en cm/pouces** : calcul automatique base sur DPI et taille image
  - **Format de sortie** : PNG, SVG, PDF (reutilise le module de l'etape 3)
- Export ZIP configurable : l'utilisateur coche les combinaisons souhaitees
- Le bouton "Export" genere le(s) fichier(s) selon la configuration

---

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/components/ImageUpload.tsx` | Ajouter champ URL + bouton Webcam |
| `src/components/WebcamCapture.tsx` | **Creer** — composant modal capture webcam |
| `supabase/functions/fetch-image-url/index.ts` | **Creer** — proxy CORS pour import URL |
| `src/lib/exportPdf.ts` | **Creer** — generation PDF multi-pages avec jspdf |
| `src/components/studio/ExportBar.tsx` | Ajouter bouton PDF + enrichir dialogue multi-resolution |
| `src/components/Header.tsx` | Ajouter option PDF dans le dropdown |
| `src/hooks/useExport.ts` | Ajouter `exportPDF` |
| `src/pages/Index.tsx` | Handler import URL + webcam |
| `package.json` | Ajouter `jspdf` |

## Ordre d'implementation

1. Import par URL (+ Edge Function proxy)
2. Import Webcam
3. Export PDF
4. Export multi-resolution (enrichissement du dialogue existant)

