"""
VAR-Sec: OSINT Seed Script
Ingests sample social media posts into the OSINT pipeline for demo purposes.
Usage: python scripts/seed_osint.py
"""
import json
import httpx
import os
import asyncio

API_BASE = os.getenv("API_BASE", "http://127.0.0.1:8000/api/v1")
SEED_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "seed_osint_posts.json")

async def main():
    print(f"[VAR-Sec Seed] Loading posts from {SEED_FILE}")
    
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        posts = json.load(f)
    
    print(f"[VAR-Sec Seed] Found {len(posts)} posts to ingest")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Send in batches of 5
        for i in range(0, len(posts), 5):
            batch = posts[i:i+5]
            print(f"\n[VAR-Sec Seed] Ingesting batch {i//5 + 1} ({len(batch)} posts)...")
            
            try:
                response = await client.post(
                    f"{API_BASE}/osint/ingest",
                    json={"posts": batch}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✅ Ingested {data.get('ingested', 0)} posts")
                    for result in data.get("results", []):
                        scam_type = result.get("scam_type_classified", "UNKNOWN")
                        campaign = result.get("campaign_id", "N/A")
                        print(f"    → {scam_type} (Campaign #{campaign})")
                else:
                    print(f"  ❌ Error: HTTP {response.status_code}")
                    print(f"     {response.text[:200]}")
            except Exception as e:
                print(f"  ❌ Request failed: {e}")
    
    # Fetch campaigns to show summary
    print("\n" + "="*60)
    print("[VAR-Sec Seed] Campaign Summary:")
    print("="*60)
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{API_BASE}/campaigns")
            if res.status_code == 200:
                campaigns = res.json()
                for c in campaigns:
                    print(f"  📁 {c['name']} ({c['type']}) — {c['posts']} posts")
            else:
                print(f"  ❌ Could not fetch campaigns: HTTP {res.status_code}")
        except Exception as e:
            print(f"  ❌ Could not fetch campaigns: {e}")

    print("\n✅ Seeding complete! Visit /campaigns in the dashboard to see results.")

if __name__ == "__main__":
    asyncio.run(main())
