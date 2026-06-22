# OpenBALC — Retrieval-Augmented Generation (RAG) Architecture

Welcome! This document provides a comprehensive guide to the **RAG (Retrieval-Augmented Generation)**, ingestion, and search architecture in OpenBALC. It is designed for new contributors to quickly grasp how user uploaded documents turn into structured, context-aware AI answers.

---

## 1. High-Level Architecture

OpenBALC uses a **lean, zero-dependency hybrid search engine** built directly on **PostgreSQL** with the `pgvector` extension. 

```
                                [ Document Upload (PDF, URL, Text) ]
                                                 │
                                                 ▼
                                     [ Multimodal Extraction ]
                                  (Format text + extract figures)
                                                 │
                                                 ▼
                                    [ Ingestion & Structuring ]
                                 (Store in topics, upload assets)
                                                 │
                                                 ▼
                                      [ Semantic Chunking ]
                               (Generate 1536-dim embeddings)
                                                 │
                                                 ▼
  [ User Query ] ──► [ Access Scoping ] ──► [ Hybrid Retrieve ] ──► [ Context Assembly & LLM ]
```

---

## 2. Directory & Schema Structure

The RAG logic is divided cleanly to ensure the database can run with or without the vector extensions:

* **`superschema.sql`**: The unified combined database schema, containing all core, RAG, and ULF tables, constraints, and indices.
* **`schema.sql`**: Core relational tables (users, workspaces, billing, files, conversations).
* **`RAG.sql`**: The vector-specific extension, tables (`module_sources`, `topics`, `module_content`, `module_chunks`, `module_stars`), indices (HNSW, GIN FTS), and constraints.
* **`references/rag_design.md`**: Deep-dive technical specifications of the pipeline.
* **`references/retrieve.md`**: Step-by-step logic detailing search execution.

---

## 3. The 3 Ingestion Phases

When a user uploads a source file (like a textbook chapter or lecture notes) into a Module:

### Phase A · Multimodal Extraction
1. The uploaded file is passed to an extraction API (e.g., LlamaParse or Azure Document Intelligence).
2. It outputs structured Markdown for text and parses tables into clean Markdown tables.
3. Embedded images/figures are extracted as raw streams, uploaded to Supabase Storage, and their temporary IDs are replaced in the Markdown with public storage URLs:
   `![Figure 1](https://supabase.co/storage/v1/object/public/module-assets/...)`

### Phase B · Outline & Content Structuring
1. The normalized Markdown is analyzed by a structuring LLM to identify distinct chapters and topics.
2. The structured outline is saved in the `topics` table.
3. The content of each topic is saved in `module_content` to render the sidebar tree in the UI.

### Phase C · Chunking & Embedding
1. The text is split into segments of **512 tokens** with a **10% overlap (~50 tokens)** using a recursive text splitter.
2. Each segment is embedded using `text-embedding-3-small` (1536-dimensional space) and saved in the `module_chunks` table.

---

## 4. The 7-Step Retrieval Pipeline

When a user chats with the AI, the query is resolved in **7 sequential stages**:

```
                         [ User Message ]
                                │
                                ▼
                   [ 1. Access Scope Resolution ]
                                │
                                ▼
                    [ 2. Metadata Pre-Filtering ]
                                │
                   ┌────────────┴────────────┐
                   ▼                         ▼
         [ 3. Dense Vector Search ]  [ 4. Sparse FTS Boost ]
                   └────────────┬────────────┘
                                ▼
                       [ 5. RRF Score Merge ]
                                │
                                ▼
                     [ 6. Asset Image Hydration ]
                                │
                                ▼
                      [ 7. Context Assembly ]
                                │
                                ▼
                          [ LLM Prompt ]
```

### 1. Access Scope Resolution
Ensures tenant isolation. It checks where the user is chatting:
* **Module Chat:** Scope is locked to that single `module_id`.
* **Main Chat:** Scope is calculated dynamically to include:
  1. All **public** modules (`visibility = 'public'`).
  2. The user's **own** modules.
  3. Modules belonging to **workspaces** the user is a member of.
* **Mention Tags (`@Name`):** Intersects allowed scope with tagged module IDs.

### 2. Metadata Pre-Filtering
Filters out inactive/archived modules and uses matching tags/subjects as soft boosts to narrow vector index searches.

### 3. Dense Vector Search
Embeds the query text and runs a cosine similarity search using the HNSW index on the `module_chunks.embedding` column. Returns top 20 matches.

### 4. Sparse Keyword Search (FTS)
Runs a native Postgres Full-Text Search (using the GIN index) to match exact keywords, acronyms, or specific clause references. Returns top 20 matches.

### 5. Reciprocal Rank Fusion (RRF)
Merges the dense and sparse candidate lists based on rank position. RRF handles the incompatible scoring systems of cosine distance and FTS natively and robustly:
$$\text{RRF Score} = \frac{1}{60 + \text{Rank}_{\text{vector}}} + \frac{1}{60 + \text{Rank}_{\text{fts}}}$$
Returns the top 10 merged results.

### 6. Asset Image Hydration
For the top 10 chunks, joins the `files` table to fetch associated images/diagrams from the source. These are formatted as markdown images so the LLM can reference and show figures to the user.

### 7. Context Assembly
Fits instructions, rolling conversation summary, recent history, and retrieved chunks within a strict token budget.

---

## 5. How to Contribute & Extend

We welcome contributions to the RAG stack! Here are areas you can help improve:

* **Ingestion Parsers:** Add new extractors or clean-up filters for scraping specific formats (e.g. YouTube transcripts, spreadsheets).
* **Chunking Strategies:** Implement semantic chunkers that split on header boundaries instead of character counts.
* **Evaluation Framework:** Help write validation scripts that run synthetic test questions against search to measure retrieval recall (mAP, Hit Rate).
* **Local Embedding Alternatives:** Configure options to run local models (e.g. HuggingFace BGE embeddings) alongside the default OpenAI model.
