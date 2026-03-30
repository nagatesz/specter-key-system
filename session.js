import { createClient } from "@supabase/supabase-js";

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

  const { token } = req.body || {};
  const hwid = req.headers["x-hwid"]?.trim() || null;
  const ip   = getClientIP(req);

  if (!token) {
    return res.status(400).json({ valid: false, message: "No token provided." });
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*, keys(active, hwid, ip)")
    .eq("token", token)
    .single();

  if (error || !session) {
    return res.status(200).json({ valid: false, message: "Session not found." });
  }

  if (new Date() > new Date(session.expires_at)) {
    await supabase.from("sessions").delete().eq("token", token);
    return res.status(200).json({ valid: false, message: "Session expired. Re-authenticate." });
  }

  if (!session.keys?.active) {
    return res.status(200).json({ valid: false, message: "Key revoked." });
  }

  if (session.hwid && hwid && session.hwid !== hwid) {
    return res.status(200).json({ valid: false, message: "HWID mismatch on session." });
  }

  if (session.ip && session.ip !== ip) {
    return res.status(200).json({ valid: false, message: "IP mismatch on session." });
  }

  return res.status(200).json({ valid: true, message: "Session active." });
}
