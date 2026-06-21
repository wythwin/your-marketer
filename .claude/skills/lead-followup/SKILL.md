---
name: lead-followup
description: Draft a warm, personalized follow-up message for a lead captured by Your Marketer. Use when the user wants to re-engage a lead from leads.csv or a "New lead" notification email — turning the lead's quiz answers and the marketing plan they received into a tailored email or DM.
---

# Lead Follow-up

Help the Your Marketer owner follow up with a captured lead and move them toward
a reply or a booked call.

## When to use

- The user pastes a lead's details (name, email, what they sell, quiz answers), **or**
- Points at a row in `leads.csv`, **or** forwards a "New lead" notification email.

## Steps

1. Read the lead's `name`, `product`, and quiz answers (`audience`,
   `online_presence`, `posting`, `budget`, `goal`).
2. Recall the **Start Point** they were given (the same logic as `lib/generate.js`,
   or the plan saved with the lead).
3. Draft a short follow-up (120–160 words) that:
   - Greets them by name and references their business specifically.
   - Acknowledges their #1 goal and current situation (don't restate everything).
   - Offers **one** concrete next step tied to their Start Point — a quick win or
     a free 15-minute chat.
   - Ends with a single clear call to action and an easy way to reply.
4. Match the brand voice: friendly, encouraging, jargon-free — the same tone as
   the app and its emails.
5. Offer **two** variants: a full email and a shorter DM / text version.

## Guardrails

- No spammy or pushy language; no fake urgency.
- Never invent facts about their business beyond what their answers say.
- Respect their stated budget (don't pitch paid ads to a `$0` lead).
- Keep it skimmable on a phone.
