-- ============================================================================
-- OpenBALC Database Schema — RAG & AI Pipeline (PostgreSQL)
-- This file contains all RAG, Vector Search, and Ingestion schema elements.
-- Execute this AFTER running schema.sql.
-- ============================================================================

-- Enable PGVector extension for semantic vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. DROP RAG TABLES & ENUMS (Ordered by dependency)
-- ============================================================================

DROP TABLE IF EXISTS module_stars CASCADE;
DROP TABLE IF EXISTS module_chunks CASCADE;
DROP TABLE IF EXISTS module_content CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS module_sources CASCADE;

DROP TYPE IF EXISTS source_type CASCADE;

-- ============================================================================
-- 2. CREATE CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE source_type AS ENUM ('pdf', 'url', 'text');

-- ============================================================================
-- 3. RAG TABLE DEFINITIONS
-- ============================================================================

-- 3.1 MODULE SOURCES (INGESTED DOCUMENTS/URLS)
CREATE TABLE module_sources (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    type source_type NOT NULL, -- e.g. 'pdf', 'url', 'text'
    name VARCHAR(255) NOT NULL, -- source title/filename
    url TEXT,
    content TEXT, -- normalized parsed raw text content
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3.2 TOPICS (STRUCTURED OUTLINE FOR MODULES)
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Trigger to update timestamp on topics
CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.3 MODULE CONTENT (GENERATED DETAILED KNOWLEDGE CHAPTERS/SECTIONS)
CREATE TABLE module_content (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    chapter VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(50) NOT NULL DEFAULT 'markdown', -- 'markdown', 'html', 'json'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3.4 MODULE CHUNKS (SEMANTIC CHUNKS FOR RAG RETRIEVAL)
CREATE TABLE module_chunks (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES module_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding vector(1536) NOT NULL -- pgvector type for text-embedding-3-small (1536 dims)
);

-- 3.5 MODULE STARS (STARRED/FAVORITED MODULES BY USERS)
CREATE TABLE module_stars (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT unique_module_user_star UNIQUE (module_id, user_id)
);

-- ============================================================================
-- 4. RETROACTIVE CONSTRAINTS FOR MAIN SCHEMA
-- ============================================================================

-- Add constraint to files table referencing module_sources (resolved after module_sources exists)
ALTER TABLE files 
ADD CONSTRAINT fk_files_source_id 
FOREIGN KEY (source_id) REFERENCES module_sources(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. RAG PERFORMANCE & RETRIEVAL INDEXES
-- ============================================================================

-- Module source and content indexes
CREATE INDEX idx_module_sources_module ON module_sources(module_id);
CREATE INDEX idx_module_content_module ON module_content(module_id);

-- Topics index
CREATE INDEX idx_topics_module ON topics(module_id);

-- Module star indexes
CREATE INDEX idx_module_stars_module ON module_stars(module_id);
CREATE INDEX idx_module_stars_user ON module_stars(user_id);

-- pgvector Indexing (HNSW for Cosine Similarity search)
CREATE INDEX idx_chunks_module_id ON module_chunks(module_id);
CREATE INDEX idx_chunks_embedding_hnsw 
ON module_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-Text Search (FTS) Indexing (GIN for BM25 keyword matching)
-- Used for the FTS boost leg in OpenBALC's hybrid search pipeline
CREATE INDEX idx_chunks_fts
ON module_chunks
USING gin(to_tsvector('english', content));
