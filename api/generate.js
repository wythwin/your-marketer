// ============================================
//  api/generate.js — Vercel serverless function
//
//  Vercel turns this into POST /api/generate (see vercel.json). It hands the
//  request to the shared generatePlan() in lib/generate.js — the same logic the
//  local Express server (server.js) uses. Env vars come from Vercel's settings.
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
