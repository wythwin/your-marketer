# Your Marketer

A friendly, no-sign-up web app that helps small business owners figure out
**where to start with marketing**. Answer 6 quick questions about your business
and get a personalized starting point plus an actionable to-do checklist you can
actually follow.

## Features

- **2-minute flashcard quiz** — 6 questions covering your product, audience,
  online presence, posting habits, budget, and #1 goal.
- **Personalized start point** — a prioritized recommendation based on your
  answers (e.g. "Set Up Your Online Foundation" vs. "Turn Followers into
  Customers").
- **Custom to-do checklist** — concrete, tickable tasks tailored to your
  presence, audience, goal, and budget.
- **Fully accessible** — keyboard navigation, visible focus states, ARIA roles,
  and `prefers-reduced-motion` support.
- **Zero dependencies, no build step** — a single static `index.html` file.

## Getting started

It's a single HTML file, so there's nothing to install.

**Open directly:**

```bash
open index.html          # macOS
# or just double-click the file
```

**Serve locally** (recommended, so web fonts load over HTTP):

```bash
python3 -m http.server 4599
# then visit http://localhost:4599
```

## How it works

Everything lives in [`index.html`](index.html):

- **Markup** — three screens (Welcome → Quiz → Results) toggled via a `.hidden`
  class.
- **Styles** — CSS custom-property design tokens (indigo/violet brand), Poppins
  headings + Open Sans body, Flat Design, responsive down to 375px.
- **Logic** — vanilla JavaScript:
  - `questions` — the quiz data (text and choice types, each with an SVG icon).
  - `getStartPoint()` — the "brain" that picks your prioritized start point.
  - `getTodos()` — builds the personalized checklist from your answers.

To customize the quiz, edit the `questions` array; to change the
recommendations, edit `getStartPoint()` and `getTodos()`.

## Tech

Plain HTML, CSS, and JavaScript. No frameworks, no build tooling. Icons are
inline [Lucide](https://lucide.dev)-style SVGs; fonts are
[Poppins](https://fonts.google.com/specimen/Poppins) and
[Open Sans](https://fonts.google.com/specimen/Open+Sans) via Google Fonts.
