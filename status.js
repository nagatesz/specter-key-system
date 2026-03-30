export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ status: "online", version: "2.4.1", timestamp: Date.now() });
}
