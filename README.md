# Carton Box Design Automation

Internal tool replacing 1.5 full-time designers at my family's carton box manufacturing factory in Myanmar. This tool replaces a workflow I watched my family's design team do thousands of times growing up.


Designers receive sample boxes from customers and recreate them as print-ready files in Adobe Illustrator. The manual process takes ~60 minutes per box and consumes 2 designers' full work week. This app cuts that to ~5 minutes.

## The problem

When a customer orders carton boxes, they send a sample of the design they want printed. The factory's design team:

1. Photographs each panel of the sample box
2. Manually traces every text element and logo in Illustrator
3. Matches fonts, redraws logos, picks colors
4. Exports a die-cut layout for the print shop

Output looks like this: [will upload when the tool is finished]

The work is repetitive, slow, and is the bottleneck before any printing can start.

## The solution

A web app that:

1. Takes photos of the customer's sample box panels as input
2. Lets the designer crop regions containing text or logos
3. Auto-vectorizes those regions into clean editable SVG paths
4. Drops them onto a die-cut canvas where the designer arranges and recolors them
5. Exports a print-ready SVG and PDF

Designer time per box: ~60 min → ~5 min.

## How it works

[Will insert a simple flow diagram here once v1 is working]
Photo upload → Crop region → Preprocess (sharp) → Vectorize (vtracer)
→ Drop on canvas (Konva) → Recolor → Export SVG/PDF

## Stack

- **Next.js 14** + TypeScript (App Router)
- **react-konva** for the drag-and-drop canvas
- **Tailwind** for styling
- **better-sqlite3** with raw SQL — no ORM
- **sharp** for image preprocessing (contrast, denoise, color quantization)
- **@neplex/vectorizer** (vtracer) for image-to-SVG tracing
- **pdf-lib** for PDF export
- Local disk file storage on **Railway** with a persistent volume

## Why this stack

- Picked tools I already know cold so I can ship v1 in days, not weeks
- Raw SQL over an ORM because the schema is simple and I don't want abstractions I don't fully understand
- Railway over Vercel because vectorization can take 30+ seconds per image and Vercel's serverless timeouts would force constant workarounds
- SQLite over Postgres because the app has 2 users, not 2 million

## Status

[Will update this as I go.]

- [x] Project bootstrapped
- [ ] Photo upload + storage
- [ ] Region cropping UI
- [ ] sharp preprocessing pipeline
- [ ] vtracer integration
- [ ] Canvas + drag-and-drop
- [ ] Color picker per path
- [ ] SVG/PDF export
- [ ] Multi-panel die-cut layout
- [ ] Customer brand color palettes

## Running locally

```bash
git clone <repo-url>
cd carton-box-design
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

Built solo while interning as a GTM Engineer inside a Silicon Valley tech startup - automating the entire GTM workflow and at the same time, empowering the GTM team with in-house GTM tools to 10x productivity. 
