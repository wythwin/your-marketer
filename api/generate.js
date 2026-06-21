// ============================================
//  api/generate.js — Vercel serverless function
//
//  Vercel automatically turns files in /api into endpoints, so this becomes
//  POST /api/generate. It just hands the request to the shared generatePlan().
//  Env vars (GROQ_API_KEY, GMAIL_USER, ...) come from the Vercel dashboard.
// ============================================

import { generatePlan } from "../lib/generate.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Vercel usually parses JSON bodies for us; handle a raw string just in case.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const result = await generatePlan(body || {});
  res.status(result.status).json(result.body);
}
