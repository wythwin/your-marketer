// ============================================
//  server.js — LOCAL development server
//
//  Used when you run `npm start` on your own machine. It serves index.html and
//  exposes POST /api/generate, reusing the exact same logic as the Vercel
//  function (see lib/generate.js). On Vercel this file is NOT used — Vercel
//  serves index.html statically and runs api/generate.js instead.
// ============================================

import "dotenv/config"; // loads .env (must be the first import)
import express from "express";
import { generatePlan, emailReady } from "./lib/generate.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("."));

app.post("/api/generate", async (req, res) => {
  const result = await generatePlan(req.body || {});
  res.status(result.status).json(result.body);
});

app.listen(PORT, () => {
  console.log(`\n  Your Marketer is running!  ->  http://localhost:${PORT}`);
  console.log(`  Email sending: ${emailReady() ? "ON (via Gmail)" : "OFF (add Gmail keys to .env)"}\n`);
});
