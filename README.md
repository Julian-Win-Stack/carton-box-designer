# Carton Box Design Automation

This repo is a code-based attempt at automating logo design for my family's carton box factory in Myanmar. I started building it, hit real limits, and replaced it with a no-code workflow that worked better for the factory. I am keeping the code here as a record of the approach and the decision to drop it.

The solution that actually shipped is described below under "What I shipped instead."

## The problem

My family runs a carton box factory in Myanmar. When a customer places an order, they send a sample box with their logo printed on it. A designer then recreates that logo as a print-ready file in Adobe Illustrator, by hand.

That redraw took about two hours per logo and was the slowest step before printing could start. Since the 2021 military coup, many skilled people have left the country, and the factory has struggled to hire. At one point it was down to a single designer doing the work of two. They asked me to automate the design step so one person could keep up.

I started by interviewing the designer to find where his time actually went. Almost all of it went into redrawing those logos. That was the part to fix.

## What I built (this repo)

A Next.js web app for the design step:

1. Upload photos of the customer's sample box
2. Crop the regions with logos or text
3. Preprocess the image (contrast, denoise, color separation) with sharp
4. Vectorize each region into editable SVG paths with vtracer
5. Arrange and recolor the pieces on a drag-and-drop canvas (react-konva)
6. Export a print-ready SVG and PDF

It also used Gemini to read the logo's colors and build color masks.

## Why I dropped it

Two reasons.

First, the real input photos were a mess. Dirty boxes, pen marks, uneven printing, stray ink. The pure code pipeline produced random artifacts on inputs like these, and there were too many of these cases to handle reliably in code.

I found that Gemini's image generation could take a bad photo and return a clean version of the logo, and that vectorizer.ai produced cleaner traces than my local setup. But wiring those into a custom app did not hold up:

- The Gemini API took 4 to 7 minutes per image, while the same task took about a minute on Google's own site.
- vectorizer.ai's API came with very little credit, while their web app was unlimited.

Running the factory's volume through the APIs would have cost about 35 dollars a month. Doing the same thing by hand on the two websites cost 10. For a small factory in Myanmar, that gap is real money, and the API was slow on top of it. A custom build was the wrong call.

## What I shipped instead

A no-code workflow the designer runs himself:

1. Generate a clean version of the logo on Google AI Studio (Gemini)
2. Vectorize it on vectorizer.ai
3. Import the SVG into Adobe Illustrator

A logo that used to take about two hours now takes about five minutes. This is what the factory uses today.

## The lesson

The lesson was to drop the ego. I had built the code and I wanted to use it. But the no-code version was cheaper and faster, so that is what I shipped. Solving the user's problem matters more than anything else.

## Stack (of the dropped build)

- Next.js 14 + TypeScript (App Router)
- react-konva for the canvas
- Tailwind CSS
- better-sqlite3 with raw SQL
- sharp for image preprocessing
- @neplex/vectorizer (vtracer) for image-to-SVG
- pdf-lib for PDF export
- Railway with a persistent volume

## Running the code

This is a partial build and not the production solution. If you want to look at the code:

```
git clone <repo-url>
cd carton-box-designer
npm install
npm run dev
```

Required `.env`:

- `DATA_DIR` — runtime data directory (default: `./data`)
- `GEMINI_API_KEY` — Google Gemini API key (https://aistudio.google.com)

Open `http://localhost:3000`.

## Status

Archived. The code here is an unfinished build that I replaced with the no-code workflow above. I am keeping it public as a record of what I tried and why I stopped.
