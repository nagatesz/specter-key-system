import crypto from "crypto";

// ── ADD YOUR KEYS HERE ────────────────────────────────────────────────
const KEYS = {
  "ABCD-EFGH-IJKL": { expires: null },
  "NOG-TEST-1234":  { expires: null },
  "SPEC-TRES-GOAT-1234": { expires: "2026-12-31" },
};
// ─────────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-HWID");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { key } = req.body || {};
  if (!key) return res.status(400).json({ valid: false, message: "No key provided." });

  const clean = key.toUpperCase().trim();
  const record = KEYS[clean];

  if (!record) return res.status(200).json({ valid: false, message: "Key not found." });

  if (record.expires && new Date() > new Date(record.expires)) {
    return res.status(200).json({ valid: false, message: "Key has expired." });
  }

  const token = crypto.randomBytes(32).toString("hex");

  return res.status(200).json({
    valid: true,
    token,
    expires: record.expires || "Never",
    message: "Authenticated.",
  });
}
