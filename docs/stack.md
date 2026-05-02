# Stack

What belongs here: every dependency that shapes the project, the reason it was
picked, what was considered instead, and the signal that would prompt
reconsideration. Update when a dependency is added, swapped, or dropped.

## Application

- **Next.js 14 (App Router) + TypeScript (strict)** — full-stack React with
  server actions/routes; one deployable. Reconsider if we need a separate API
  service.
- **Tailwind CSS** — utility-first; no design system overhead for an internal
  tool. Reconsider if we onboard a dedicated designer.
- **react-konva** — canvas library with a React-friendly API. Reconsider if
  performance bottlenecks force us to drop to a raw `<canvas>` + imperative code.

## Persistence & storage

- **better-sqlite3 + raw SQL (no ORM)** — small schema, two users, file-backed.
  No migration layer or query builder needed at this size. Reconsider if the
  schema grows past ~10 tables or we hit concurrent-write contention.
- **Local disk file storage** at `${DATA_DIR}/uploads` — scans and exports
  live on the Railway persistent volume. Reconsider if we need multi-region or
  CDN-backed delivery.

## AI

- **@google/genai** — Google's current (non-deprecated) Gemini SDK. Used in
  Step 2 to call `gemini-2.5-flash` for ink-color palette extraction. Env var:
  `GEMINI_API_KEY`. Note: docs previously referenced the deprecated
  `@google/generative-ai` package; `@google/genai` is the replacement.

## Image pipeline

- **sharp** — server-side preprocessing and color-distance masking (Step 2) and
  contrast/denoise before vectorization (Step 3). Native binary, fast.
- **@neplex/vectorizer** — Node binding around VTracer (Rust). Verified to
  trace a realistic 800×600 sample in ~30 ms on macOS arm64. Reconsider if the
  package goes unmaintained or fails on Railway's Linux runtime — fallbacks
  documented in `docs/vectorization.md`.
- **pdf-lib** — pure-JS PDF generation. Sufficient for the print-ready output;
  no native deps.

## Hosting

- **Railway with persistent volume at `/data`** — long-lived Node server, not
  serverless. Native binaries (sharp, better-sqlite3, vectorizer) work without
  bundler quirks; vectorization isn't bound by serverless timeouts; volume
  preserves SQLite + uploads across deploys. Reconsider if we need horizontal
  scaling beyond a single node.
