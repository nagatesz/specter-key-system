import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  "https://yhmskbvrhzgwvmdoiyaj.supabase.co",
  "sb_secret_k3VpS7-HrBw5E7D1u5VWDw_UqQwJsmx"
);

function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-HWID");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { key } = req.body || {};
  const hwid    = req.headers["x-hwid"]?.trim() || null;
  const ip      = getClientIP(req);

  if (!key || typeof key !== "string") {
    return res.status(400).json({ valid: false, message: "No key provided." });
  }
  const cleanKey = key.toUpperCase().trim();

  const { data: record, error } = await supabase
    .from("keys")
    .select("*")
    .eq("key", cleanKey)
    .single();

  if (error || !record) {
    return res.status(200).json({ valid: false, message: "Key not found." });
  }

  if (!record.active) {
    return res.status(200).json({ valid: false, message: "Key has been revoked." });
  }

  if (record.expires_at && new Date() > new Date(record.expires_at)) {
    return res.status(200).json({ valid: false, message: "Key has expired." });
  }

  const isFirstUse = !record.hwid && !record.ip;

  if (isFirstUse) {
    await supabase.from("keys").update({ hwid, ip }).eq("id", record.id);
  } else {
    if (record.hwid && hwid && record.hwid !== hwid) {
      return res.status(200).json({ valid: false, message: "HWID mismatch. Key is locked to another machine." });
    }
    if (record.ip && record.ip !== ip) {
      return res.status(200).json({ valid: false, message: "IP mismatch. Key is locked to another network." });
    }
  }

  await supabase.from("keys").update({
    last_used: new Date().toISOString(),
    use_count: (record.use_count || 0) + 1,
  }).eq("id", record.id);

  const token       = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("sessions").insert({
    key_id: record.id, token, hwid, ip, expires_at: tokenExpiry,
  });

  return res.status(200).json({
    valid: true, token, expires: record.expires_at || "Never", message: "Authenticated.",
  });
}
