# Carton Box Design

Internal web app for a family carton-box manufacturing business in Myanmar.
Designers scan customer sample boxes (cardboard laid flat on a flatbed scanner)
and upload the scan; the app vectorizes text/logos, drops them onto a die-cut
canvas where shapes can be recolored, then exports print-ready SVG/PDF artwork.
Internal tool, ~1–2 designers. Not public.

**Input is always a scan, not a phone photo.** Assume clean, calibrated,
shadow-free input on a uniform scanner-bed background. Do not engineer for
camera artifacts (lens blur, perspective distortion, lighting variation).

## v1 scope
One designer can: upload a scan → crop to the box region → vectorize to SVG →
drop on a die-cut canvas → recolor a shape → export SVG/PDF. Anything beyond
that is v2+.

## Stack highlights
- `@neplex/vectorizer` — NAPI-RS native binding; call as `vectorize(buffer, config)` returning `Promise<string>` (SVG). Use numeric literals for enum fields (`colorMode: 1` = Binary) — `const enum` + `isolatedModules` are incompatible.
- `svgo` v4 — ESM package; `optimize(svgStr, { plugins: [...] })` returns `{ data: string }`. Use `preset-default` with `overrides` to disable individual plugins.

## Engineering principles
- Ship the smallest working version first.
- Raw SQL, not ORMs — until we hit real pain.
- No premature optimization.
- Clean, readable code over clever code.
- TypeScript strict mode is on and stays on.

## Context7 Usage

Context7 fetches live library docs. Use it selectively — every call burns tokens and time.

**Use when:** working with rapidly-changing libs (Next.js App Router, Prisma, TanStack Query, Supabase SDK); version-diverging APIs; niche/recently-released libs (e.g. `@neplex/vectorizer` — fetch once when first integrating); generated code fails with "X is not a function" / "method removed in vN".

**Skip when:** stable libs unchanged in years (Express, sharp, better-sqlite3); standard JS/TS/Node features; a working example already exists in this repo (reference that instead); conceptual/architectural questions.

## Documentation policy
Do NOT load files under `docs/` at session start. When the current task touches
a specific topic, check the index below and fetch only that file. If a decision
or pattern needs to be recorded, identify the right `docs/*.md` file, propose
the update, and ask before writing.

## Documentation index
- `docs/build-plan.md` — numbered build plan; current step + scope
- `docs/architecture.md` — system design, data flow, folder structure
- `docs/stack.md` — full stack list with rationale per choice
- `docs/database.md` — schema, tables, migration approach
- `docs/api.md` — API routes, request/response shapes
- `docs/vectorization.md` — preprocessing pipeline, vectorizer config, fallbacks
- `docs/decisions.md` — append-only log of significant technical decisions
- `docs/conventions.md` — code style, naming, folder rules, README update rule
