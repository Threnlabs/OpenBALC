-- ============================================================================
-- OpenBALC — Add source_id to topics and module_content for granular cleanup
-- ============================================================================

-- 1. Add source_id to topics table
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES module_sources(id) ON DELETE CASCADE;

-- 2. Add source_id to module_content table
ALTER TABLE module_content
  ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES module_sources(id) ON DELETE CASCADE;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_topics_source ON topics(source_id);
CREATE INDEX IF NOT EXISTS idx_module_content_source ON module_content(source_id);
