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
6. **Large output → serialize in the worker, not the main thread.** `JSON.stringify` of a big dataset produces a 100MB+ string; doing it in `onMessage` freezes the UI. Stringify inside the worker and return a `Blob` + a short text preview (see `workers/lib/jsonPreview.ts` → `buildJsonOutput`). Blobs cross `postMessage` by reference (cheap); the full string never reaches the UI thread. Never feed a file-scale string into `CodeEditor` — render the preview and download the Blob via `JsonOutputPanel`.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check + build (tsc -b && vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

There is no test suite currently.

## Git Commits

Never add `Co-Authored-By` trailers to commits in this repository.

## Architecture

**DevUtils** is a client-side SPA for data conversion (JSON↔CSV↔XLSX↔SQL) and document generation (CPF/CNPJ). All processing runs in the browser — no data leaves the device.

### Tool Registry Pattern

Each tool lives in `src/tools/<tool-id>/` and exports:
- `meta.ts` — `ToolMeta` object with id, name, description, category, icon, keywords, and a `lazy()` component reference
- `index.tsx` — The React UI component
- `processor.ts` (optional) — Pure logic (used in generators and json-to-sql)

`src/registry.ts` aggregates all `ToolMeta` objects and exports `getToolById()` and `searchTools()`. Adding a new tool requires creating the module and registering it in `registry.ts`.

Tool categories (`ToolCategory` type): `'converter' | 'generator' | 'formatter' | 'validator'`

### Existing Tools

| ID | Name | Category |
|----|------|----------|
| `text-to-file` | Text to File | formatter |
| `psql-to-json` | PSQL → JSON | converter |
| `json-diff` | JSON Diff | formatter |
| `sql-beautifier` | SQL Beautifier | formatter |
| `cron-parser` | Cron Parser | formatter |
| `base64` | Base64 | converter |
| `csv-viewer` | CSV Viewer | formatter |
| `string-size` | String Size | formatter |
| `dedup-lines` | Dedup Lines | formatter |
| `markdown-preview` | Markdown Preview | formatter |
| `uuid-generator` | UUID Generator | generator |
| `password-generator` | Password Generator | generator |
| `date-utils` | Date Utils | converter |
| `json-to-xlsx` | JSON → XLSX | converter |
| `json-to-csv` | JSON → CSV | converter |
| `csv-to-json` | CSV → JSON | converter |
| `csv-to-xlsx` | CSV → XLSX | converter |
| `xlsx-to-json` | XLSX → JSON | converter |
| `xlsx-to-csv` | XLSX → CSV | converter |
| `json-to-sql` | JSON → SQL | converter |
| `cpf-generator` | CPF Generator | generator |
| `cnpj-generator` | CNPJ Generator | generator |
| `json-to-js-object` | JSON ↔ JS Object | converter |

### Routing

`App.tsx` uses React Router v7 with two routes:
- `/` → Home grid of all tools
- `/tools/:id` → Tool page (component loaded lazily via `React.lazy` + `Suspense`)

### Performance Strategy for Large Files

Heavy processing is offloaded to Web Workers (`src/workers/`):
- `csvParser.worker.ts` — PapaParse for CSV parsing/generation
- `xlsxParser.worker.ts` — SheetJS for XLSX operations
- `base64.worker.ts` — Base64 encode/decode
- `dedupLines.worker.ts` — Line deduplication
- `jsonDiff.worker.ts` — JSON diffing
- `psqlParser.worker.ts` — PostgreSQL output parsing
- `sqlBeautifier.worker.ts` — SQL formatting

`useWorker.ts` is the generic abstraction over the worker lifecycle. `useFileStream.ts` reads files in 2MB chunks to avoid blocking the UI.

**When adding a new tool:** if it handles file input OR text that can grow large, create a new `src/workers/<tool-id>.worker.ts` and wire it through `useWorker`. Do not inline heavy logic in the component or call it synchronously from `processor.ts`.

### Key Shared Components

- `ToolLayout` — Standard wrapper (title, description, category badge) used by every tool
- `GeneratorTool` — Base component for CPF/CNPJ generators
- `FileDropzone` + `usePageDrop` — Handles drag-and-drop at component and page level
- `CodeEditor` — Textarea with syntax highlighting for JSON/text input
- `OutputActions` — Standardized copy-to-clipboard + download buttons
- `DownloadButton` — Single-purpose download button (`data`, `filename`, `mimeType` props)
- `DataTable` — Virtualized table for tabular output (`headers`, `rows`, optional `maxHeight`)
- `JsonOutputPanel` — Output panel for file-scale "→ JSON" tools: short preview in `CodeEditor` + download full result via Blob (copy hidden above ~2MB)
- `SearchModal` — Global ⌘K search over tool keywords
- `Sidebar` — Navigation sidebar with category filter, favorites, dark/light toggle
- `Toast` / `useToast` — In-app notification system; call `toast(message, 'success' | 'error' | 'info')`
- `PageDropOverlay` — Full-page drag overlay (pair with `usePageDrop`)

### Hooks

- `useWorker` — Generic Web Worker lifecycle (post message, receive result, auto-terminate)
- `useFileStream` — Chunked file reading (2 MB chunks, progress, speed, cancel)
- `usePageDrop` — Page-level drag-and-drop with file type filtering
- `useJsonFileInput` — Combined text/file input for JSON array tools; integrates `usePageDrop` + `parseJsonArray`
- `useSubmitOnCmdEnter` — Binds Cmd/Ctrl+Enter to a callback; standard UX for all tools with a "run" action
- `useCopyToClipboard` — Clipboard write with transient `copied` boolean state
- `useFavorites` — Read/toggle tool favorites persisted in localStorage
- `useCardOrder` — Drag-to-reorder home grid cards, persisted in localStorage
- `storage` — Raw `loadJSON` / `saveJSON` helpers over localStorage

### Utils

- `compression.ts` — `compressToBase64url` / `decompressFromBase64url` using the browser's native `CompressionStream` (`deflate-raw`). Used to encode content into share URLs.
- `urlShortener.ts` — `shortenUrl(url)` calls is.gd API; throws if URL exceeds 5 000 chars. `isLocalhost()` guard to skip shortening in dev.
- `parseJson.ts` — `parseJsonArray(text)` safely parses a JSON string into `Record<string, unknown>[]`; returns `null` on error.
- `fileAccept.ts` — `matchesAccept(file, accept)` checks a `File` against an `accept` string or array (extension or MIME).
- `workers/lib/jsonPreview.ts` — `buildJsonOutput(value)`: stringify + Blob + capped preview, run **inside** workers (not main-thread). Pairs with `JsonOutputPanel`.

### URL-based Content Sharing Pattern

Tools that need shareable links encode their content in the URL:
1. Compress content with `compressToBase64url` → append as `?param=<encoded>`
2. Optionally shorten the full URL via `shortenUrl` (is.gd, 5 000-char limit enforced before the API call)
3. On load, read the param from `useSearchParams` and decompress with `decompressFromBase64url`

See `markdown-preview` for a reference implementation.

### Design System

The project uses CSS custom properties defined in `src/index.css`. Always use these tokens — never hardcode colors or sizes.

Key tokens:
- `var(--bg)`, `var(--surface)`, `var(--surface-2)` — background layers
- `var(--text)`, `var(--text-muted)`, `var(--text-dim)` — text hierarchy
- `var(--border)` — borders
- `var(--accent)` — primary accent color
- `var(--radius)` — border radius
- `var(--font-mono)` — monospace font stack

Dark/light mode is controlled by the `data-theme` attribute on `<html>` (`"light"` or absent for dark). Use it when initializing third-party renderers (e.g. Mermaid).

### TypeScript Strictness

`tsconfig.app.json` enables `strict`, `noUnusedLocals`, and `noUnusedParameters`. All unused imports/variables are compile errors.
