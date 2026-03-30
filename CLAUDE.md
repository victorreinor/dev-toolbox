# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check + build (tsc -b && vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

There is no test suite currently.

## Architecture

**DevUtils** is a client-side SPA for data conversion (JSON↔CSV↔XLSX↔SQL) and document generation (CPF/CNPJ). All processing runs in the browser — no data leaves the device.

### Tool Registry Pattern

Each tool lives in `src/tools/<tool-id>/` and exports:
- `meta.ts` — `ToolMeta` object with id, name, description, category, icon, keywords, and a `lazy()` component reference
- `index.tsx` — The React UI component
- `processor.ts` (optional) — Pure logic (used in generators and json-to-sql)

`src/registry.ts` aggregates all `ToolMeta` objects and exports `getToolById()` and `searchTools()`. Adding a new tool requires creating the module and registering it in `registry.ts`.

### Routing

`App.tsx` uses React Router v7 with two routes:
- `/` → Home grid of all tools
- `/tools/:id` → Tool page (component loaded lazily via `React.lazy` + `Suspense`)

### Performance Strategy for Large Files

Heavy processing is offloaded to Web Workers (`src/workers/`):
- `csvParser.worker.ts` — PapaParse for CSV parsing/generation
- `xlsxParser.worker.ts` — SheetJS for XLSX operations

`useWorker.ts` is the generic abstraction over the worker lifecycle. `useFileStream.ts` reads files in 2MB chunks to avoid blocking the UI.

### Key Shared Components

- `ToolLayout` — Standard wrapper (title, description, category badge) used by every tool
- `GeneratorTool` — Base component for CPF/CNPJ generators
- `FileDropzone` + `usePageDrop` — Handles drag-and-drop at component and page level
- `CodeEditor` — Textarea with syntax highlighting for JSON/text input
- `OutputActions` — Standardized copy-to-clipboard + download buttons
- `SearchModal` — Global ⌘K search over tool keywords

### TypeScript Strictness

`tsconfig.app.json` enables `strict`, `noUnusedLocals`, and `noUnusedParameters`. All unused imports/variables are compile errors.
