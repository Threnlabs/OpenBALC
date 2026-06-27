/**
 * OpenBALC — Ingestion Pipeline
 *
 * Hybrid chunking strategy:
 *   • content      → configurable token window (default 500t / 100t overlap)
 *   • table        → entire markdown table as one chunk (no splitting)
 *   • image_caption → caption text + asset_url stored as dedicated chunk
 *
 * Stage A — Text Extraction   : pdf.js | Jina Reader | plain text
 * Stage B — Asset Captioning  : Gemini Flash (images, tables)
 * Stage C — Hybrid Chunking   : type-aware splitter with rich metadata
 * Stage D — Embedding         : Gemini text-embedding-004 (768 dims)
 * Stage E — DB Write          : INSERT module_chunks, UPDATE module_sources
 */

import { createClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestionSource {
  id: number;
  moduleId: number;
  type: "pdf" | "url" | "text";
  name: string;
  content?: string;
  url?: string;
  file?: File;
}

export interface ChunkConfig {
  targetTokens: number;
  overlapTokens: number;
}

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  targetTokens: 500,
  overlapTokens: 100,
};

/** Chunk types matching DB CHECK constraint */
type ChunkType = "content" | "table" | "image_caption";

interface ExtractedAsset {
  kind: "image" | "table";
  raw: string;
  context: string;
  /** Public URL for images extracted from PDFs */
  url?: string;
}

interface AssetDescription {
  kind: "image" | "table";
  context: string;
  caption: string;
  url?: string;
}

interface TextChunk {
  text: string;
  tokenCount: number;
  chunkIndex: number;
  chunkType: ChunkType;
  /** Public URL — only set for image_caption chunks */
  assetUrl?: string;
  metadata: Record<string, unknown>;
}

interface EmbeddedChunk extends TextChunk {
  embedding: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Rough average chars-per-token for English text */
const CHARS_PER_TOKEN = 4;

const GEMINI_EMBED_MODEL = "text-embedding-004";
const GEMINI_FLASH_MODEL = "gemini-1.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  const url =
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : null) ||
    (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const key =
    (typeof process !== "undefined"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
      : null) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

// ─── Fetch chunk config from DB ───────────────────────────────────────────────

export async function fetchChunkConfig(): Promise<ChunkConfig> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("ingestion_config")
      .select("key, value");
    if (error || !data) return DEFAULT_CHUNK_CONFIG;
    const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
    return {
      targetTokens: parseInt(map["chunk_target_tokens"] ?? "500", 10),
      overlapTokens: parseInt(map["chunk_overlap_tokens"] ?? "100", 10),
    };
  } catch {
    return DEFAULT_CHUNK_CONFIG;
  }
}

export async function saveChunkConfig(config: ChunkConfig): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("ingestion_config").upsert([
    { key: "chunk_target_tokens", value: String(config.targetTokens) },
    { key: "chunk_overlap_tokens", value: String(config.overlapTokens) },
  ]);
}

// ─── Stage A: Text Extraction ─────────────────────────────────────────────────

async function extractText(
  source: IngestionSource,
  llamaCloudApiKey?: string
): Promise<{ text: string; assets: ExtractedAsset[] }> {
  let rawText = "";
  let assets: ExtractedAsset[] = [];

  switch (source.type) {
    case "text":
      rawText = source.content ?? "";
      assets = detectAssets(rawText);
      break;

    case "url": {
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(source.url ?? "")}`;
      const res = await fetch(jinaUrl, { headers: { Accept: "text/markdown,text/plain,*/*" } });
      if (!res.ok) throw new Error(`Jina Reader failed: ${res.status}`);
      rawText = await res.text();
      assets = detectAssets(rawText);
      break;
    }

    case "pdf": {
      if (!source.file) {
        rawText = `[PDF source: ${source.name}. Binary file not available for extraction.]`;
        assets = detectAssets(rawText);
        break;
      }
      if (llamaCloudApiKey) {
        const result = await extractPdfWithLlamaParse(source.file, source.moduleId, llamaCloudApiKey);
        rawText = result.text;
        assets = result.assets;
      } else {
        rawText = await extractPdfText(source.file);
        assets = detectAssets(rawText);
      }
      break;
    }
  }

  return { text: rawText, assets };
}

async function extractPdfWithLlamaParse(
  file: File,
  moduleId: number,
  apiKey: string
): Promise<{ text: string; assets: ExtractedAsset[] }> {
  const supabase = getSupabase();

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("purpose", "parse");

  const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/v1/beta/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: uploadFormData,
  });
  if (!uploadRes.ok) throw new Error(`LlamaCloud upload failed: ${uploadRes.status}`);
  const { id: fileId } = await uploadRes.json();

  const createJobRes = await fetch("https://api.cloud.llamaindex.ai/api/v2/parse", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      tier: "agentic",
      version: "latest",
      output_options: { images_to_save: ["embedded", "layout"] },
    }),
  });
  if (!createJobRes.ok) throw new Error(`LlamaParse job failed: ${createJobRes.status}`);
  const { id: jobId } = await createJobRes.json();

  let status = "PENDING";
  let pollAttempts = 0;
  let parseDetails: any = null;

  while (status !== "COMPLETED" && status !== "SUCCESS" && pollAttempts < 120) {
    await new Promise((r) => setTimeout(r, 2000));
    pollAttempts++;
    const statusRes = await fetch(
      `https://api.cloud.llamaindex.ai/api/v2/parse/${jobId}?expand=markdown,images_content_metadata`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!statusRes.ok) continue;
    parseDetails = await statusRes.json();
    status = parseDetails.status;
    if (status === "FAILED" || status === "ERROR") throw new Error(`LlamaParse failed: ${parseDetails.error}`);
  }
  if (status !== "COMPLETED" && status !== "SUCCESS") throw new Error("LlamaParse timed out");

  const markdownText = parseDetails.markdown || "";
  const images = parseDetails.images_content_metadata?.images || [];
  const imageUrlMap: Record<string, string> = {};

  for (const img of images) {
    if (!img.presigned_url) continue;
    try {
      const imgBlob = await (await fetch(img.presigned_url)).blob();
      const supabasePath = `modules/${moduleId}/${img.filename}`;
      await supabase.storage.from("module-assets").upload(supabasePath, imgBlob, {
        contentType: imgBlob.type || "image/png",
        upsert: true,
      });
      const { data: urlData } = supabase.storage.from("module-assets").getPublicUrl(supabasePath);
      imageUrlMap[img.filename] = urlData.publicUrl;
    } catch (err) {
      console.warn(`[ingestion] Failed to process image ${img.filename}:`, err);
    }
  }

  const finalMarkdown = markdownText.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match: string, altText: string, imgUrlPath: string) => {
      const filename = imgUrlPath.split("/").pop() || "";
      return imageUrlMap[filename]
        ? `![${altText}](${imageUrlMap[filename]})`
        : `![${altText}](${imgUrlPath})`;
    }
  );

  return { text: finalMarkdown, assets: detectAssets(finalMarkdown, imageUrlMap) };
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tokenObj = await page.getTextContent();
    pages.push(`### Page ${i}\n\n${tokenObj.items.map((item: any) => item.str ?? "").join(" ")}`);
  }
  return pages.join("\n\n---\n\n");
}

function detectAssets(text: string, imageUrlMap: Record<string, string> = {}): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const lines = text.split("\n");
  let lastHeading = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,4}\s/.test(line)) lastHeading = line.replace(/^#+\s/, "").trim();

    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const url = imgMatch[2];
      const filename = url.split("/").pop() || "";
      assets.push({ kind: "image", raw: line.trim(), context: lastHeading, url: imageUrlMap[filename] || url });
      continue;
    }

    if (line.trim().startsWith("|") && lines[i + 1]?.includes("|-")) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|")) tableLines.push(lines[j++]);
      if (tableLines.length >= 2) {
        assets.push({ kind: "table", raw: tableLines.join("\n"), context: lastHeading });
        i = j - 1;
      }
    }
  }
  return assets;
}

// ─── Stage B: Asset Captioning ────────────────────────────────────────────────

async function captionAssets(
  assets: ExtractedAsset[],
  geminiApiKey: string
): Promise<AssetDescription[]> {
  if (!geminiApiKey || assets.length === 0) return [];
  const descriptions: AssetDescription[] = [];

  for (const asset of assets) {
    try {
      const prompt =
        asset.kind === "image"
          ? `You are an educational AI. The following image appears in section "${asset.context}":\n${asset.raw}\nDescribe what this image likely shows in 2-3 sentences, focusing on its educational significance.`
          : `You are an educational AI. The following table appears in section "${asset.context}":\n${asset.raw}\nSummarize what this table shows in 2-3 sentences, highlighting key data and relationships.`;

      const res = await fetch(
        `${GEMINI_BASE_URL}/models/${GEMINI_FLASH_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const caption: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        descriptions.push({ kind: asset.kind, context: asset.context, caption, url: asset.url });
      }
    } catch (err) {
      console.warn("[ingestion] Asset captioning failed:", err);
    }
  }

  return descriptions;
}

// ─── Stage C: Hybrid Chunking ─────────────────────────────────────────────────

/**
 * Hybrid chunking:
 *  - Tables      → one chunk per table, regardless of size
 *  - Images      → one image_caption chunk with caption + asset_url
 *  - Content     → recursive token-window splitter with overlap
 */
export function hybridChunkText(
  text: string,
  assets: ExtractedAsset[],
  assetDescriptions: AssetDescription[],
  baseMetadata: Record<string, unknown>,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  const chunkSizeChars = config.targetTokens * CHARS_PER_TOKEN;
  const overlapChars = config.overlapTokens * CHARS_PER_TOKEN;

  // Build a set of asset raw strings to skip in content chunking
  const assetRawSet = new Set(assets.map((a) => a.raw));

  // ── 1. Table chunks (whole table = one chunk) ─────────────────────────────
  const tableAssets = assets.filter((a) => a.kind === "table");
  for (const table of tableAssets) {
    const desc = assetDescriptions.find(
      (d) => d.kind === "table" && d.context === table.context
    );
    const captionSuffix = desc?.caption ? `\n\n> **📊 Table Summary**: ${desc.caption}` : "";
    const fullText = `${table.raw}${captionSuffix}`;
    chunks.push({
      text: fullText,
      tokenCount: Math.ceil(fullText.length / CHARS_PER_TOKEN),
      chunkIndex: chunkIndex++,
      chunkType: "table",
      metadata: { ...baseMetadata, context: table.context, chunk_index: chunkIndex },
    });
  }

  // ── 2. Image caption chunks (caption + link to asset) ────────────────────
  const imageAssets = assets.filter((a) => a.kind === "image");
  for (const img of imageAssets) {
    const desc = assetDescriptions.find(
      (d) => d.kind === "image" && d.context === img.context
    );
    if (!desc?.caption) continue;
    const url = img.url || "";
    const captionText = `[Image in section "${img.context}"] ${desc.caption}${url ? `\n\nSource: ${url}` : ""}`;
    chunks.push({
      text: captionText,
      tokenCount: Math.ceil(captionText.length / CHARS_PER_TOKEN),
      chunkIndex: chunkIndex++,
      chunkType: "image_caption",
      assetUrl: url || undefined,
      metadata: { ...baseMetadata, context: img.context, asset_url: url, chunk_index: chunkIndex },
    });
  }

  // ── 3. Content chunks — skip asset lines, use sliding window ─────────────
  // Strip table/image lines from the main text so they don't double-appear
  const contentLines = text
    .split("\n")
    .filter((line) => !assetRawSet.has(line.trim()))
    .join("\n");

  const cleanContent = contentLines.trim();
  if (!cleanContent) return chunks;

  const paragraphs = cleanContent.split(/\n\n+/);
  let current = "";

  const flushContent = (buf: string) => {
    const trimmed = buf.trim();
    if (!trimmed) return;
    const tokenCount = Math.ceil(trimmed.length / CHARS_PER_TOKEN);
    chunks.push({
      text: trimmed,
      tokenCount,
      chunkIndex: chunkIndex++,
      chunkType: "content",
      metadata: { ...baseMetadata, chunk_index: chunkIndex },
    });
  };

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= chunkSizeChars) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) {
        flushContent(current);
        const overlap = current.slice(-overlapChars);
        current = overlap ? `${overlap}\n\n${para}` : para;
      } else {
        // Single oversized paragraph — split by lines
        const lines = para.split("\n");
        let lineBuf = "";
        for (const line of lines) {
          if (lineBuf.length + line.length + 1 <= chunkSizeChars) {
            lineBuf = lineBuf ? `${lineBuf}\n${line}` : line;
          } else {
            if (lineBuf) flushContent(lineBuf);
            lineBuf = line;
          }
        }
        current = lineBuf;
      }
    }
  }
  if (current) flushContent(current);

  return chunks;
}

// ─── Stage D: Embedding ───────────────────────────────────────────────────────

async function embedText(text: string, geminiApiKey: string): Promise<number[]> {
  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_EMBED_MODEL}:embedContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini embed failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const values: number[] = data?.embedding?.values;
  if (!values?.length) throw new Error("Gemini embed returned empty vector");
  return values;
}

async function embedChunks(chunks: TextChunk[], geminiApiKey: string): Promise<EmbeddedChunk[]> {
  const EMBED_DIMS = 768;
  const embedded: EmbeddedChunk[] = [];

  for (const chunk of chunks) {
    try {
      const embedding = await embedText(chunk.text, geminiApiKey);
      embedded.push({ ...chunk, embedding });
    } catch (err) {
      console.warn(`[ingestion] Embedding failed for chunk ${chunk.chunkIndex}:`, err);
      embedded.push({ ...chunk, embedding: new Array(EMBED_DIMS).fill(0) });
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  return embedded;
}

// ─── Stage E: DB Write ────────────────────────────────────────────────────────

async function writeToDatabase(
  source: IngestionSource,
  chunks: EmbeddedChunk[],
  rawText: string,
  assetDescriptions: AssetDescription[]
): Promise<void> {
  const supabase = getSupabase();

  if (chunks.length === 0) {
    await supabase
      .from("module_sources")
      .update({ processed: true, ingestion_status: "done", raw_content: rawText, asset_descriptions: assetDescriptions })
      .eq("id", source.id);
    return;
  }

  // Delete old chunks for this source before re-ingesting
  await supabase.from("module_chunks").delete().eq("source_id", source.id);

  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const rows = batch.map((c) => ({
      module_id: source.moduleId,
      source_id: source.id,
      content: c.text,
      token_count: c.tokenCount,
      chunk_type: c.chunkType,
      chunk_index: c.chunkIndex,
      asset_url: c.assetUrl ?? null,
      times_retrieved: 0,
      metadata: {
        ...c.metadata,
        source_name: source.name,
        source_type: source.type,
      },
      embedding: `[${c.embedding.join(",")}]`,
    }));

    const { error } = await supabase.from("module_chunks").insert(rows);
    if (error) throw new Error(`DB write failed for batch ${i}: ${error.message}`);
  }

  await supabase
    .from("module_sources")
    .update({ processed: true, ingestion_status: "done", raw_content: rawText, asset_descriptions: assetDescriptions })
    .eq("id", source.id);

  const { data: mod } = await supabase
    .from("modules")
    .select("source_count, chapter_count")
    .eq("id", source.moduleId)
    .single();

  await supabase
    .from("modules")
    .update({
      status: "active",
      processing_pct: 100,
      source_count: (mod?.source_count ?? 0) + 1,
      chapter_count: (mod?.chapter_count ?? 0) + 1,
    })
    .eq("id", source.moduleId);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function ingestSource(
  source: IngestionSource,
  geminiApiKey: string,
  llamaCloudApiKey?: string,
  configOverride?: ChunkConfig
): Promise<void> {
  const supabase = getSupabase();

  if (!geminiApiKey) {
    console.warn("[ingestion] GEMINI_API_KEY not set — skipping");
    return;
  }

  try {
    await supabase.from("module_sources").update({ ingestion_status: "processing" }).eq("id", source.id);
    await supabase.from("modules").update({ status: "processing", processing_pct: 10 }).eq("id", source.moduleId);

    // Stage A
    const { text: rawText, assets } = await extractText(source, llamaCloudApiKey);
    await supabase.from("modules").update({ processing_pct: 30 }).eq("id", source.moduleId);

    // Stage B
    const assetDescriptions = await captionAssets(assets, geminiApiKey);
    await supabase.from("modules").update({ processing_pct: 50 }).eq("id", source.moduleId);

    // Stage C — Hybrid chunking
    const config = configOverride ?? await fetchChunkConfig();
    const chunks = hybridChunkText(rawText, assets, assetDescriptions, {
      source_id: source.id,
      module_id: source.moduleId,
      source_name: source.name,
    }, config);
    await supabase.from("modules").update({ processing_pct: 65 }).eq("id", source.moduleId);

    // Stage D
    const embeddedChunks = await embedChunks(chunks, geminiApiKey);
    await supabase.from("modules").update({ processing_pct: 90 }).eq("id", source.moduleId);

    // Stage E
    await writeToDatabase(source, embeddedChunks, rawText, assetDescriptions);

    const contentCount = chunks.filter((c) => c.chunkType === "content").length;
    const tableCount = chunks.filter((c) => c.chunkType === "table").length;
    const captionCount = chunks.filter((c) => c.chunkType === "image_caption").length;
    console.info(
      `[ingestion] ✅ "${source.name}" — ${chunks.length} chunks ` +
      `(content: ${contentCount}, tables: ${tableCount}, captions: ${captionCount})`
    );
  } catch (err) {
    console.error(`[ingestion] ❌ Pipeline failed for source ${source.id}:`, err);
    await supabase.from("module_sources").update({ ingestion_status: "failed", processed: false }).eq("id", source.id);
    await supabase.from("modules").update({ status: "active", processing_pct: 100 }).eq("id", source.moduleId);
  }
}
