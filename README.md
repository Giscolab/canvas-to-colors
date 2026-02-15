# Canvas to Colors

![Canvas to Colors](https://img.shields.io/badge/Canvas_to_Colors-Professional_Web_Studio-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.0.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![React](https://img.shields.io/badge/react-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)

A professional web studio to transform images into paint-by-numbers outputs, with analysis, processing controls, and export workflows.

## Description

**Canvas to Colors** is a client-side image-processing application built with React, TypeScript, and Vite. It lets users upload raster or SVG files, analyze colors, apply recommendations, generate paint-by-numbers renders, and export results in multiple formats.

The app includes:
- Studio-style UI (left controls, center canvas/views, right analysis/debug panels, bottom export bar)
- Worker-based processing pipeline with progress updates
- Optional Supabase integration for authentication/profile data and SQL migrations for database policies

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Authors/Contributors](#authorscontributors)
- [Acknowledgments](#acknowledgments)

## Features

- Upload image sources (raster + SVG import/rasterization)
- Color analysis and recommendation workflow before processing
- Parameterized generation controls:
  - number of colors
  - minimum region size
  - smoothing and merge tolerance
  - artistic merge and effect options
- Processing progress tracking and profiler support
- Multiple view modes: `original`, `contours`, `numbered`, `colorized`, `compare`
- Export options:
  - PNG
  - JSON
  - SVG
  - ZIP bundle (from header/export actions)
- Local preferences and autosave behavior
- Theme support (light/dark/system)

## Technologies Used

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS + shadcn/ui + Radix UI

### Image / Geometry / Export
- Canvas API
- `marchingsquares`
- `martinez-polygon-clipping`
- `polylabel`
- `simplify-js`
- `jszip` + `file-saver`

### Backend Integration
- Supabase JavaScript client (`@supabase/supabase-js`)
- SQL migrations under `supabase/migrations/`

## Prerequisites

- Node.js 18+
- npm
- Modern browser
- (Optional) Supabase project for auth/profile and persisted DB features

## Installation

```bash
git clone <your-repository-url>
cd paint-by-numbers-generator
npm install
```

Run development server:

```bash
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

## Configuration

### 1) Environment variables

The Supabase client reads Vite environment variables:

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Create `.env` in the repository root:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

### 2) Core app constants

Centralized in `src/config/constants.ts` (examples: max file size, worker timeout, cache size, zoom bounds, export names).

### 3) Build and dev server settings

Configured in `vite.config.ts`:
- host: `::`
- port: `8080`
- sourcemaps enabled
- vendor manual chunking

### 4) Supabase project files

- `supabase/config.toml`
- `supabase/migrations/*.sql`

Migrations include tables/policies for `image_jobs` and `profiles` with RLS policies.

## Usage

### Main app flow

1. Start app with `npm run dev` and open the local URL.
2. Upload an image in the left panel.
3. Click **Analyze image** to generate metrics and recommendations.
4. Adjust settings, then run processing.
5. Switch visualization tabs/modes.
6. Export output (PNG/JSON/SVG/ZIP).

### Relevant script definitions (from `package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

### Routing entry points

```tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Manual validation scenario

A manual test scenario is documented in `docs/manual-tests.md` for large uniform color segmentation and queue behavior.

## Project Structure

```text
.
├── docs/
│   ├── demo.png
│   └── manual-tests.md
├── public/
├── src/
│   ├── components/
│   │   ├── studio/
│   │   └── ui/
│   ├── config/
│   ├── contexts/
│   ├── hooks/
│   ├── integrations/supabase/
│   ├── lib/
│   ├── pages/
│   ├── styles/
│   ├── types/
│   └── workers/
├── supabase/
│   ├── config.toml
│   └── migrations/
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

## API Documentation

This project does **not** expose a traditional REST API from this repository.

Available interfaces:
- **Frontend routes**: `/` and catch-all `*`.
- **Supabase auth usage** (client-side): sign-in, sign-up, sign-out through `supabase.auth` in `src/hooks/useAuth.ts`.
- **Database schema (Supabase migrations)**:
  - `public.image_jobs`
  - `public.profiles`

## Contributing

1. Fork the repository.
2. Create a branch:

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Validate with:

```bash
npm run lint
npm run build
```

5. If behavior changes in processing, run/extend `docs/manual-tests.md`.
6. Open a pull request with a clear summary and validation steps.

## License

MIT.

## Authors/Contributors

- **Franck** (credited in historical project README)
- Contributors via pull requests

## Acknowledgments

Open-source tools used in this project include React, TypeScript, Tailwind CSS, Supabase, shadcn/ui, Radix UI, Recharts, Martinez, and Polylabel.
