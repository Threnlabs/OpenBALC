-- PostgreSQL Schema for OpenBALC User Learning Framework (ULF)
-- This schema handles passive telemetry logging, multi-dimensional profile tracking, 
-- and spaced repetition state machine states.

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. USER LEARNING PROFILES (Core Storage)
-- =========================================================================
-- Stores the computed cognitive state, mastery rates, domain preferences, 
-- and learning patterns per user.
CREATE TABLE IF NOT EXISTS user_learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Topic-level mastery map.
    -- Schema: { "module_[id]:[topic_slug]": { "topic_id": int, "score": float, "confidence": float, "last_updated": timestamptz } }
    topic_mastery JSONB NOT NULL DEFAULT '{}',
    
    -- Inferred user interests per domain.
    -- Schema: { "[domain_slug]": weight_score_float }
    interest_map JSONB NOT NULL DEFAULT '{}',
    
    -- Quick-lookup arrays for RAG prompt injection (updated via triggers/workers)
    weak_topics TEXT[] NOT NULL DEFAULT '{}',
    strong_topics TEXT[] NOT NULL DEFAULT '{}',
    
    -- Inferred domain mastery level: "beginner" | "intermediate" | "advanced"
    -- Schema: { "[domain_slug]": "level_string" }
    domain_levels JSONB NOT NULL DEFAULT '{}',
    
    -- Learning preference heuristics.
    -- Schema: { "prefers_examples": bool, "prefers_visuals": bool, "depth_preference": "concise"|"detailed" }
    learning_style JSONB NOT NULL DEFAULT '{}',
    
    -- Spaced Repetition Review Queue (based on SuperMemo-2 scheduler)
    -- Schema: [ { "topic_key": "module_x:topic_y", "due_date": timestamptz, "interval": int, "repetition": int, "ef": float } ]
    revisit_queue JSONB NOT NULL DEFAULT '[]',
    
    -- Aggregated metrics for profiling velocity
    total_questions_attempted INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,
    avg_session_length_minutes DOUBLE PRECISION DEFAULT 0.0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ulp_user_id ON user_learning_profiles(user_id);
-- GIN index to speed up lookups inside JSONB blobs (e.g., searching for specific weak domains)
CREATE INDEX IF NOT EXISTS idx_ulp_topic_mastery ON user_learning_profiles USING gin (topic_mastery);
CREATE INDEX IF NOT EXISTS idx_ulp_interest_map ON user_learning_profiles USING gin (interest_map);

-- =========================================================================
-- 2. TELEMETRY EVENT QUEUE (Signal Staging)
-- =========================================================================
-- Stage table for passive signals. Telemetry events are dumped here instantly 
-- by APIs and parsed out-of-band by background workers.
CREATE TABLE IF NOT EXISTS learning_signals_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    signal_type VARCHAR(50) NOT NULL, -- 'chat_question', 'test_answer', 'module_view', 'nlp_confusion'
    module_id INTEGER,
    topic_slug VARCHAR(100),
    domain VARCHAR(100),
    
    -- Dynamic data depending on type:
    -- Quiz: { "correct": bool, "time_taken_ms": int, "question_id": int }
    -- Chat: { "complexity": "basic"|"advanced", "text_length": int }
    payload JSONB NOT NULL DEFAULT '{}',
    
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lsq_unprocessed ON learning_signals_queue(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_lsq_user_id ON learning_signals_queue(user_id);

-- =========================================================================
-- 3. HISTORICAL SIGNAL LOG (Long-term Cold Storage)
-- =========================================================================
-- Once background workers finish calculating a signal, it moves here for 
-- analytical auditing, model retraining, and progress visualization.
CREATE TABLE IF NOT EXISTS learning_signals_history (
    id BIGINT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    module_id INTEGER,
    topic_slug VARCHAR(100),
    domain VARCHAR(100),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lsh_analytics ON learning_signals_history(user_id, created_at DESC);

-- =========================================================================
-- 4. UTILITIES & TRIGGERS
-- =========================================================================

-- Trigger to automatically maintain the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_ulp_timestamp
    BEFORE UPDATE ON user_learning_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
