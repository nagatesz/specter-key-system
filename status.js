// api/status.js
// GET /api/status — pinged by the frontend to show ONLINE/OFFLINE indicator
// Also used by your DLL to heartbeat check the auth server

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status: "online",
    version: "2.4.1",
    timestamp: Date.now(),
  });
}
