# Canvas to Colors

![Canvas to Colors](https://img.shields.io/badge/Canvas_to_Colors-Professional_Web_Studio-blue?style=for-the-badge)

Canvas to Colors is a web studio for transforming images into paint-by-numbers outputs. It combines a configurable color/region processing pipeline with an interactive React UI, multiple visualization modes, and export tools for printable or programmable outputs.

## Description

This project is built with **React + TypeScript + Vite** and focuses on generating paint-by-numbers assets from uploaded images (raster and SVG).

Core workflow:
1. Upload an image.
2. Analyze detected colors and recommendations.
3. Tune processing parameters (palette size, region size, smoothing, merge behavior, artistic effects).
4. Generate outputs (numbered, contour, colorized).
5. Export as PNG, JSON, or SVG.

The application includes optional Supabase integration for authentication/profile features and SQL migrations for persisted data structures and RLS policies.

## Installation

### Prerequisites

- Node.js 18+
- npm
- (Optional) Supabase project for auth/profile features

### Steps

```bash
git clone <your-repository-url>
cd paint-by-numbers-generator
npm install
```

Create a `.env` file in the project root for Supabase-powered features:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

If you want the database objects locally/in your Supabase project, apply migrations from:

```text
supabase/migrations/
```

## Usage

### Development

```bash
npm run dev
```

> Vite is configured to run on port `8080`.

### Build and preview

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

### Typical in-app flow

1. **Upload** an image (PNG/JPG or SVG).
2. Click **Analyze image** to generate analysis/recommendations.
3. Adjust studio parameters in the left panel.
4. Launch processing and monitor progress.
5. Use the export bar to save generated results.

## Features

- Interactive studio layout with dedicated panels and bottom export bar.
- Upload support for raster and SVG input (SVG rasterization is handled before processing).
- Color analysis + recommendation flow before generation.
- Worker-based processing with progress updates.
- Visualization modes: original, contours, numbered, colorized, compare.
- Zoom/pan interactions and processing profiler hooks.
- Exports:
  - PNG (`paint-by-numbers.png`)
  - JSON (`paint-by-numbers-data.json`)
  - SVG (`pbn-<timestamp>.svg`)
- Optional Supabase-backed auth/profile integration.
- Supabase SQL migrations with row-level security policies.

## Configuration

### App constants

Processing, UI, cache, canvas, and export defaults are centralized in:

```text
src/config/constants.ts
```

Examples include max file size, worker timeouts, zoom bounds, and default export filenames.

### Vite

Project build/dev behavior is configured in:

```text
vite.config.ts
```

Notable defaults:
- dev host: `::`
- dev port: `8080`
- source maps enabled
- manual vendor chunk splitting

### Tailwind and theme

Tailwind setup and design tokens are defined in:

```text
tailwind.config.ts
src/styles/theme-pro.css
```

### Supabase

- Client integration: `src/integrations/supabase/client.ts`
- Local project config: `supabase/config.toml`
- SQL schema/policies: `supabase/migrations/*.sql`

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-change
```

3. Implement changes following existing architecture patterns (components/hooks/lib/context split).
4. Validate locally:

```bash
npm run lint
npm run build
```

5. If processing behavior changes, run/extend manual checks in:

```text
docs/manual-tests.md
```

6. Commit with a clear message and open a pull request describing scope, rationale, and validation evidence.

## License

MIT.

If you distribute this project, keep the license information and consider adding/maintaining an explicit `LICENSE` file in the repository root for clarity.
