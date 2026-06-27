import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Supabase env vars not configured" });
  }

  const { moduleId, sourceId } = req.body;

  if (!moduleId && !sourceId) {
    return res.status(400).json({ error: "moduleId or sourceId required" });
  }

  try {
    const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (sourceId) {
      // De-ingest a single source: delete its chunks and reset status
      const { error: chunkErr } = await supabase
        .from("module_chunks")
        .delete()
        .eq("source_id", sourceId);

      if (chunkErr) throw chunkErr;

      await supabase
        .from("module_sources")
        .update({ processed: false, ingestion_status: "pending", raw_content: null })
        .eq("id", sourceId);

      return res.status(200).json({
        success: true,
        message: `Chunks deleted for source ${sourceId}. Status reset to pending.`,
      });
    }

    // De-ingest entire module: delete all chunks and reset all sources
    const { error: chunkErr } = await supabase
      .from("module_chunks")
      .delete()
      .eq("module_id", moduleId);

    if (chunkErr) throw chunkErr;

    await supabase
      .from("module_sources")
      .update({ processed: false, ingestion_status: "pending", raw_content: null })
      .eq("module_id", moduleId);

    await supabase
      .from("modules")
      .update({ status: "draft", processing_pct: 0 })
      .eq("id", moduleId);

    return res.status(200).json({
      success: true,
      message: `All chunks deleted for module ${moduleId}. Sources reset to pending.`,
    });
  } catch (err: any) {
    console.error("[de-ingest]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
