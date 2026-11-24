# Carton Box Design Automation

My family's carton box factory in Myanmar spent two to three hours redrawing every customer logo by hand in Illustrator. It now takes about five minutes.

I got there by building a full pipeline in TypeScript, measuring what it actually cost to run, and then throwing my own build away for something cheaper that worked better for the factory. This repo is the build I killed, kept public as the record of that decision.

## The problem

When a customer orders, they send a sample box or a photo of their logo. A designer then redraws that logo by hand in Adobe Illustrator, about two to three hours per logo. The factory struggled to hire and was down to one designer doing the work of two, so they asked me to automate it.

I interviewed the designer first to find where his time actually went. Almost all of it went into redrawing logos. That was the part to fix.

## What I tried to build at first

A Next.js web app: upload a photo of the sample box, clean it up, turn it into editable vector paths with free local tools, export a print-ready file.

## Why I dropped it

Two reasons.

First, the real input photos were a mess. Dirty boxes, pen marks, uneven printing, stray ink. The pure code pipeline produced random artifacts on inputs like these, and there were too many of these cases to handle reliably in code.

I found that Gemini's image generation could take a bad photo and return a clean version of the logo, and that vectorizer.ai produced cleaner traces than my local setup. But wiring those into a custom app did not hold up:

- The Gemini API was unreliable for me at the time (the model was still in preview). Some calls hung until they timed out, so an image could take minutes. The same task took about a minute on Google's own site.
- vectorizer.ai's API came with very little credit, while their web app was unlimited.

Running the factory's volume through the APIs would have cost about 35 dollars a month. Doing the same thing by hand on the two websites cost 10. For a small factory in Myanmar, that gap is real money, and the API was unreliable on top of it. A custom build was the wrong call.

## What I shipped instead

A no-code workflow the designer runs himself:

1. Generate a clean version of the logo on Google AI Studio (Gemini)
2. Vectorize it on vectorizer.ai
3. Import the SVG into Adobe Illustrator

A logo that used to take about two hours now takes about five minutes. This is what the factory uses today.

## The lesson

The lesson was to drop the ego: I had built the code and I wanted to use it, but the no-code version was cheaper and faster, so that is what I shipped. Solving the user's problem matters more than anything else.

## Stack (of the dropped build)

Next.js 14 + TypeScript, Tailwind CSS, better-sqlite3 with raw SQL, sharp for image preprocessing, @neplex/vectorizer (vtracer) for image-to-SVG, pdf-lib for PDF export.
