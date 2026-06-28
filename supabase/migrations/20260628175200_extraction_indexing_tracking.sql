-- ============================================================================
-- OpenBALC — Extraction and Indexing Status Tracking Migration
-- ============================================================================

-- 1. Add extraction and indexing tracking columns to module_sources
ALTER TABLE module_sources
  ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS extraction_error TEXT,
  ADD COLUMN IF NOT EXISTS indexing_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (indexing_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS indexing_error TEXT;

-- 2. Add indexing tracking columns to module_content
ALTER TABLE module_content
  ADD COLUMN IF NOT EXISTS indexing_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (indexing_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS indexing_error TEXT;

-- 3. Set retroactively status for already processed rows
UPDATE module_sources
SET extraction_status = 'done', indexing_status = 'done'
WHERE processed = TRUE;

UPDATE module_sources
SET extraction_status = 'failed', indexing_status = 'failed'
WHERE ingestion_status = 'failed';

UPDATE module_content
SET indexing_status = 'done'
FROM modules
WHERE module_content.module_id = modules.id AND modules.status = 'active';
