#!/usr/bin/env python3
import os, json, urllib.request

SUPABASE_URL = "https://eprzkncgovrsgfhwvxka.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcnprbmNnb3Zyc2dmaHd2eGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcwMDQ4NCwiZXhwIjoyMDk3Mjc2NDg0fQ.MszkSg8l5K9yUPGDY5uuDpXnLWu-uvOnbzNHSshhxtc"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}"
}

# Fetch one record from conversations and one from artifacts to see the keys/columns
def check_schema():
    for table in ["conversations", "artifacts"]:
        url = f"{SUPABASE_URL}/rest/v1/{table}?limit=1"
        req = urllib.request.Request(url, headers=HEADERS, method="GET")
        try:
            with urllib.request.urlopen(req) as r:
                data = json.loads(r.read())
                print(f"--- Table: {table} ---")
                if data:
                    print(json.dumps(data[0], indent=2))
                else:
                    print("Empty table")
        except Exception as e:
            print(f"Error on {table}: {e}")

check_schema()
