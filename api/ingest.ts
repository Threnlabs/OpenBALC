import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { ingestSource } from "../src/lib/ingestion";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY || "";
  const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sourceId, moduleId, type, name, content, url, storagePath } = req.body;

  if (!sourceId || !moduleId || !type || !name) {
    return res.status(400).json({ error: "Missing required fields: sourceId, moduleId, type, name" });
  }

  const supabase = createClient(
    VITE_SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  );

  // ── Fetch admin-configured chunk sizes ───────────────────────────────────
  let chunkTargetTokens = 500;
  let chunkOverlapTokens = 100;
  try {
    const { data: cfg } = await supabase.from("ingestion_config").select("key, value");
    if (cfg) {
      const map = Object.fromEntries(cfg.map((r: any) => [r.key, r.value]));
      if (map["chunk_target_tokens"]) chunkTargetTokens = parseInt(map["chunk_target_tokens"], 10);
      if (map["chunk_overlap_tokens"]) chunkOverlapTokens = parseInt(map["chunk_overlap_tokens"], 10);
    }
  } catch {
    // Non-fatal — use defaults
  }

  // ── No Gemini key: create placeholder content ─────────────────────────────
  if (!GEMINI_API_KEY) {
    console.warn("[backend-ingest] GEMINI_API_KEY not configured. Creating placeholder content.");
    try {
      await supabase.from("module_sources")
        .update({ processed: true, ingestion_status: "done" })
        .eq("id", sourceId);

      await supabase.from("module_content").insert({
        module_id: moduleId,
        chapter: "Chapter Outline",
        topic: `Summary of ${name}`,
        content: `This chapter covers content ingested from "${name}". Set GEMINI_API_KEY to enable AI extraction and embedding.`,
      });

      const { data: mod } = await supabase.from("modules").select("source_count, chapter_count").eq("id", moduleId).single();
      await supabase.from("modules").update({
        source_count: (mod?.source_count || 0) + 1,
        chapter_count: (mod?.chapter_count || 0) + 1,
        status: "active",
        processing_pct: 100,
      }).eq("id", moduleId);

      return res.status(200).json({
        success: false,
        error: "GEMINI_API_KEY not configured. Created placeholder content instead.",
      });
    } catch (dbErr: any) {
      return res.status(500).json({ error: dbErr.message || "Failed to create placeholder content" });
    }
  }

  try {
    let fileBlob: Blob | undefined;

    // Download PDF from Supabase Storage if needed
    if (type === "pdf" && storagePath && LLAMA_CLOUD_API_KEY && VITE_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.info(`[backend-ingest] Downloading PDF: ${storagePath}`);
      const { data, error } = await supabase.storage.from("module-assets").download(storagePath);
      if (error) {
        console.error(`[backend-ingest] PDF download failed: ${error.message}`);
      } else if (data) {
        fileBlob = data;
      }
    }

    console.info(`[backend-ingest] Starting ingestion for source ${sourceId} (chunk=${chunkTargetTokens}t, overlap=${chunkOverlapTokens}t)`);

    // Fire-and-forget — passes admin-configured chunk sizing
    ingestSource(
      {
        id: Number(sourceId),
        moduleId: Number(moduleId),
        type,
        name,
        content: content || undefined,
        url: url || undefined,
        file: fileBlob as any,
      },
      GEMINI_API_KEY,
      LLAMA_CLOUD_API_KEY || undefined,
      { targetTokens: chunkTargetTokens, overlapTokens: chunkOverlapTokens }
    ).catch((err: any) => {
      console.error(`[backend-ingest] Async pipeline error for source ${sourceId}:`, err);
    });

    return res.status(200).json({
      success: true,
      message: `Ingestion triggered (chunk size: ${chunkTargetTokens} tokens, overlap: ${chunkOverlapTokens} tokens).`,
    });
  } catch (err: any) {
    console.error("[backend-ingest] Trigger failed:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

