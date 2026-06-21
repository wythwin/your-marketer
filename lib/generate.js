// ============================================
//  lib/generate.js — shared "brain"
//
//  Both the local Express server (server.js) and the Vercel serverless
//  function (api/generate.js) call generatePlan() from here, so the logic
//  lives in ONE place. It:
//   1. Asks Groq for a personalized plan.
//   2. Saves the lead to files (skipped on Vercel — read-only disk).
//   3. Emails the plan to the visitor + a "new lead" copy to the owner.
//
//  Note: all secrets are read from process.env *inside* the functions, so it
//  works whether env vars come from a local .env or from Vercel's dashboard.
// ============================================

import nodemailer from "nodemailer";
import { appendFile, readFile, writeFile } from "fs/promises";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Vercel sets process.env.VERCEL = "1" — its filesystem is read-only, so we
// skip file writes there and rely on the owner email as the lead record.
function canSaveFiles() {
  return !process.env.VERCEL;
}

export function emailReady() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
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

// Friendly labels so the owner email reads nicely instead of raw codes.
const ANSWER_LABELS = {
  product:         { q: "What they sell" },
  audience:        { q: "Customers", v: { local: "Local people", online: "Anyone online", business: "Other businesses (B2B)", unsure: "Not sure yet" } },
  online_presence: { q: "Online presence", v: { none: "None yet", social: "Social media only", website: "Website only", both: "Website + social" } },
  posting:         { q: "Posting frequency", v: { never: "Never", rarely: "A few times a month", weekly: "About weekly", daily: "Almost daily" } },
  budget:          { q: "Monthly budget", v: { zero: "$0 (free only)", small: "Under $100", medium: "$100–$500", large: "Over $500" } },
  goal:            { q: "Main goal", v: { awareness: "More awareness", leads: "More inquiries / calls", sales: "More sales", repeat: "Repeat customers" } }
};

// Save a lead to both a JSON list and a CSV (easy to open in Excel/Sheets).
async function saveLead(lead) {
  if (!canSaveFiles()) return false; // serverless: rely on the owner email instead

  let list = [];
  try {
    list = JSON.parse(await readFile("leads.json", "utf8"));
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(lead);
  await writeFile("leads.json", JSON.stringify(list, null, 2));

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
  return true;
}

// Shared email shell: branded header + body + footer (tables + inline styles
// for email-client compatibility).
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

function emailButton(text, href, color) {
  color = color || "#4f46e5";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
    <td style="border-radius:10px;background:${color};">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(text)}</a>
    </td></tr></table>`;
}

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
    ${emailButton("Questions? Just reply", "mailto:" + process.env.GMAIL_USER)}
    <p style="margin:0;font-size:13px;color:#94a3b8;">Tip: reply to this email and we'll help you get started.</p>`;

  return emailLayout("Your personalized marketing roadmap", body);
}

// Email 2 — the "new lead" notification for the owner.
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

async function sendEmails(lead, plan) {
  const t = getTransporter();
  const product = lead.answers.product || "your business";
  const from = `"Your Marketer" <${process.env.GMAIL_USER}>`;

  await t.sendMail({
    from,
    to: lead.email,
    subject: `Your Marketing Roadmap for ${product}`,
    html: planEmailHtml(lead.name, product, plan)
  });

  await t.sendMail({
    from,
    to: process.env.LEAD_NOTIFY_EMAIL || process.env.GMAIL_USER,
    subject: `New lead: ${lead.name || "Unknown"} (${lead.email})`,
    html: ownerEmailHtml(lead, product, plan)
  });
}


// ============================================
//  The shared entry point.
//  Takes { name, email, answers } and returns { status, body }.
// ============================================
export async function generatePlan({ name = "", email = "", answers = {} } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      body: { error: "Missing GROQ_API_KEY. Set it in your .env (local) or Vercel env vars." }
    };
  }

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
      return { status: 502, body: { error: "Groq request failed (" + groqRes.status + ")." } };
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const plan = JSON.parse(content);

    if (!plan.startPoint || !Array.isArray(plan.todos)) {
      return { status: 502, body: { error: "AI returned an unexpected format." } };
    }

    const lead = {
      date: new Date().toISOString(),
      name,
      email,
      answers,
      startPoint: plan.startPoint.title
    };

    let saved = false;
    try {
      saved = await saveLead(lead);
    } catch (e) {
      console.error("Could not save lead:", e);
    }

    let emailed = false;
    if (emailReady() && email) {
      try {
        await sendEmails(lead, plan);
        emailed = true;
      } catch (e) {
        console.error("Could not send email:", e);
      }
    }

    return { status: 200, body: { ...plan, saved, emailed } };
  } catch (err) {
    console.error(err);
    return { status: 500, body: { error: "Something went wrong generating the plan." } };
  }
}
