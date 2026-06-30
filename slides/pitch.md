---
marp: true
paginate: true
auto-advance: 20
---

# Your Marketer
### Find your starting point in 2 minutes

An AI guide that tells a small business owner exactly
**where to start with marketing** — and emails them a plan.

🔗 your-marketer.vercel.app

---

## The problem

Small business owners know they *should* do marketing —
but they're overwhelmed and don't know **where to start**.

- Too much generic advice
- No time to learn funnels, ads, SEO
- "Just post more" isn't a plan

---

## The solution

A friendly 6-question quiz → a **personalized plan**:

1. One clear **Start Point** — the single most important thing first
2. A custom **to-do checklist** they can actually follow
3. **Emailed** straight to their inbox

No sign-up. Takes 2 minutes.

---

## How it works

Quiz answers → **AI (Groq)** → personalized plan
→ emailed to them + saved as a **lead** for the owner

- AI writes the plan for their exact business
- Name + email captured → owner gets every lead
- Built-in fallback if the AI is ever unavailable

---

## Built with Claude Code

- **Frontend:** vanilla HTML / CSS / JS, fully accessible
- **Backend:** Node + Express, shared logic in `lib/generate.js`
- **Email:** Gmail (Nodemailer) with branded templates
- **Deployed on Vercel:** static page + serverless function
- Secrets kept safe in `.env` / Vercel env vars

---

## Try it & what's next

**Live now:** your-marketer.vercel.app

Next steps:
- Rate limiting & abuse protection
- Store leads in a database / Google Sheet
- Generate ready-to-post content

**Thank you!** ⭐
