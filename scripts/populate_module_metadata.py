#!/usr/bin/env python3
import os
import sys
import argparse
import json
from supabase import create_client

PROJECT_ROOT = "/home/soham/Documents/threnlabs/OpenBALC"
CONTENT_DIR = os.path.join(PROJECT_ROOT, "scripts", "modules_content")

SUBJECT_MAP = {
    "Healthcare & Pharmaceuticals": {
        "fields": ["Medicine", "Healthcare Administration"],
        "domains": ["Clinical Research", "Healthcare Operations", "Regulatory Compliance"]
    },
    "Finance & Fintech": {
        "fields": ["Finance", "Financial Technology"],
        "domains": ["Corporate Finance", "Investment Banking", "Banking Operations"]
    },
    "Technology & Software": {
        "fields": ["Computer Science", "Software Engineering"],
        "domains": ["Cloud Computing", "Cybersecurity", "Software Development", "DevOps"]
    },
    "Manufacturing & Automotive": {
        "fields": ["Industrial Engineering", "Mechanical Engineering"],
        "domains": ["Automotive Engineering", "Manufacturing Processes", "Quality Control"]
    },
    "Retail & E-commerce": {
        "fields": ["Business Administration", "Marketing"],
        "domains": ["E-commerce", "Retail Management", "Supply Chain Management"]
    },
    "Energy & Sustainability": {
        "fields": ["Environmental Science", "Energy Engineering"],
        "domains": ["Renewable Energy", "Sustainability Compliance", "Energy Grid Operations"]
    },
    "Education & Learning": {
        "fields": ["Education", "Instructional Design"],
        "domains": ["E-learning", "Curriculum Development", "Academic Administration"]
    },
    "Legal & Compliance": {
        "fields": ["Law", "Regulatory Compliance"],
        "domains": ["Corporate Law", "Regulatory Auditing", "Risk Management"]
    },
    "Logistics & Supply Chain": {
        "fields": ["Operations Research", "Supply Chain Management"],
        "domains": ["Logistics Operations", "Warehouse Management", "Transportation Science"]
    },
    "Human Resources & Talent": {
        "fields": ["Human Resource Management", "Organizational Behavior"],
        "domains": ["Talent Acquisition", "Employee Onboarding", "Performance Management"]
    },
    "Artificial Intelligence": {
        "fields": ["Computer Science", "Artificial Intelligence"],
        "domains": ["Machine Learning", "Natural Language Processing", "Computer Vision", "MLOps"]
    },
    "Quantitative Finance": {
        "fields": ["Quantitative Finance", "Financial Mathematics"],
        "domains": ["Algorithmic Trading", "Risk Modeling", "Portfolio Optimization"]
    },
    "Professional Commerce": {
        "fields": ["Accounting", "Auditing"],
        "domains": ["Financial Accounting", "Corporate Taxation", "Internal Controls"]
    },
    "Language Studies": {
        "fields": ["Linguistics", "Philology"],
        "domains": ["Sanskrit Studies", "Computational Linguistics", "Language Pedagogy"]
    }
}

KEYWORD_RULES = [
    # Fields rules
    ("quantum", "fields", "Quantum Mechanics"),
    ("quantum", "fields", "Physics"),
    ("kubernetes", "fields", "Cloud Infrastructure"),
    ("llm", "fields", "Natural Language Processing"),
    ("sanskrit", "fields", "Sanskrit Studies"),
    ("sanskrit", "fields", "Indology"),
    ("blockchain", "fields", "Cryptography"),
    ("blockchain", "fields", "Distributed Systems"),
    
    # Domains rules
    ("compliance", "domains", "Compliance & Ethics"),
    ("audit", "domains", "Regulatory Auditing"),
    ("security", "domains", "Cybersecurity"),
    ("security", "domains", "Information Security"),
    ("risk", "domains", "Risk Management"),
    ("api", "domains", "API Management"),
    ("database", "domains", "Database Administration"),
    ("postgres", "domains", "Database Administration"),
    ("cloud", "domains", "Cloud Architecture"),
    ("latency", "domains", "High-Performance Computing"),
    ("trading", "domains", "Quantitative Trading"),
    ("tax", "domains", "Tax Compliance"),
    ("cfa", "domains", "Investment Management"),
    ("cpa", "domains", "Public Accounting")
]

def load_env():
    env_vars = {}
    for path in [os.path.join(PROJECT_ROOT, ".env.local"), os.path.join(PROJECT_ROOT, ".env")]:
        if os.path.exists(path):
            with open(path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        env_vars[key.strip()] = val.strip().strip("'\"")
            break
    return env_vars

def clean_tag(tag):
    tag = tag.lower().strip()
    if tag.endswith('.'):
        tag = tag[:-1]
    tag = tag.replace(' ', '-')
    tag = ''.join(c for c in tag if c.isalnum() or c == '-')
    return tag

def generate_metadata(title, subject, core_topics, background):
    subj_data = SUBJECT_MAP.get(subject, {
        "fields": ["General Science"],
        "domains": ["General Industry"]
    })
    
    fields = []
    domains = []
    
    text_corpus = (title + " " + background + " " + " ".join(core_topics)).lower()
    
    # Apply keyword rules
    for kw, target_list, val in KEYWORD_RULES:
        if kw in text_corpus:
            if target_list == "fields" and val not in fields:
                fields.append(val)
            elif target_list == "domains" and val not in domains:
                domains.append(val)
                
    # Add defaults
    for f in subj_data["fields"]:
        if f not in fields:
            fields.append(f)
    for d in subj_data["domains"]:
        if d not in domains:
            domains.append(d)
                
    # Tags
    tags = []
    tags.append(clean_tag(subject.replace('&', 'and')))
    stop_words = {'for', 'the', 'and', 'in', 'of', 'on', 'with', 'to', 'by', 'an', 'at', 'a', 'about'}
    title_words = [clean_tag(w) for w in title.split() if w.lower() not in stop_words]
    tags.extend([w for w in title_words if len(w) > 2])
    
    for topic in core_topics:
        topic_words = [clean_tag(w) for w in topic.split() if w.lower() not in stop_words]
        tags.extend([w for w in topic_words if len(w) > 2])
        
    final_tags = []
    for tag in tags:
        tag_cleaned = clean_tag(tag)
        if tag_cleaned and len(tag_cleaned) > 2 and tag_cleaned not in final_tags:
            final_tags.append(tag_cleaned)
            
    return final_tags[:10], fields[:4], domains[:4]

def normalize(t):
    return ''.join(c.lower() for c in t if c.isalnum())

def main():
    parser = argparse.ArgumentParser(description="Populate module tags, fields, and domains metadata.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--local", action="store_true", help="Populate the local Supabase database")
    group.add_argument("--remote", action="store_true", help="Populate the remote Supabase database")
    args = parser.parse_args()
    
    env = load_env()
    
    if args.local:
        url = "http://127.0.0.1:54321"
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not key:
            # Try to dynamically fetch from supabase status
            try:
                import subprocess
                res = subprocess.run(
                    ["npx", "supabase", "status", "-o", "json"],
                    capture_output=True,
                    text=True,
                    check=True
                )
                status_data = json.loads(res.stdout)
                key = status_data.get("SERVICE_ROLE_KEY")
            except Exception:
                pass
        
        if not key:
            print("Error: SUPABASE_SERVICE_ROLE_KEY not found in environment and could not retrieve from 'supabase status'.")
            sys.exit(1)
        print("🔧 Target: Local Database")
    else:
        url = env.get("VITE_SUPABASE_URL")
        key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local for remote execution.")
            sys.exit(1)
        print("🌐 Target: Remote Database")
        
    supabase = create_client(url, key)
    
    # 1. Fetch modules from database
    print("Fetching modules from database...")
    res = supabase.table("modules").select("id, title, subject, description").execute()
    db_modules = res.data or []
    print(f"Loaded {len(db_modules)} modules from database.")
    
    if not db_modules:
        print("No modules found in the database.")
        sys.exit(0)
        
    # 2. Load local metadata mappings
    local_meta = {}
    if os.path.exists(CONTENT_DIR):
        for folder in os.listdir(CONTENT_DIR):
            folder_path = os.path.join(CONTENT_DIR, folder)
            if os.path.isdir(folder_path):
                meta_path = os.path.join(folder_path, "metadata.json")
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                            local_meta[normalize(meta["title"])] = meta
                    except Exception as e:
                        print(f"Error reading {meta_path}: {e}")
                        
    # 3. Update Loop
    updated_count = 0
    for mod in db_modules:
        mod_id = mod["id"]
        title = mod["title"]
        subject = mod["subject"] or ""
        db_desc = mod.get("description") or ""
        
        # Match with local content metadata
        norm_title = normalize(title)
        matched_meta = local_meta.get(norm_title)
        
        core_topics = []
        background = db_desc
        
        if matched_meta:
            core_topics = matched_meta.get("core_topics", [])
            background = matched_meta.get("background", db_desc)
            
        # Generate tags, fields, domains
        tags, fields, domains = generate_metadata(title, subject, core_topics, background)
        
        # Update database record
        try:
            update_res = supabase.table("modules").update({
                "tags": tags,
                "fields": fields,
                "domains": domains
            }).eq("id", mod_id).execute()
            
            if update_res.data:
                updated_count += 1
                print(f"[{updated_count}/{len(db_modules)}] Updated: '{title}'")
                print(f"    Tags: {tags}")
                print(f"    Fields: {fields}")
                print(f"    Domains: {domains}")
            else:
                print(f"⚠️ Failed to update '{title}' (ID: {mod_id})")
        except Exception as e:
            print(f"❌ Error updating '{title}' (ID: {mod_id}): {e}")
            
    print(f"\nSuccessfully populated metadata for {updated_count} modules.")

if __name__ == "__main__":
    main()
