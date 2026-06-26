-- ============================================================================
-- OpenBALC — Ingestion Pipeline Migration
-- Run this against an existing Supabase instance to add the new columns
-- needed for the automatic ingestion trigger (without a full schema reset).
-- ============================================================================

-- 1. Add ingestion tracking columns to module_sources
-- ─────────────────────────────────────────────────────
ALTER TABLE module_sources
  ADD COLUMN IF NOT EXISTS ingestion_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (ingestion_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS raw_content TEXT,
  ADD COLUMN IF NOT EXISTS asset_descriptions JSONB NOT NULL DEFAULT '[]';

-- 2. Add index for efficient polling by status
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_module_sources_status ON module_sources(ingestion_status);

-- 3. Mark all existing processed sources as 'done'
-- (retroactively set status so old cards show correctly)
UPDATE module_sources SET ingestion_status = 'done' WHERE processed = TRUE;
UPDATE module_sources SET ingestion_status = 'pending' WHERE processed = FALSE;

-- 4. Migrate module_chunks embedding from vector(1536) to vector(768)
-- WARNING: This drops all existing chunk data and recreates the table.
-- Only run this if you had NOT already populated module_chunks with embeddings.
-- If you have real data, comment out sections 4-6 and re-embed separately.
-- ─────────────────────────────────────────────────────

-- 4a. Drop existing HNSW index (must be done before type change)
DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;

-- 4b. Delete existing chunk rows (they used 1536-dim vectors, incompatible)
TRUNCATE TABLE module_chunks;

-- 4c. Change the column type from vector(1536) to vector(768)
ALTER TABLE module_chunks
  ALTER COLUMN embedding TYPE vector(768)
  USING embedding::text::vector(768);

-- 4d. Recreate HNSW index for 768-dim Gemini embeddings
CREATE INDEX idx_chunks_embedding_hnsw
  ON module_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- End of ingestion pipeline migration
-- ============================================================================
