export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-HWID");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Stub — always returns valid for now
  return res.status(200).json({ valid: true, message: "Session active." });
}
