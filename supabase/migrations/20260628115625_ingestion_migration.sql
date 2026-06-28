-- ============================================================================
-- OpenBALC — Ingestion Pipeline Migration
-- ============================================================================

-- 1. Add ingestion tracking columns to module_sources
ALTER TABLE module_sources
  ADD COLUMN IF NOT EXISTS ingestion_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (ingestion_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS raw_content TEXT,
  ADD COLUMN IF NOT EXISTS asset_descriptions JSONB NOT NULL DEFAULT '[]';

-- 2. Add index for efficient polling by status
CREATE INDEX IF NOT EXISTS idx_module_sources_status ON module_sources(ingestion_status);

-- 3. Mark all existing processed sources as 'done'
UPDATE module_sources SET ingestion_status = 'done' WHERE processed = TRUE;
UPDATE module_sources SET ingestion_status = 'pending' WHERE processed = FALSE;

-- 4. Migrate module_chunks embedding from vector(1536) to vector(768)
DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;
TRUNCATE TABLE module_chunks;

ALTER TABLE module_chunks
  ALTER COLUMN embedding TYPE vector(768)
  USING embedding::text::vector(768);

CREATE INDEX idx_chunks_embedding_hnsw
  ON module_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
