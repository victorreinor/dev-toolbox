# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose & Core Principle

DevUtils is a pack of everyday tools for developers — fast, local, and non-blocking. The product promise is: **upload large files or large text blobs and get instant results without freezing the browser.**

**This is a hard architectural constraint:** any feature that processes data (parsing, converting, transforming, validating, generating) MUST run off the main thread. Never process files or large strings synchronously on the main thread.

### Mandatory rules for every new tool

1. **File uploads → Web Worker.** Any tool that accepts file input must offload parsing/processing to a dedicated worker in `src/workers/`. Use `useWorker.ts` as the abstraction.
2. **Large text/string input → Web Worker.** If a tool processes text that could realistically exceed ~50 KB (JSON, SQL, CSV, logs, etc.), the transformation logic belongs in a worker, not in a React component or a plain `processor.ts` called on the main thread.
3. **File reading → `useFileStream.ts`.** Read files in 2 MB chunks; never load the entire binary into memory at once.
4. **UI stays responsive.** Progress indicators must be shown while a worker is running. The user should never experience a frozen tab.
5. **No server round-trips.** All processing is client-side. No data leaves the device.

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

**When adding a new tool:** if it handles file input OR text that can grow large, create a new `src/workers/<tool-id>.worker.ts` and wire it through `useWorker`. Do not inline heavy logic in the component or call it synchronously from `processor.ts`.

### Key Shared Components

- `ToolLayout` — Standard wrapper (title, description, category badge) used by every tool
- `GeneratorTool` — Base component for CPF/CNPJ generators
- `FileDropzone` + `usePageDrop` — Handles drag-and-drop at component and page level
- `CodeEditor` — Textarea with syntax highlighting for JSON/text input
- `OutputActions` — Standardized copy-to-clipboard + download buttons
- `SearchModal` — Global ⌘K search over tool keywords

### TypeScript Strictness

`tsconfig.app.json` enables `strict`, `noUnusedLocals`, and `noUnusedParameters`. All unused imports/variables are compile errors.
