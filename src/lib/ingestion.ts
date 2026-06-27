/**
 * OpenBALC — Ingestion Pipeline (Client-Side)
 *
 * 5-Stage automatic ingestion trigger for module sources.
 * Fires after a source is inserted into module_sources and populates
 * module_chunks with semantic embeddings for hybrid RAG retrieval.
 *
 * Stage A — Text Extraction   : pdf.js | Jina Reader | plain text
 * Stage B — Asset Captioning  : Gemini 1.5 Flash (images, tables)
 * Stage C — Chunking          : Recursive 512-token splitter, 50-token overlap
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
  /** Binary file object — only present for pdf/file uploads from AddSourceModal */
  file?: File;
}

interface ExtractedAsset {
  kind: "image" | "table";
  /** Raw markdown or base64 data for image, markdown table string for table */
  raw: string;
  /** Position context (surrounding heading) */
  context: string;
}

interface AssetDescription {
  kind: "image" | "table";
  context: string;
  caption: string;
}

interface TextChunk {
  text: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

interface EmbeddedChunk extends TextChunk {
  /** 768-dim vector from Gemini text-embedding-004 */
  embedding: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_TARGET_TOKENS = 512;
const CHUNK_OVERLAP_TOKENS = 50;
/** Rough average chars-per-token for English text */
const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_CHARS = CHUNK_TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

const GEMINI_EMBED_MODEL = "text-embedding-004";
const GEMINI_FLASH_MODEL = "gemini-1.5-flash";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

// ─── Supabase client (mirrors src/lib/supabase.ts) ────────────────────────────

function getSupabase() {
  const url = (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : null) || (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const key = (typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY : null) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

// ─── Stage A: Text Extraction ─────────────────────────────────────────────────

/**
 * Extract clean markdown text from the source.
 * Also identifies raw embedded asset references (images, tables).
 */
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
      const targetUrl = source.url ?? "";
      // Use Jina Reader to bypass CORS and get clean markdown
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`;
      const res = await fetch(jinaUrl, {
        headers: { Accept: "text/markdown,text/plain,*/*" },
      });
      if (!res.ok) {
        throw new Error(`Jina Reader failed for ${targetUrl}: ${res.status}`);
      }
      rawText = await res.text();
      assets = detectAssets(rawText);
      break;
    }

    case "pdf": {
      if (!source.file) {
        // Fallback: use the source name as minimal content
        rawText = `[PDF source: ${source.name}. Binary file was not available for text extraction.]`;
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

/** Parse PDF using LlamaParse v2 API, uploading figures directly to Supabase storage */
async function extractPdfWithLlamaParse(
  file: File,
  moduleId: number,
  apiKey: string
): Promise<{ text: string; assets: ExtractedAsset[] }> {
  const supabase = getSupabase();

  console.info("[ingestion] Uploading PDF to LlamaCloud...");
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("purpose", "parse");

  const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/v1/beta/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: uploadFormData,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`LlamaCloud file upload failed (${uploadRes.status}): ${errorText}`);
  }

  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;
  console.info(`[ingestion] Uploaded successfully. File ID: ${fileId}`);

  console.info("[ingestion] Creating LlamaParse job...");
  const createJobRes = await fetch("https://api.cloud.llamaindex.ai/api/v2/parse", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: fileId,
      tier: "agentic",
      version: "latest",
      output_options: {
        images_to_save: ["embedded", "layout"],
      },
    }),
  });

  if (!createJobRes.ok) {
    const errorText = await createJobRes.text();
    throw new Error(`LlamaParse job creation failed (${createJobRes.status}): ${errorText}`);
  }

  const jobData = await createJobRes.json();
  const jobId = jobData.id;
  console.info(`[ingestion] Parse job created. Job ID: ${jobId}`);

  let status = "PENDING";
  let pollAttempts = 0;
  const maxAttempts = 120; // 4 minutes max
  let parseDetails: any = null;

  while (status !== "COMPLETED" && status !== "SUCCESS" && pollAttempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    pollAttempts++;
    console.info(`[ingestion] Polling job status (attempt ${pollAttempts})...`);

    const statusRes = await fetch(
      `https://api.cloud.llamaindex.ai/api/v2/parse/${jobId}?expand=markdown,images_content_metadata`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusRes.ok) {
      console.warn(`[ingestion] Polling failed (${statusRes.status}). Retrying...`);
      continue;
    }

    parseDetails = await statusRes.json();
    status = parseDetails.status;
    console.info(`[ingestion] Job status: ${status}`);

    if (status === "FAILED" || status === "ERROR") {
      throw new Error(`LlamaParse job failed: ${parseDetails.error || "Unknown error"}`);
    }
  }

  if (status !== "COMPLETED" && status !== "SUCCESS") {
    throw new Error("LlamaParse job timed out.");
  }

  const markdownText = parseDetails.markdown || "";
  const images = parseDetails.images_content_metadata?.images || [];
  const imageUrlMap: Record<string, string> = {};

  console.info(`[ingestion] Parsing successful. Extracted ${images.length} images.`);

  for (const img of images) {
    const filename = img.filename;
    const presignedUrl = img.presigned_url;

    if (!presignedUrl) continue;

    try {
      console.info(`[ingestion] Downloading image ${filename}...`);
      const imgFetchRes = await fetch(presignedUrl);
      if (!imgFetchRes.ok) {
        throw new Error(`Failed to fetch image from presigned URL: ${imgFetchRes.status}`);
      }

      const imgBlob = await imgFetchRes.blob();
      const supabasePath = `modules/${moduleId}/${filename}`;

      console.info(`[ingestion] Uploading image ${filename} to Supabase...`);
      const { error: uploadError } = await supabase.storage
        .from("module-assets")
        .upload(supabasePath, imgBlob, {
          contentType: imgBlob.type || "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("module-assets")
        .getPublicUrl(supabasePath);

      imageUrlMap[filename] = publicUrlData.publicUrl;
      console.info(`[ingestion] Successfully uploaded ${filename} -> ${publicUrlData.publicUrl}`);
    } catch (err) {
      console.error(`[ingestion] Failed to process image ${filename}:`, err);
    }
  }

  const finalMarkdown = markdownText.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match: string, altText: string, imgUrlPath: string) => {
      const filename = imgUrlPath.split("/").pop() || "";
      if (imageUrlMap[filename]) {
        return `![${altText}](${imageUrlMap[filename]})`;
      }
      return match;
    }
  );

  const assets = detectAssets(finalMarkdown);

  return { text: finalMarkdown, assets };
}


/** Extract readable text from a PDF File using pdf.js via CDN */
export async function extractPdfText(file: File): Promise<string> {
  // Dynamically import pdf.js from CDN to keep bundle lean
  // @ts-ignore — dynamic CDN import
  const pdfjs = await import(
    /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs"
  );

  // Use CDN worker
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tokenObj = await page.getTextContent();
    const pageText = tokenObj.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(`### Page ${i}\n\n${pageText}`);
  }

  return pages.join("\n\n---\n\n");
}

/** Scan markdown for embedded image tags and table blocks */
function detectAssets(text: string): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const lines = text.split("\n");
  let lastHeading = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track headings for context
    if (/^#{1,4}\s/.test(line)) {
      lastHeading = line.replace(/^#+\s/, "").trim();
    }

    // Detect markdown images: ![alt](url)
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      assets.push({
        kind: "image",
        raw: line.trim(),
        context: lastHeading,
      });
      continue;
    }

    // Detect markdown tables: lines starting with |
    if (line.trim().startsWith("|") && lines[i + 1]?.includes("|-")) {
      // Collect entire table
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      if (tableLines.length >= 2) {
        assets.push({
          kind: "table",
          raw: tableLines.join("\n"),
          context: lastHeading,
        });
        i = j - 1; // skip past table
      }
    }
  }

  return assets;
}

// ─── Stage B: Asset Captioning ────────────────────────────────────────────────

/**
 * For each detected image or table, ask Gemini Flash to generate
 * a descriptive educational caption. This caption is stored in
 * module_sources.asset_descriptions and prepended into the
 * relevant text chunk so the LLM can reason about visuals.
 */
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
          ? `You are an educational AI assistant. A student's study material contains the following image reference from the section "${asset.context}":\n\n${asset.raw}\n\nDescribe what this image likely contains and its educational significance in 2–3 sentences. Focus on key concepts, labels, or data it might illustrate.`
          : `You are an educational AI assistant. A student's study material contains the following table from the section "${asset.context}":\n\n${asset.raw}\n\nSummarize what this table shows in 2–3 sentences, highlighting the key data, categories, or relationships it illustrates.`;

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
        const caption: string =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        descriptions.push({ kind: asset.kind, context: asset.context, caption });
      }
    } catch (err) {
      // Non-fatal: skip captioning for this asset
      console.warn(`[ingestion] Asset captioning failed:`, err);
    }
  }

  return descriptions;
}

/**
 * Inject asset captions back into the text as blockquotes, so the
 * semantic chunker includes them in the right context.
 */
function injectCaptions(text: string, assets: ExtractedAsset[], descriptions: AssetDescription[]): string {
  if (descriptions.length === 0) return text;

  let result = text;
  assets.forEach((asset, idx) => {
    const desc = descriptions[idx];
    if (!desc?.caption) return;

    const captionBlock =
      asset.kind === "image"
        ? `\n> **📷 Image Description**: ${desc.caption}\n`
        : `\n> **📊 Table Summary**: ${desc.caption}\n`;

    // Insert caption right after the asset in the text
    result = result.replace(asset.raw, `${asset.raw}${captionBlock}`);
  });

  return result;
}

// ─── Stage C: Chunking ────────────────────────────────────────────────────────

/**
 * Recursive text splitter.
 * Splits on double-newlines first, then single newlines, then spaces.
 * Targets CHUNK_SIZE_CHARS with OVERLAP_CHARS overlap.
 */
function chunkText(
  text: string,
  metadata: Record<string, unknown>
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const cleanText = text.trim();

  if (!cleanText) return chunks;

  // Primary split: paragraph breaks
  const paragraphs = cleanText.split(/\n\n+/);
  let current = "";
  let chunkIndex = 0;

  const flushChunk = (buf: string) => {
    const trimmed = buf.trim();
    if (!trimmed) return;
    const tokenCount = Math.ceil(trimmed.length / CHARS_PER_TOKEN);
    chunks.push({
      text: trimmed,
      tokenCount,
      chunkIndex: chunkIndex++,
      metadata: { ...metadata, chunkIndex },
    });
  };

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= CHUNK_SIZE_CHARS) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      // Current chunk is full — flush and start new with overlap
      if (current) {
        flushChunk(current);
        // Overlap: keep last OVERLAP_CHARS of the flushed chunk
        const overlap = current.slice(-OVERLAP_CHARS);
        current = overlap ? `${overlap}\n\n${para}` : para;
      } else {
        // Single paragraph exceeds chunk size — split on newlines
        const lines = para.split("\n");
        let lineBuf = "";
        for (const line of lines) {
          if (lineBuf.length + line.length + 1 <= CHUNK_SIZE_CHARS) {
            lineBuf = lineBuf ? `${lineBuf}\n${line}` : line;
          } else {
            if (lineBuf) flushChunk(lineBuf);
            lineBuf = line;
          }
        }
        current = lineBuf;
      }
    }
  }
  if (current) flushChunk(current);

  return chunks;
}

// ─── Stage D: Embedding ───────────────────────────────────────────────────────

/**
 * Embed a single text chunk using Gemini text-embedding-004.
 * Returns a 768-dimensional float vector.
 */
async function embedText(
  text: string,
  geminiApiKey: string
): Promise<number[]> {
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embed failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const values: number[] = data?.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini embed returned empty vector");
  }
  return values;
}

/**
 * Embed all chunks sequentially with a small delay to avoid rate-limiting.
 * Falls back to zero-vector on per-chunk failures (non-fatal).
 */
async function embedChunks(
  chunks: TextChunk[],
  geminiApiKey: string
): Promise<EmbeddedChunk[]> {
  const embedded: EmbeddedChunk[] = [];
  const EMBED_DIMS = 768;

  for (const chunk of chunks) {
    try {
      const embedding = await embedText(chunk.text, geminiApiKey);
      embedded.push({ ...chunk, embedding });
    } catch (err) {
      console.warn(`[ingestion] Embedding failed for chunk ${chunk.chunkIndex}:`, err);
      // Push zero-vector fallback so partial ingestion still works
      embedded.push({ ...chunk, embedding: new Array(EMBED_DIMS).fill(0) });
    }

    // ~50ms pacing to stay under Gemini free-tier rate limits
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
    // Nothing to embed — mark as done with no chunks
    await supabase
      .from("module_sources")
      .update({
        processed: true,
        ingestion_status: "done",
        raw_content: rawText,
        asset_descriptions: assetDescriptions,
      })
      .eq("id", source.id);
    return;
  }

  // Batch insert chunks (Supabase REST supports up to 500 rows per request)
  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const rows = batch.map((c) => ({
      module_id: source.moduleId,
      source_id: source.id,
      content: c.text,
      token_count: c.tokenCount,
      metadata: {
        ...c.metadata,
        source_name: source.name,
        source_type: source.type,
      },
      // pgvector expects a string like "[0.1, 0.2, ...]"
      embedding: `[${c.embedding.join(",")}]`,
    }));

    const { error } = await supabase.from("module_chunks").insert(rows);
    if (error) {
      throw new Error(`DB write failed for chunk batch ${i}: ${error.message}`);
    }
  }

  // Mark source as done
  await supabase
    .from("module_sources")
    .update({
      processed: true,
      ingestion_status: "done",
      raw_content: rawText,
      asset_descriptions: assetDescriptions,
    })
    .eq("id", source.id);

  // Update module status to active + update source/chapter counts
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

/**
 * Runs the full 5-stage ingestion pipeline for a single module source.
 *
 * Designed to be called **non-blocking** (fire-and-forget) immediately after
 * inserting the source record into module_sources. The source's
 * `ingestion_status` column is updated throughout to reflect progress.
 *
 * @param source  The source descriptor (from useAddModuleSource)
 * @param geminiApiKey  VITE_GEMINI_API_KEY for embeddings + captioning
 */
export async function ingestSource(
  source: IngestionSource,
  geminiApiKey: string,
  llamaCloudApiKey?: string
): Promise<void> {
  const supabase = getSupabase();

  if (!geminiApiKey) {
    console.warn(
      "[ingestion] VITE_GEMINI_API_KEY not set — skipping ingestion pipeline"
    );
    return;
  }

  try {
    // Mark as processing
    await supabase
      .from("module_sources")
      .update({ ingestion_status: "processing" })
      .eq("id", source.id);

    await supabase
      .from("modules")
      .update({ status: "processing", processing_pct: 10 })
      .eq("id", source.moduleId);

    // ── Stage A: Extract text ────────────────────────────────────────────────
    const { text: rawText, assets } = await extractText(source, llamaCloudApiKey);

    await supabase
      .from("modules")
      .update({ processing_pct: 30 })
      .eq("id", source.moduleId);

    // ── Stage B: Caption images + tables ────────────────────────────────────
    const assetDescriptions = await captionAssets(assets, geminiApiKey);
    const enrichedText = injectCaptions(rawText, assets, assetDescriptions);

    await supabase
      .from("modules")
      .update({ processing_pct: 50 })
      .eq("id", source.moduleId);

    // ── Stage C: Chunk text ──────────────────────────────────────────────────
    const chunks = chunkText(enrichedText, {
      source_id: source.id,
      module_id: source.moduleId,
      source_name: source.name,
    });

    await supabase
      .from("modules")
      .update({ processing_pct: 65 })
      .eq("id", source.moduleId);

    // ── Stage D: Embed chunks ────────────────────────────────────────────────
    const embeddedChunks = await embedChunks(chunks, geminiApiKey);

    await supabase
      .from("modules")
      .update({ processing_pct: 90 })
      .eq("id", source.moduleId);

    // ── Stage E: Write to DB ─────────────────────────────────────────────────
    await writeToDatabase(source, embeddedChunks, rawText, assetDescriptions);

    console.info(
      `[ingestion] ✅ Source "${source.name}" (id=${source.id}) ingested — ${embeddedChunks.length} chunks written`
    );
  } catch (err) {
    console.error(`[ingestion] ❌ Pipeline failed for source ${source.id}:`, err);

    // Mark as failed — do not throw (caller is fire-and-forget)
    await supabase
      .from("module_sources")
      .update({ ingestion_status: "failed", processed: false })
      .eq("id", source.id);

    await supabase
      .from("modules")
      .update({ status: "active", processing_pct: 100 })
      .eq("id", source.moduleId);
  }
}
