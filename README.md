# 🎨 Canvas to Colors

![Canvas to Colors](https://img.shields.io/badge/Canvas_to_Colors-Professional_Web_Studio-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.0.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![React](https://img.shields.io/badge/react-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)

> **Transform any image into professional paint-by-numbers outputs**  
> Studio-grade web application with advanced color analysis, parametric controls, and multi-format export.

---

## 🚀 Quick Overview

**Canvas to Colors** is a client-side image processing studio built with React, TypeScript, and Vite. It enables users to upload images, analyze colors, apply intelligent recommendations, generate paint-by-numbers renders, and export results in multiple formats.

Designed for **creative studios**, **print shops**, and **artists**, it combines scientific rigor with a fluid visual experience.

### ✨ Key Features

- 🎨 **Intelligent Color Analysis** – ΔE2000 color distance, K-means++ clustering, interactive histograms
- ⚙️ **Parametric Pipeline** – Adjustable colors, region merging, smoothing, artistic effects
- 🖼️ **Figma-like Canvas** – Zoom (10%-800%), smooth panning, overlays, region selection
- 💾 **Project Management** – Favorites, search, import/export workflows
- 📤 **Professional Exports** – PNG, JSON, SVG vector, ZIP bundles
- 📊 **Built-in Profiling** – Performance timeline, LRU cache monitoring
- 🌓 **Theme Support** – Dark/Light/System modes with unified HSL design tokens
- 👷 **Web Worker Processing** – Non-blocking pipeline with progress tracking

---

## 📸 Studio Preview

![Demo Screenshot](https://raw.githubusercontent.com/Giscolab/paint-by-numbers-generator/main/docs/demo.png)

---

## 📋 Table of Contents

- [Technologies Used](#-technologies-used)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Processing Pipeline](#-processing-pipeline)
- [Export Formats](#-export-formats)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧩 Technologies Used

### Frontend Core
- **React 18** – UI framework
- **TypeScript 5** – Type safety
- **Vite** – Build tool and dev server
- **React Router** – Client-side routing
- **Tailwind CSS** – Utility-first styling
- **shadcn/ui + Radix UI** – Component library

### Image Processing & Geometry
- **Canvas API** – Image manipulation
- **marchingsquares** – Contour extraction
- **martinez-polygon-clipping** – Polygon operations
- **polylabel** – Label placement
- **simplify-js** – Path simplification
- **jszip + file-saver** – Export generation

### Backend Integration
- **Supabase** – Authentication, profiles, storage
- **SQL Migrations** – Database schema management (`supabase/migrations/`)

### Performance
- **Web Workers** – Background processing
- **LRU Cache** – Optimized data caching
- **Custom Profiler** – Performance monitoring

---

## ✅ Prerequisites

- **Node.js 18+**
- **npm** or yarn
- **Modern browser** (Chrome, Edge, Firefox, Safari)
- **(Optional)** Supabase project for authentication and profile features

---

## ⚡ Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd paint-by-numbers-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

Access the application at **http://localhost:8080**

### Build Commands

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🔧 Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

These variables are consumed by the Supabase client:

```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

### 2. Application Constants

Core settings are centralized in `src/config/constants.ts`:

```typescript
export const APP_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  WORKER_TIMEOUT: 60000,           // 60s
  CACHE_SIZE: 100,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 8.0,
  // ...
};
```

### 3. Vite Configuration

Build and dev server settings in `vite.config.ts`:

- **Host**: `::` (all interfaces)
- **Port**: `8080`
- **Source maps**: enabled
- **Chunking**: manual vendor splitting

### 4. Supabase Configuration

Database schema and policies are managed via migrations in `supabase/migrations/`:

- `image_jobs` table with RLS policies
- `profiles` table with user data
- See `supabase/config.toml` for project settings

---

## 🎯 Usage

### Workflow

1. **Upload Image** – Click upload in the left panel (supports raster + SVG)
2. **Analyze Colors** – Click "Analyze image" to generate metrics and recommendations
3. **Adjust Parameters** – Set number of colors, region size, smoothing, artistic effects
4. **Process Image** – Run the processing pipeline (watch progress in real-time)
5. **Explore Views** – Switch between visualization modes:
   - `original` – Source image
   - `contours` – Region boundaries
   - `numbered` – Paint-by-numbers labels
   - `colorized` – Flat color regions
   - `compare` – Side-by-side comparison
6. **Export Results** – Download PNG, JSON, SVG, or ZIP bundle

### Routing

```tsx
// src/App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Authentication (Optional)

If Supabase is configured, use the auth hooks:

```typescript
// src/hooks/useAuth.ts
const { signIn, signUp, signOut, user } = useAuth();
```

---

## 📁 Project Structure

```
.
├── docs/
│   ├── demo.png                    # Screenshot
│   └── manual-tests.md             # Test scenarios
├── public/                         # Static assets
├── src/
│   ├── components/
│   │   ├── studio/                 # Main studio components
│   │   └── ui/                     # shadcn/ui components
│   ├── config/
│   │   └── constants.ts            # App configuration
│   ├── contexts/                   # React contexts
│   ├── hooks/                      # Custom hooks
│   ├── integrations/supabase/      # Supabase client & types
│   ├── lib/                        # Utilities
│   ├── pages/                      # Route pages
│   ├── styles/                     # Global styles
│   ├── types/                      # TypeScript definitions
│   └── workers/                    # Web Workers
├── supabase/
│   ├── config.toml                 # Supabase config
│   └── migrations/                 # SQL migrations
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔬 Processing Pipeline

The application follows a **7-stage optimized pipeline**:

1. **Normalization & Caching** – Image preprocessing and cache lookup
2. **Color Quantization** – K-means++ clustering with ΔE2000 color distance
3. **Region Segmentation** – Connected component analysis and merging
4. **Contour Extraction** – Marching squares algorithm for boundaries
5. **Label Placement** – Intelligent positioning using polylabel
6. **Artistic Effects** – Paint texture, smoothing, and style filters
7. **Multi-format Export** – PNG, JSON, SVG generation

Each stage is profiled and monitored for performance optimization.

---

## 📦 Export Formats

### PNG
High-resolution raster output with numbered regions.

### JSON
Structured data including:
```json
{
  "palette": [...],
  "regions": [...],
  "metadata": {...}
}
```

### SVG
Vector format with:
- Layered paths per color
- Embedded palette
- Scalable output

### ZIP Bundle
Combined package containing:
- PNG render
- JSON data
- SVG vector
- Metadata file

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Validate** your code:
   ```bash
   npm run lint
   npm run build
   ```
5. **Test** manually using scenarios in `docs/manual-tests.md`
6. **Push** to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request with a clear description

### Code Guidelines

- ✅ Use TypeScript strict mode
- ✅ Avoid hardcoded colors (use HSL design tokens)
- ✅ Document complex functions
- ✅ Profile performance-critical code
- ✅ Write clear commit messages (conventional commits)

---

## 📄 License

**MIT** © 2025

See [LICENSE](./LICENSE) for details.

---

## 👥 Authors & Contributors

- **Franck** – Original author and maintainer
- Open source contributors via Pull Requests

---

## 🙏 Acknowledgments

Built with amazing open-source tools:

**React** • **TypeScript** • **Vite** • **Tailwind CSS** • **Supabase** • **shadcn/ui** • **Radix UI** • **Recharts** • **Martinez** • **Polylabel** • **Simplify.js** • **JSZip**

Thank you to the open-source community ❤️

---

**[⬆ Back to top](#-canvas-to-colors)**