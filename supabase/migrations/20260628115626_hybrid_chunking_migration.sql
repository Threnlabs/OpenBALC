-- ============================================================================
-- OpenBALC — Hybrid Chunking Migration
-- ============================================================================

-- 1. Extend module_chunks with hybrid chunking metadata columns
ALTER TABLE module_chunks
  -- Chunk type: 'content' | 'table' | 'image_caption'
  ADD COLUMN IF NOT EXISTS chunk_type VARCHAR(20) NOT NULL DEFAULT 'content'
    CHECK (chunk_type IN ('content', 'table', 'image_caption')),
  -- Topic this chunk belongs to (for structured modules)
  ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  -- Chunk sequence number within the source document
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 0,
  -- For image_caption chunks: public URL to the actual image/artifact
  ADD COLUMN IF NOT EXISTS asset_url TEXT,
  -- Analytics: how many times this chunk was retrieved in a RAG call
  ADD COLUMN IF NOT EXISTS times_retrieved INTEGER NOT NULL DEFAULT 0,
  -- Timestamp for tracking recency and freshness
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- 2. Index for efficient filtering by chunk type
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_type ON module_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_chunks_topic_id ON module_chunks(topic_id);
CREATE INDEX IF NOT EXISTS idx_chunks_times_retrieved ON module_chunks(times_retrieved DESC);

-- 3. Create ingestion_config settings table
CREATE TABLE IF NOT EXISTS ingestion_config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed default values
INSERT INTO ingestion_config (key, value) VALUES
  ('chunk_target_tokens',  '500'),
  ('chunk_overlap_tokens', '100')
ON CONFLICT (key) DO UPDATE SET
  value      = EXCLUDED.value,
  updated_at = CURRENT_TIMESTAMP;

-- 4. Helper function: increment times_retrieved for a chunk
CREATE OR REPLACE FUNCTION increment_chunk_retrieved(chunk_ids INTEGER[])
RETURNS VOID AS $$
BEGIN
  UPDATE module_chunks
  SET times_retrieved = times_retrieved + 1
  WHERE id = ANY(chunk_ids);
END;
$$ LANGUAGE plpgsql;
