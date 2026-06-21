# Your Marketer

A friendly, no-sign-up web app that helps small business owners figure out
**where to start with marketing**. Answer 6 quick questions about your business
and get an **AI-personalized** starting point plus an actionable to-do checklist
written specifically for your business.

## Features

- **2-minute flashcard quiz** — 6 questions covering your product, audience,
  online presence, posting habits, budget, and #1 goal.
- **AI-personalized plan** — your answers are sent to an AI model (via
  [Groq](https://groq.com)) that writes a custom "start point" and to-do
  checklist for your exact business.
- **Lead capture** — visitors enter their name + email to get their plan. Every
  lead is saved to `leads.csv` / `leads.json` so you can follow up.
- **Auto-email** — the plan is emailed to the visitor, and a "new lead" copy is
  sent to you, straight from your Gmail.
- **Save progress** — the plan and which tasks you've ticked are remembered in
  your browser, so a refresh or closing the tab won't lose them.
- **Download / Copy** — export the plan as a text file or copy it to the clipboard.
- **Always works** — if the AI is unavailable (no key, offline), it falls back
  to a built-in rules engine so you still get a useful plan.
- **Fully accessible** — keyboard navigation, visible focus states, ARIA roles,
  and `prefers-reduced-motion` support.

## Quick start

You need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
# 1. Install the small set of packages (one time)
npm install

# 2. Add your free Groq API key (see below)
cp .env.example .env
#    then open .env and paste your key after GROQ_API_KEY=

# 3. Start the app
npm start
#    then visit http://localhost:3000
```

> The app still runs without a key — it just uses the built-in fallback plan
> instead of AI.

## Getting a free Groq API key

1. Go to **https://console.groq.com** and sign up (free, no credit card).
2. Open **https://console.groq.com/keys**.
3. Click **Create API Key**, give it a name (e.g. "your-marketer"), and copy it.
   You only see the full key once — copy it now.
4. Open the `.env` file in this project and paste it:
   ```
   GROQ_API_KEY=gsk_your_real_key_here
   ```
5. Save, then run `npm start` (restart it if it was already running).

**Keep your key private.** The `.env` file is listed in `.gitignore`, so it is
**never** uploaded to GitHub. Never paste your key into `index.html` or any file
that gets committed.

## Setting up email (optional, via Gmail)

This lets the app email each visitor their plan and send you a "new lead" copy.
The app works fine without it — it just won't send emails.

1. Turn on **2-Step Verification** for your Google account
   (https://myaccount.google.com/security).
2. Create an **App Password** at https://myaccount.google.com/apppasswords —
   pick "Mail", name it "your-marketer", and copy the 16-character password.
3. Add these to your `.env`:
   ```
   GMAIL_USER=you@gmail.com
   GMAIL_APP_PASSWORD=your16charapppassword
   LEAD_NOTIFY_EMAIL=        # optional; where your lead copy goes (defaults to GMAIL_USER)
   ```
4. Restart the app. On start it prints `Email sending: ON (via Gmail)` when set up.

> An **App Password** is a special one-app password — it is *not* your normal
> Gmail password, and you can revoke it anytime without changing your account.

### Where your leads go

Every submission is appended to two files (both gitignored, so they stay private):

- **`leads.csv`** — open in Excel / Google Sheets (`date, name, email, product, start_point`).
- **`leads.json`** — the same data plus each visitor's full answers.

## Deploying to Vercel

The app is set up to run on Vercel with no code changes:

- `index.html` is served as a static page.
- `api/generate.js` runs as a serverless function (it shares all its logic with
  local dev via `lib/generate.js`).

Steps:

1. Push to GitHub and import the repo at https://vercel.com/new.
2. In **Settings → Environment Variables**, add the same keys as your `.env`:
   `GROQ_API_KEY`, and (optional) `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
   `LEAD_NOTIFY_EMAIL`. Your local `.env` is never uploaded — Vercel uses these.
3. **Deploy** (or redeploy after adding the variables).

> **Leads on Vercel:** serverless filesystems are temporary, so `leads.csv` /
> `leads.json` are **not** written in production — the app detects Vercel and
> skips file-saving. You still capture every lead through the **owner
> notification email**. (Want a stored list? Add a database or Google Sheet.)
>
> Locally (`npm start`) file-saving works as normal.

## How it works

```
                          ┌──────────────────────────────────────────┐
Browser (index.html)      │   lib/generate.js  (shared logic)         │
  quiz → name/email ─────▶│    1. ask Groq for the plan ──▶ Groq API  │
        ▲                 │    2. save lead (local only) → leads.csv  │
        │                 │    3. email plan + lead copy ──▶ Gmail    │
        └──── JSON plan ──┤    4. return the plan                     │
                          └──────────────────────────────────────────┘
            called by:  server.js (local)  ·  api/generate.js (Vercel)
                          (all secret keys stay server-side, from env)
```

- **`index.html`** — the quiz UI. After the questions it collects name + email,
  calls `/api/generate`, shows a loading spinner, then renders the AI's plan. It
  also saves progress to `localStorage` and offers Download / Copy. If the
  backend call fails it uses the built-in `getStartPoint()` / `getTodos()` fallback.
- **`lib/generate.js`** — the shared "brain": calls Groq, saves the lead, and
  emails the plan. Saving and emailing are "best effort" — the visitor always
  gets their plan even if those steps fail. Secrets are read from env, never sent
  to the browser.
- **`server.js`** — local-only [Express](https://expressjs.com) server (`npm start`)
  that serves the page and calls `lib/generate.js`.
- **`api/generate.js`** — the Vercel serverless version of the same route, also
  calling `lib/generate.js`.
- **`.env`** — your secrets: `GROQ_API_KEY` and (optional) the Gmail settings
  (gitignored). On Vercel these live in the project's env-var settings instead.
- **`.env.example`** — a safe template you can commit.

To change the AI's behavior, edit the prompt in `lib/generate.js`. To customize the
quiz questions, edit the `questions` array in `index.html`.

## Tech

- Frontend: plain HTML, CSS, and JavaScript — inline
  [Lucide](https://lucide.dev)-style SVG icons;
  [Poppins](https://fonts.google.com/specimen/Poppins) +
  [Open Sans](https://fonts.google.com/specimen/Open+Sans) fonts.
- Backend: [Node.js](https://nodejs.org) + [Express](https://expressjs.com) +
  [dotenv](https://github.com/motdotla/dotenv) +
  [Nodemailer](https://nodemailer.com) (Gmail).
- AI: [Groq](https://groq.com) (`llama-3.3-70b-versatile`, OpenAI-compatible API).
