# Carton Box Design Automation

My family's carton box factory in Myanmar spent two to three hours redrawing every customer logo by hand in Illustrator. It now takes about five minutes.

I got there by building a full pipeline in TypeScript, measuring what it actually cost to run, and then throwing my own build away for something cheaper that worked better for the factory. This repo is the build I killed, kept public as the record of that decision.

The solution that actually shipped is described below under "What I shipped instead."

## The problem

My family runs a carton box factory in Myanmar. When a customer places an order, they send a sample box with their logo printed on it or sometimes, send the photo of the logo and the text that they want on their carton box. A designer then recreates that logo as a print-ready file in Adobe Illustrator, by hand.

That redraw took about two to three hours per logo and was the slowest step before printing could start. Since the 2021 military coup, many skilled people have left the country, and the factory has struggled to hire. At one point it was down to a single designer doing the work of two. They asked me to automate the design step so one person could keep up.

I started by interviewing the designer to find where his time actually went. Almost all of it went into redrawing those logos. That was the part to fix.

## What I tried to build at first

A Next.js web app for the design step:

1. Upload photos of the customer's sample box
2. Crop the regions with logos or text
3. Gemini to read the input logo's colors and used it to tell sharp to pick the pixels that is closest to that color.
4. Preprocess the image (contrast, denoise, color separation) with sharp
5. Vectorize each region into editable SVG paths with vtracer ( because vtracer was free and since US currency is a lot more expensive than Burmese, I didn't want my factory to use the paid vectorizors )
6. Export a print-ready SVG and PDF

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
- Tailwind CSS
- better-sqlite3 with raw SQL
- sharp for image preprocessing
- @neplex/vectorizer (vtracer) for image-to-SVG
- pdf-lib for PDF export

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
