// ============================================
//  server.js — the small backend
//
//  Its jobs:
//   1. Serve your index.html to the browser.
//   2. Keep your secret keys SAFE (they live in .env, never in the browser).
//   3. Ask Groq for a personalized plan.
//   4. Save every visitor as a lead (leads.csv + leads.json).
//   5. Email the plan to the visitor AND a "new lead" copy to you (via Gmail).
// ============================================

import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { appendFile, readFile, writeFile } from "fs/promises";

dotenv.config(); // load secrets from .env into process.env

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("."));

// ---- Groq (the AI) ----
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// ---- Gmail (sending email) ----
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL || GMAIL_USER; // where YOUR lead copy goes

function emailReady() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    });
  }
  return transporter;
}


// ============================================
//  Helpers
// ============================================
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function csvCell(v) {
  return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
}

// Save a lead to both a JSON list and a CSV (easy to open in Excel/Sheets).
async function saveLead(lead) {
  // JSON list
  let list = [];
  try {
    list = JSON.parse(await readFile("leads.json", "utf8"));
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(lead);
  await writeFile("leads.json", JSON.stringify(list, null, 2));

  // CSV (create header once)
  try {
    await readFile("leads.csv", "utf8");
  } catch {
    await writeFile("leads.csv", "date,name,email,product,start_point\n");
  }
  const row =
    [lead.date, lead.name, lead.email, lead.answers.product || "", lead.startPoint]
      .map(csvCell)
      .join(",") + "\n";
  await appendFile("leads.csv", row);
}

// Friendly labels so the owner email reads nicely instead of raw codes.
const ANSWER_LABELS = {
  product:         { q: "What they sell" },
  audience:        { q: "Customers", v: { local: "Local people", online: "Anyone online", business: "Other businesses (B2B)", unsure: "Not sure yet" } },
  online_presence: { q: "Online presence", v: { none: "None yet", social: "Social media only", website: "Website only", both: "Website + social" } },
  posting:         { q: "Posting frequency", v: { never: "Never", rarely: "A few times a month", weekly: "About weekly", daily: "Almost daily" } },
  budget:          { q: "Monthly budget", v: { zero: "$0 (free only)", small: "Under $100", medium: "$100–$500", large: "Over $500" } },
  goal:            { q: "Main goal", v: { awareness: "More awareness", leads: "More inquiries / calls", sales: "More sales", repeat: "Repeat customers" } }
};

// Shared shell: branded header bar + body + footer. Uses tables + inline
// styles because that's what email apps (Gmail, Outlook, Apple Mail) render reliably.
function emailLayout(subtitle, bodyHtml) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#4f46e5;background-image:linear-gradient(135deg,#4f46e5,#7c3aed);padding:26px 32px;">
          <div style="font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:-0.2px;">Your Marketer</div>
          <div style="font-size:13px;color:#e0e7ff;margin-top:4px;">${escapeHtml(subtitle)}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#1e293b;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
        <tr><td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
            Sent by <span style="color:#64748b;font-weight:bold;">Your Marketer</span> — your marketing starting-point guide.<br>
            You're receiving this because you requested a free marketing plan.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>`;
}

// A tappable button that survives most email clients.
function emailButton(text, href, color) {
  color = color || "#4f46e5";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
    <td style="border-radius:10px;background:${color};">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(text)}</a>
    </td></tr></table>`;
}

// Turn the raw answers into a readable two-column table.
function formatAnswers(answers) {
  return Object.keys(ANSWER_LABELS)
    .filter((k) => answers[k] != null && answers[k] !== "")
    .map((k) => {
      const def = ANSWER_LABELS[k];
      const raw = answers[k];
      const val = def.v && def.v[raw] ? def.v[raw] : raw;
      return `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:42%;vertical-align:top;">${escapeHtml(def.q)}</td>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${escapeHtml(val)}</td>
      </tr>`;
    })
    .join("");
}

// Email 1 — the visitor's roadmap.
function planEmailHtml(name, product, plan) {
  const todos = plan.todos
    .map(
      (t) => `<tr><td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;line-height:1.5;">
        <span style="color:#4f46e5;font-weight:bold;">&#10003;</span>&nbsp;&nbsp;${escapeHtml(t)}</td></tr>`
    )
    .join("");

  const startBox = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#eef2ff;border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:12px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:#4f46e5;margin-bottom:6px;">Your Start Point</div>
        <div style="font-size:17px;font-weight:bold;color:#1e293b;margin-bottom:6px;">${escapeHtml(plan.startPoint.title)}</div>
        <div style="font-size:14px;color:#475569;line-height:1.6;">${escapeHtml(plan.startPoint.description)}</div>
      </td></tr>
    </table>`;

  const body = `
    <p style="margin:0 0 18px;">Hi ${escapeHtml(name) || "there"}, here's your personalized marketing roadmap for <span style="font-weight:bold;">${escapeHtml(product)}</span>. Work through it at your own pace — small steps add up fast.</p>
    ${startBox}
    <div style="font-size:16px;font-weight:bold;color:#1e293b;margin:0 0 6px;">Your To-Do Checklist</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${todos}</table>
    ${emailButton("Questions? Just reply", "mailto:" + GMAIL_USER)}
    <p style="margin:0;font-size:13px;color:#94a3b8;">Tip: reply to this email and we'll help you get started.</p>`;

  return emailLayout("Your personalized marketing roadmap", body);
}

// Email 2 — the "new lead" notification for you.
function ownerEmailHtml(lead, product, plan) {
  const body = `
    <p style="margin:0 0 18px;font-size:16px;">You've got a new lead from the quiz.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;background:#f8fafc;border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <div style="font-size:18px;font-weight:bold;color:#1e293b;">${escapeHtml(lead.name) || "(no name)"}</div>
        <div style="font-size:14px;color:#475569;margin-top:4px;">${escapeHtml(lead.email)}</div>
        <div style="font-size:14px;color:#475569;margin-top:2px;">Sells: ${escapeHtml(product)}</div>
      </td></tr>
    </table>
    ${emailButton("Reply to " + (escapeHtml(lead.name) || "lead"), "mailto:" + lead.email + "?subject=Your%20marketing%20plan")}
    <div style="font-size:15px;font-weight:bold;color:#1e293b;margin:14px 0 4px;">Their answers</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${formatAnswers(lead.answers)}</table>
    <p style="margin:18px 0 0;font-size:14px;color:#475569;">Start point we gave them: <span style="font-weight:bold;color:#1e293b;">${escapeHtml(plan.startPoint.title)}</span></p>`;

  return emailLayout("New lead from your quiz", body);
}

// Email the plan to the visitor, and a "new lead" copy to the owner.
async function sendEmails(lead, plan) {
  const t = getTransporter();
  const product = lead.answers.product || "your business";
  const from = `"Your Marketer" <${GMAIL_USER}>`;

  // 1) To the visitor — their result
  await t.sendMail({
    from,
    to: lead.email,
    subject: `Your Marketing Roadmap for ${product}`,
    html: planEmailHtml(lead.name, product, plan)
  });

  // 2) To you — the lead notification
  await t.sendMail({
    from,
    to: NOTIFY_EMAIL,
    subject: `New lead: ${lead.name || "Unknown"} (${lead.email})`,
    html: ownerEmailHtml(lead, product, plan)
  });
}


// ============================================
//  The main route the browser calls.
//  Browser sends { name, email, answers } -> we make a plan, save the lead,
//  send the emails, and return the plan.
// ============================================
app.post("/api/generate", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Missing GROQ_API_KEY. Copy .env.example to .env and paste your key."
    });
  }

  const { name, email, answers = {} } = req.body || {};

  const systemPrompt = [
    "You are a friendly marketing coach for small business owners.",
    "Based on the user's answers, create ONE clear 'start point' (the single most",
    "important thing to focus on first) and a short, practical to-do checklist they",
    "can act on this week. Keep language simple, encouraging, and jargon-free.",
    "Tailor everything to their specific business, audience, budget, and goal.",
    "Respond ONLY with JSON in exactly this shape, nothing else:",
    '{ "startPoint": { "title": "string, max 6 words", "description": "2-4 plain sentences" },',
    '  "todos": ["6 to 10 short, specific, actionable tasks"] }'
  ].join(" ");

  const userPrompt =
    "Here are the small business owner's answers:\n" + JSON.stringify(answers, null, 2);

  try {
    // --- 1. Ask Groq for the plan ---
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      console.error("Groq error:", groqRes.status, detail);
      return res.status(502).json({ error: "Groq request failed (" + groqRes.status + ")." });
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const plan = JSON.parse(content);

    if (!plan.startPoint || !Array.isArray(plan.todos)) {
      return res.status(502).json({ error: "AI returned an unexpected format." });
    }

    // --- 2. Save the lead (best effort — never blocks the result) ---
    const lead = {
      date: new Date().toISOString(),
      name: name || "",
      email: email || "",
      answers,
      startPoint: plan.startPoint.title
    };
    let saved = false;
    try {
      await saveLead(lead);
      saved = true;
    } catch (e) {
      console.error("Could not save lead:", e);
    }

    // --- 3. Send emails (best effort) ---
    let emailed = false;
    if (emailReady() && email) {
      try {
        await sendEmails(lead, plan);
        emailed = true;
      } catch (e) {
        console.error("Could not send email:", e);
      }
    }

    // --- 4. Return the plan to the browser ---
    res.json({ ...plan, saved, emailed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong generating the plan." });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Your Marketer is running!  ->  http://localhost:${PORT}`);
  console.log(`  Email sending: ${emailReady() ? "ON (via Gmail)" : "OFF (add Gmail keys to .env)"}\n`);
});
