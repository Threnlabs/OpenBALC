-- ============================================================================
-- OpenBALC Database Schema (PostgreSQL)
-- Optimal, production-grade schema setup.
-- Includes tables, columns, constraints, indices, and update triggers.
-- ============================================================================

-- Enable UUID extension if UUIDs are needed in the future
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PGVector extension for semantic vector search in RAG pipeline
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. DROP TABLES & ENUMS (For clean setups, ordered by dependencies)
-- ============================================================================

DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS ad_businesses CASCADE;
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS test_questions CASCADE;
DROP TABLE IF EXISTS test_sets CASCADE;
DROP TABLE IF EXISTS expert_queue CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS artifacts CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS module_stars CASCADE;
DROP TABLE IF EXISTS module_chunks CASCADE;
DROP TABLE IF EXISTS module_content CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS module_sources CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS buffer_mode CASCADE;
DROP TYPE IF EXISTS workspace_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS module_visibility CASCADE;
DROP TYPE IF EXISTS module_status CASCADE;
DROP TYPE IF EXISTS source_type CASCADE;
DROP TYPE IF EXISTS org_plan CASCADE;
DROP TYPE IF EXISTS org_member_role CASCADE;
DROP TYPE IF EXISTS expert_status CASCADE;
DROP TYPE IF EXISTS priority CASCADE;
DROP TYPE IF EXISTS difficulty CASCADE;
DROP TYPE IF EXISTS question_type CASCADE;
DROP TYPE IF EXISTS ad_status CASCADE;

-- ============================================================================
-- 2. CREATE CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'expert');
CREATE TYPE buffer_mode AS ENUM ('quotes', 'ads', 'summary');
CREATE TYPE workspace_type AS ENUM ('personal', 'hosted', 'managed');
CREATE TYPE transaction_type AS ENUM ('earn', 'spend');
CREATE TYPE module_visibility AS ENUM ('private', 'public');
CREATE TYPE module_status AS ENUM ('active', 'processing', 'archived');
CREATE TYPE source_type AS ENUM ('pdf', 'url', 'text');
CREATE TYPE org_plan AS ENUM ('personal', 'hosted', 'managed');
CREATE TYPE org_member_role AS ENUM ('viewer', 'member', 'admin');
CREATE TYPE expert_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE priority AS ENUM ('normal', 'urgent');
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard', 'mixed');
CREATE TYPE question_type AS ENUM ('mcq', 'short');
CREATE TYPE ad_status AS ENUM ('pending', 'active', 'rejected', 'paused');

-- ============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS FOR TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. TABLE DEFINITIONS
-- ============================================================================

-- 4.1 USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    avatar_url TEXT,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'user',
    credits INTEGER NOT NULL DEFAULT 100 CHECK (credits >= 0),
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    buffer_mode buffer_mode NOT NULL DEFAULT 'quotes',
    courses TEXT[] NOT NULL DEFAULT '{}',
    micro_courses TEXT[] NOT NULL DEFAULT '{}',
    interests TEXT[] NOT NULL DEFAULT '{}',
    
    -- Authentication details (Supporting password-based + OAuth flows)
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50), -- 'google', 'github', etc.
    oauth_id VARCHAR(255),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 WORKSPACES
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type workspace_type NOT NULL DEFAULT 'personal',
    credits INTEGER NOT NULL DEFAULT 100 CHECK (credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.3 WORKSPACE MEMBERS
CREATE TABLE workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    credits_allocated INTEGER NOT NULL DEFAULT 0 CHECK (credits_allocated >= 0),
    credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id),
    CONSTRAINT chk_credits_used CHECK (credits_used <= credits_allocated)
);

-- 4.4 CONVERSATIONS (CHAT SESSIONS)
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    last_message TEXT,
    tagged_module_ids INTEGER[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.5 MESSAGES (CHAT HISTORY)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources TEXT[] NOT NULL DEFAULT '{}', -- Source documents referenced
    reasoning TEXT, -- Thought/reasoning steps of the model
    credits_used INTEGER DEFAULT 0 CHECK (credits_used >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.6 CREDIT TRANSACTIONS (ACCOUNTING)
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    reason VARCHAR(255) NOT NULL,
    ref_id VARCHAR(255), -- E.g., Payment ID, message_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.7 MODULES (KNOWLEDGE CORE)
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- creator of module
    title VARCHAR(255) NOT NULL, -- name of module
    description TEXT,
    subject VARCHAR(255), -- primary topic / subject category
    method VARCHAR(50) NOT NULL DEFAULT 'topic', -- module type/method e.g. 'topic', 'upload'
    visibility module_visibility NOT NULL DEFAULT 'private',
    status module_status NOT NULL DEFAULT 'active',
    credits_value INTEGER NOT NULL DEFAULT 0 CHECK (credits_value >= 0),
    processing_pct INTEGER CHECK (processing_pct >= 0 AND processing_pct <= 100),
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- Cached metric columns for fast UI loads and indexing
    chapter_count INTEGER NOT NULL DEFAULT 0 CHECK (chapter_count >= 0),
    topic_count INTEGER NOT NULL DEFAULT 0 CHECK (topic_count >= 0), -- total number of subtopics
    source_count INTEGER NOT NULL DEFAULT 0 CHECK (source_count >= 0), -- total number of upload sources
    star_count INTEGER NOT NULL DEFAULT 0 CHECK (star_count >= 0), -- number of user stars
    use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0), -- number of accesses/forks
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.8 MODULE SOURCES (INGESTED DOCUMENTS/URLS)
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

-- 4.9 TOPICS (STRUCTURED OUTLINE FOR MODULES)
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.10 MODULE CONTENT (GENERATED DETAILED KNOWLEDGE CHAPTERS/SECTIONS)
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

-- 4.11 MODULE CHUNKS (SEMANTIC CHUNKS FOR RAG RETRIEVAL)
CREATE TABLE module_chunks (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES module_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding vector(1536) NOT NULL -- pgvector type for text-embedding-3-small (1536 dims)
);

-- 4.12 MODULE STARS (STARRED/FAVORITED MODULES)
CREATE TABLE module_stars (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT unique_module_user_star UNIQUE (module_id, user_id)
);

-- 4.13 FILES (GENERAL DOCUMENT & ASSET MANAGEMENT)
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    url TEXT NOT NULL,
    storage_key VARCHAR(255), -- E.g. AWS S3 key, local path
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.14 ARTIFACTS (AI GENERATED WORKSPACES/CODEFILES/DOCS)
CREATE TABLE artifacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'code', 'markdown', 'diagram', 'document'
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_artifacts_updated_at
    BEFORE UPDATE ON artifacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.15 NOTES (PERSONAL MEMOS & CAPTURED INSIGHTS)
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT '#6366f1',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    starred BOOLEAN NOT NULL DEFAULT FALSE,
    source_title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.16 NOTIFICATIONS
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.17 ORGANIZATIONS (ENTERPRISE / TEAM ACCOUNTS)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    description TEXT,
    plan org_plan NOT NULL DEFAULT 'personal',
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.18 ORGANIZATION MEMBERS
CREATE TABLE org_members (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role org_member_role NOT NULL DEFAULT 'member',
    credit_cap INTEGER CHECK (credit_cap IS NULL OR credit_cap >= 0),
    credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT unique_org_user UNIQUE (org_id, user_id),
    CONSTRAINT chk_org_credits CHECK (credit_cap IS NULL OR credits_used <= credit_cap)
);

-- 4.19 EXPERT TICKETS QUEUE
CREATE TABLE expert_queue (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context TEXT NOT NULL DEFAULT '',
    status expert_status NOT NULL DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority priority NOT NULL DEFAULT 'normal',
    reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_expert_queue_updated_at
    BEFORE UPDATE ON expert_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.20 TEST SETS (AI GENERATED QUIZZES)
CREATE TABLE test_sets (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    difficulty difficulty NOT NULL DEFAULT 'medium',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.21 TEST QUESTIONS
CREATE TABLE test_questions (
    id SERIAL PRIMARY KEY,
    test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
    type question_type NOT NULL,
    question TEXT NOT NULL,
    options JSONB, -- MCQ options as {"A": "Choice A", "B": "Choice B", ...}
    answer TEXT NOT NULL, -- Correct choice key or standard text answer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.22 TEST ATTEMPTS (SCORES LOG)
CREATE TABLE test_attempts (
    id SERIAL PRIMARY KEY,
    test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL, -- User selected answers as {"question_id": "user_choice"}
    score REAL NOT NULL CHECK (score >= 0.0 AND score <= 100.0),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4.23 ADVERTISERS (AD BUSINESSES)
CREATE TABLE ad_businesses (
    id SERIAL PRIMARY KEY,
    auth_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Business rep user account
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    website TEXT,
    logo_url TEXT,
    description TEXT,
    industry VARCHAR(255),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_ad_businesses_updated_at
    BEFORE UPDATE ON ad_businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.24 AD CAMPAIGNS (MONETIZATION SYSTEM)
CREATE TABLE ad_campaigns (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES ad_businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    card_design JSONB, -- Styling info e.g. {"color": "bg-gradient-to-br from-indigo-600..."}
    frequency_config JSONB, -- Ad presentation settings
    target_audience TEXT[] NOT NULL DEFAULT '{}', -- Target tags/interests
    status ad_status NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    credits_distributed INTEGER NOT NULL DEFAULT 0 CHECK (credits_distributed >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_ad_campaigns_updated_at
    BEFORE UPDATE ON ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. PERFORMANCE AND QUERY OPTIMIZATION INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Workspace indexes
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Conversation and Message indexes
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Credit transactions index
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);

-- Module indexes
CREATE INDEX idx_modules_workspace ON modules(workspace_id);
CREATE INDEX idx_modules_user ON modules(user_id);
CREATE INDEX idx_modules_visibility ON modules(visibility);
CREATE INDEX idx_module_sources_module ON module_sources(module_id);
CREATE INDEX idx_module_content_module ON module_content(module_id);
CREATE INDEX idx_module_stars_module ON module_stars(module_id);
CREATE INDEX idx_module_stars_user ON module_stars(user_id);

-- Topics index
CREATE INDEX idx_topics_module ON topics(module_id);

-- RAG Vector similarity index (HNSW for Cosine Similarity search)
CREATE INDEX idx_chunks_module_id ON module_chunks(module_id);
CREATE INDEX idx_chunks_embedding_hnsw 
ON module_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Notes indexes
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_conversation ON notes(conversation_id);

-- Files indexes
CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_files_module ON files(module_id);

-- Artifacts indexes
CREATE INDEX idx_artifacts_user ON artifacts(user_id);
CREATE INDEX idx_artifacts_workspace ON artifacts(workspace_id);
CREATE INDEX idx_artifacts_conversation ON artifacts(conversation_id);

-- Notifications index
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Organization indexes
CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_expert_queue_org ON expert_queue(org_id);
CREATE INDEX idx_expert_queue_status ON expert_queue(status);

-- Test indexes
CREATE INDEX idx_test_sets_module ON test_sets(module_id);
CREATE INDEX idx_test_sets_workspace ON test_sets(workspace_id);
CREATE INDEX idx_test_sets_creator ON test_sets(created_by);
CREATE INDEX idx_test_questions_set ON test_questions(test_set_id);
CREATE INDEX idx_test_attempts_set ON test_attempts(test_set_id);
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id);

-- Ad indexes
CREATE INDEX idx_ad_businesses_auth ON ad_businesses(auth_id);
CREATE INDEX idx_ad_campaigns_business ON ad_campaigns(business_id);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);

-- ============================================================================
-- End of schema.sql
-- ============================================================================
