# Supabase Database & Integration Setup

This directory contains the database migration files and configurations for **OpenBALC**, optimized for seamless deployment and synchronization with Supabase.

---

## 📂 Directory Structure

```
supabase/
├── config.toml         # Main Supabase CLI project configuration
├── .gitignore          # Ignores local-only temporary files (e.g. .temp, local env keys)
├── README.md           # This setup and reference guide
└── migrations/         # Database migrations (applied sequentially by timestamp)
    └── 20260624080520_init.sql   # Base schema containing Core + RAG + ULF tables
```

---

## 🚀 How the Supabase Integration Works

OpenBALC is configured for **Continuous Deployment / Git Integration** with Supabase.

### 1. Native Git Integration (Recommended)
When your GitHub repository is connected directly to your Supabase project via the **Supabase Dashboard**:
* **Automatic Migrations**: Whenever a new migration file is committed to the `supabase/migrations` directory on your main branch (e.g., `main`), Supabase automatically runs the new migrations against your production database.
* **Preview Environments (Branching)**: If you enable Branching (on the Supabase Pro plan), opening a Pull Request automatically spins up a preview database branch, applies your migrations, and lets you test schema changes safely before merging.

### 2. Manual/CI Deployment (Alternative via GitHub Actions)
If you prefer deploying migrations using a custom pipeline (e.g., to run automated tests first), a workflow configuration is located in `.github/workflows/supabase-deploy.yml`.

---

## 💻 Local Development Workflow

To work on database schemas and test changes locally, follow these steps:

### 1. Start Local Supabase Environment
Supabase CLI runs a complete, containerized version of the Supabase stack on your machine using Docker.
```bash
# Start local containers (database, auth, storage, studio, etc.)
npx supabase start
```
* **Local Studio Dashboard**: Accessible at [http://localhost:54323](http://localhost:54323)
* **Local Database Connection**: Port `54322`

### 2. Create a New Migration File
Never modify existing migration files that have already been pushed or deployed. Instead, generate a new timestamped migration:
```bash
npx supabase migration new <describe_your_change>
# Example: npx supabase migration new add_feedback_table
```
This will create a new empty SQL file under `supabase/migrations/`. Open it and write your SQL queries (e.g., `CREATE TABLE`, `ALTER TABLE`, etc.).

### 3. Test and Reset Database
Apply all pending local migrations to your local container database:
```bash
# Reset database schema and reload all migrations
npx supabase db reset
```

### 4. Remote Deployment
Once you are confident with your schema changes:
1. Commit the new migration files to Git:
   ```bash
   git add supabase/migrations/
   git commit -m "db: add feedback table"
   git push origin main
   ```
2. If using the native Supabase Git integration, it will auto-apply the migration to production.
3. If deploying manually via CLI, run:
   ```bash
   npx supabase link --project-ref <your-project-id>
   npx supabase db push
   ```

---

## ⚙️ Configuration File (`config.toml`)
The `supabase/config.toml` file contains the declarative settings for:
* **API Settings**: Exposed schemas (like `public` and `graphql_public`), extra search paths (like `extensions` to support `vector` and `uuid-ossp`).
* **Authentication**: Token expiries, enabled redirect URLs, password strength requirements, and OAuth configuration templates.
* **Storage**: Default storage bucket limits and configurations.
* **Realtime**: Web socket and realtime notification parameters.
