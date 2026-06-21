# Chapter 3 — Personal Project Report

- **Project:** Your Marketer
- **Author:** wythwin (Wai Yan)
- **Repo:** https://github.com/wythwin/your-marketer
- **Live demo:** https://your-marketer.vercel.app

## What it is

Your Marketer is an AI-powered web app that helps small business owners figure
out **where to start with marketing**. They answer 6 quick questions about their
business and get a personalized "Start Point" plus an actionable to-do checklist —
written by AI for their exact business, emailed to them, and captured as a lead
for the owner.

## The problem

Small business owners know they should market themselves but are overwhelmed and
don't know where to begin. Generic advice ("just post more") isn't a plan, and
they don't have time to learn funnels, ads, and SEO.

## What I built

- A 6-question flashcard quiz with a clean, accessible UI.
- A backend that sends the answers to an AI model and returns a tailored plan.
- A lead-capture step (name + email) that emails the plan to the visitor and a
  "new lead" notification to the owner.
- Save-progress, download, and copy features.
- A built-in rule-based fallback so the app always returns a useful plan, even if
  the AI is unavailable.

## How I used Claude Code

- Designed and iterated the UI using the `ui-ux-pro-max` skill (replaced emoji
  icons with SVGs, added a real font pairing, and did a full accessibility pass).
- Built the Express backend, the shared `lib/generate.js`, the Groq integration,
  and the branded Gmail email templates.
- Refactored the app for Vercel serverless deployment and debugged the live
  routing until the AI worked in production.
- Added custom Claude Code config to this repo: `.mcp.json`, a `lead-followup`
  skill, and a `marketing-strategist` agent.

## Tech stack

Frontend: HTML / CSS / JavaScript · Backend: Node + Express ·
AI: Groq (Llama 3.3) · Email: Nodemailer (Gmail) · Hosting: Vercel

## Challenges & learnings

- **A green build log is not a working app.** The Vercel deploy "succeeded"
  several times while the app didn't actually work. The real test was hitting the
  live endpoints — the fix was a serverless function plus an explicit route in
  `vercel.json`.
- **Secrets management.** `.env` and the collected `leads.*` files are gitignored;
  API keys live in `.env` locally and in Vercel's environment variables in
  production, never in the browser.
- **Serverless has a read-only filesystem,** so on Vercel the lead is captured via
  the owner email instead of writing to a file.

## What's next

- Rate limiting + abuse protection (the endpoint is now public).
- Store leads in a database or Google Sheet.
- AI-generated, ready-to-post marketing content.
