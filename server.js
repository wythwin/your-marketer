// ============================================
//  server.js — the app server (local AND Vercel)
//
//  It serves index.html and exposes POST /api/generate, reusing the shared
//  logic in lib/generate.js.
//
//  - Locally (`npm start`): this file is run directly, so it listens on a port.
//  - On Vercel: this file is imported and Vercel uses the exported `app`
//    (Vercel detects the Express app automatically). The listen() is guarded so
//    it only runs when you start it yourself.
// ============================================

import "dotenv/config"; // loads .env locally (no-op on Vercel, which injects env)
import express from "express";
import { fileURLToPath } from "url";
import { generatePlan, emailReady } from "./lib/generate.js";

const app = express();

app.use(express.json());
app.use(express.static(".")); // serves index.html

app.post("/api/generate", async (req, res) => {
  const result = await generatePlan(req.body || {});
  res.status(result.status).json(result.body);
});

// Only listen when this file is run directly (local dev), not when imported (Vercel).
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n  Your Marketer is running!  ->  http://localhost:${PORT}`);
    console.log(`  Email sending: ${emailReady() ? "ON (via Gmail)" : "OFF (add Gmail keys to .env)"}\n`);
  });
}

export default app;
