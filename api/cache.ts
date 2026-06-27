import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(200).json({ result: null, error: "Redis cache not configured on backend" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { command } = req.body;
    if (!Array.isArray(command) || command.length === 0) {
      return res.status(400).json({ error: "Invalid command format. Must be a non-empty array." });
    }

    const path = command.map((c) => encodeURIComponent(String(c))).join("/");
    const redisRes = await fetch(`${REDIS_URL}/${path}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });

    if (!redisRes.ok) {
      return res.status(500).json({ error: `Upstash Redis returned HTTP ${redisRes.status}` });
    }

    const json = await redisRes.json();
    return res.status(200).json({ result: json.result ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
