# PRD — FIFA Threat Intelligence Platform (Codename: TBD)
### Track 3: Cybersecurity | Problem Statement 7 — FIFA Scam, Fraud & Piracy Intelligence Platform

---

## 1. Problem Recap

The FIFA ecosystem (tournament ticketing, fan engagement, live broadcasts) is a high-value target for:
- Fake ticketing portals stealing money + credentials
- Scam campaigns spreading via social media & messaging apps
- Illegal live-stream sites offering unauthorized match broadcasts
- Malware drops + impersonation pages disguised as official FIFA services

**Deliverable required by the problem statement:** a unified platform that detects, scores, and visualizes these threats in near real-time, combining domain intelligence (WHOIS, registration patterns), SSL certificate validation, visual similarity analysis (cloned page detection), and OSINT collection from social/messaging channels.

---

## 2. Foundation: What We're Building On

We already have a production-grade phishing/social-engineering detection platform — **SecureSentinel** — built independently as a prior project. Rather than build a detection platform from zero, we are **forking and repurposing SecureSentinel's proven core**, then adding the FIFA-specific and problem-statement-specific modules that don't exist yet (WHOIS, SSL, visual similarity, OSINT, FIFA branding/heuristics, threat map).

This is disclosed openly in the pitch: *"Built on a security detection engine (SecureSentinel) I developed independently — 500K-sample trained model, 0.993 AUC-ROC — extended here with domain intelligence, SSL validation, visual cloned-page detection, and FIFA-specific threat modeling for this problem statement."* Hackathon allows prebuilt work, so this is a credibility point, not a liability, as long as the new modules are clearly delineated.

### What SecureSentinel already solves (reused, not rebuilt)

| Capability | Source Component | Reused For |
|---|---|---|
| URL risk scoring pipeline (localhost → blocklist → whitelist → Tranco → keyword match → heuristics → ML → LLM verify → blend → classify) | `backend/main.py`, `app/services/inference.py` | Core scoring engine for fake ticketing portals & scam links |
| LightGBM classifier, 30 URL features, AUC-ROC 0.993, trained on 500K samples | `models/phishing_lgbm.joblib`, `model_metadata.json` | Base ML signal, no retraining needed at hackathon time |
| Brand impersonation detection | `app/services/impersonation.py` | Detecting "fifa" typosquats, brand-in-subdomain patterns |
| Temporal / urgency-tactic detection ("2 tickets left!", "offer ends in 1hr") | `app/services/temporal.py` | Fake ticketing urgency scams |
| Heuristic overrides: suspicious TLDs, 200+ keyword blacklist, known piracy site patterns | Layer 5 "Quantum Defense" | Illegal live-stream / piracy site detection |
| SQLite + SQLAlchemy schema (`scan_results`, `blocked_domains`, `allowed_domains`) | `app/database.py`, `app/models.py` | Base persistence layer, extended with new tables |
| REST API (`/detect`, `/activity`, `/dashboard`, `/block`, `/unblock`, `/chat`, `/analyze`, `/stats/summary`) | `backend/main.py` | Base API surface, extended with new endpoints |
| Chrome Extension MV3: service worker, badge injection, block page, dialog interceptor, DOM popup scanner | `extension-clean/` | McAfee-style badge overlay + basis for FIFA adblocker |
| Next.js 16 dashboard: KPI cards, activity feed, trend charts, block/unblock UI, AI chat assistant | `my-app/` | Dashboard shell, extended with threat map + campaign views |
| Gemini LLM integration (ambiguous-score verification + chat assistant) | `app/services/llm.py` | Reused for ambiguous scoring AND repurposed for OSINT text classification |

### What is explicitly NOT carried over

- `ai-dlp.js` (AI chat PII protection) — irrelevant to this problem statement, removed to avoid diluting the pitch as "generic repurposed product"
- `ext_data/` training CSVs (~40MB+) — dead weight, no retraining planned during hackathon
- `.git` history, `sql_app.db`, `node_modules` — regenerated fresh in new repo

---

## 3. Novel / New Work (the actual hackathon build)

This is what judges should see as the differentiated contribution — everything above is infrastructure, this is the FIFA-specific intelligence layer.

### 3.1 Domain Intelligence Module (NEW)
- WHOIS lookup service: domain age, registrar, registrant country, registration/expiry dates
- Signal: domain age < 30 days + FIFA-related keywords in domain/path = high-risk multiplier
- Registration pattern clustering: multiple recently-registered domains sharing a registrar/nameserver = campaign indicator (feeds into OSINT campaign clustering, section 3.4)
- Library: `python-whois` or `whoisdomain`, with caching (WHOIS rate limits are real — cache 24h per domain)

### 3.2 SSL Certificate Validation Module (NEW)
- Certificate presence, issuer (Let's Encrypt free-cert-only sites skew slightly riskier when combined with other signals — not a standalone red flag), validity window, and Subject Alternative Names
- Detects mismatched CN/SAN vs. displayed brand ("fifa" in page content but cert issued for unrelated domain)
- Library: Python `ssl` + `cryptography`, direct socket handshake against target host:443

### 3.3 Visual Similarity / Cloned Page Detection (NEW — flagship differentiator)
This exact capability is listed as *unimplemented* in SecureSentinel's own roadmap ("Screenshot-based visual similarity detection") — closing this gap here is the standout technical story for judges.
- Reference set: screenshots of official FIFA pages (ticketing portal, login page, checkout flow) captured once and stored as baseline
- Pipeline: headless browser screenshot of candidate URL (Playwright) → perceptual hashing (pHash) for fast pre-filter → CNN-based visual embedding similarity (e.g., a small pretrained model or CLIP-style embedding via cosine similarity) for high-confidence match
- Output: similarity score against each reference template + which template it most resembles ("87% visual match to FIFA ticketing checkout page, hosted on unrelated domain → cloned page")
- This directly satisfies "impersonation pages disguised as official FIFA services"

### 3.4 OSINT Campaign Collection (NEW — scoped realistically for hackathon timeframe)
Full real-time social/messaging monitoring is unrealistic to build and demo credibly in a hackathon window. Scope this down honestly:
- Ingest a curated seed set of public sources (Twitter/X public search API or snscrape, public Telegram channel exports, or a static sample dataset of known scam post text/screenshots for demo purposes)
- Run existing Gemini LLM classifier (repurposed from SecureSentinel's chat/verification service) over ingested text to classify: scam type (ticketing/streaming/malware/impersonation), urgency tactics present, entities mentioned
- Cluster similar campaign text (simple embedding + cosine similarity or keyword clustering) to group "same scam wave, different posts" — this is what produces "campaign" as a first-class object in the dashboard, not just individual URLs
- Be upfront in the pitch that this is a scoped proof-of-concept of the ingestion pipeline, architected to plug into real-time APIs post-hackathon

### 3.5 Unified FIFA Threat Score (NEW — fusion layer)
Combine all signals into one score feeding the existing risk-badge system:
```
final_risk_score = weighted_blend(
    ml_url_score,          # existing LightGBM
    heuristic_score,       # existing keyword/TLD engine
    domain_intel_score,    # NEW: WHOIS age/pattern
    ssl_score,             # NEW: cert validity/mismatch
    visual_similarity_score, # NEW: cloned page match
    fifa_keyword_boost     # NEW: FIFA-specific term presence
)
```
Same green/yellow/red badge convention is preserved for UI consistency, but the "explanation" field now surfaces which of the 6 signals triggered (important for analyst trust and demo clarity).

### 3.6 Threat Map & Campaign Dashboard (extended, not new-from-scratch)
- Geo-plot flagged domains/campaigns by registrant country / hosting IP geolocation (GeoIP lookup)
- Campaign view: cluster of related scam domains/posts grouped as one "campaign card" with spread timeline
- This satisfies "visualize threats on a dashboard/map for analysts + FIFA security teams"

### 3.7 Browser Extension Extensions (extended)
- Reuse badge injection + service worker as-is
- **NEW:** `declarativeNetRequest`-based active blocking (SecureSentinel currently badges/warns; it doesn't do network-level blocking) — this is the "adblocker-style" behavior requested, blocking known-bad FIFA-scam domains at the request level, not just badging them
- **NEW:** FIFA-official allowlist baked in (fifa.com, tickets.fifa.com, fifaplus.com, etc.) to avoid false-positive blocking during demo
- **NEW:** Interstitial warning page for full navigation blocks (not silent blocking)

---

## 4. Tech Stack

| Layer | Technology | Status |
|---|---|---|
| ML Engine | LightGBM (existing model) | Reused |
| Backend | FastAPI + SQLAlchemy + SQLite | Reused, extended |
| LLM | Google Gemini | Reused, repurposed for OSINT classification |
| Domain Intel | `python-whois` / `whoisdomain` | New |
| SSL Check | Python `ssl` + `cryptography` | New |
| Visual Similarity | Playwright (screenshots) + pHash + embedding similarity | New |
| OSINT Ingestion | snscrape / curated dataset + Gemini classification | New |
| GeoIP | `geoip2` / MaxMind lite DB | New |
| Frontend | Next.js 16 + React 19 + TailwindCSS + Radix UI | Reused, extended |
| Maps | Leaflet or Mapbox GL (for threat map) | New integration |
| Extension | Chrome Manifest V3 | Reused, extended with `declarativeNetRequest` |

---

## 5. Database Schema (extended)

Existing tables kept as-is: `scan_results`, `blocked_domains`, `allowed_domains`.

New tables:

```
whois_data
  id PK, domain UK, registrar, created_date, expiry_date,
  registrant_country, age_days, last_checked

ssl_checks
  id PK, domain UK, issuer, valid_from, valid_to,
  cn_mismatch BOOLEAN, last_checked

visual_matches
  id PK, url, matched_template, similarity_score,
  screenshot_path, timestamp

campaigns
  id PK, campaign_name, scam_type, first_seen, last_seen,
  post_count, cluster_summary

campaign_domains (junction)
  campaign_id FK, domain, added_at

osint_posts
  id PK, source_platform, raw_text, scam_type_classified,
  campaign_id FK, timestamp
```

---

## 6. API Reference (extended)

Existing endpoints kept: `/detect`, `/activity`, `/dashboard`, `/block`, `/unblock`, `/blocklist`, `/chat`, `/analyze`, `/stats/summary`, `/health`.

New endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/whois` | Domain age/registration lookup |
| `POST` | `/api/v1/ssl-check` | Certificate validation |
| `POST` | `/api/v1/visual-similarity` | Screenshot + similarity scoring against FIFA templates |
| `GET` | `/api/v1/campaigns` | List clustered scam campaigns |
| `GET` | `/api/v1/campaigns/{id}` | Campaign detail (domains, posts, timeline) |
| `POST` | `/api/v1/osint/ingest` | Ingest a batch of scraped/sample posts for classification |
| `GET` | `/api/v1/threat-map` | Geo-plotted threat data for map view |
| `POST` | `/api/v1/detect-fifa` | Wraps `/detect` + fuses all new signals into unified FIFA risk score |

---

## 7. Phased Build Plan

### Phase 0 — Replication & Scaffolding (Day 0, low-risk, mechanical)
- Fork SecureSentinel into new repo/folder
- Strip excluded modules (`ai-dlp.js`, training CSVs, git history, db file)
- Rebrand: project name, manifest.json, UI copy, landing page across `my-app/`
- Create stub files for new services: `whois_service.py`, `ssl_check.py`, `visual_similarity.py`, `osint_service.py`, `campaign_clustering.py`
- Extend DB schema (new tables above), run migration
- Verify existing pipeline still runs end-to-end (backend, dashboard, extension) after rebrand — this is the checkpoint before any new logic is written

### Phase 1 — Core New Detection Modules (parallel-safe, conflict-minimized)
Can be split across 2-3 people with minimal merge conflicts since each is a separate service file + endpoint:
- **Track A:** WHOIS + SSL modules → `/whois`, `/ssl-check` endpoints
- **Track B:** Visual similarity pipeline (Playwright screenshot capture + pHash + embedding comparison) → `/visual-similarity` endpoint + FIFA reference template capture
- **Track C:** FIFA-specific heuristics — brand keyword sets, ticketing urgency phrases, piracy/streaming keyword list extensions to existing `impersonation.py` / `temporal.py` / Layer 5 blacklist

### Phase 2 — Fusion & OSINT (depends on Phase 1 outputs existing)
- Build `/detect-fifa` fusion endpoint combining all signals into unified score
- OSINT ingestion pipeline (curated/sample data → Gemini classification → campaign clustering)
- Campaign data model population

### Phase 3 — Frontend & Extension Integration
- Dashboard: campaign cards, threat map (Leaflet/GeoIP), explanation surfacing per-signal breakdown
- Extension: `declarativeNetRequest` blocking rules, FIFA allowlist, interstitial block page, badge tooltip showing signal breakdown

### Phase 4 — Polish, Demo Prep, Judging Alignment
- Seed demo dataset: a handful of realistic fake FIFA ticketing/streaming/impersonation URLs + sample scam post text, run end-to-end through the full pipeline for a clean live demo
- Prepare the "what's reused vs. what's new" slide — transparency here builds credibility rather than costing points
- Rehearse: detect a fake ticketing site live → show WHOIS+SSL+visual+heuristic signals firing → show it appear on threat map → show campaign clustering → show extension badge/block in real time

---

## 8. Judging Criteria Alignment

| Problem Statement Requirement | Where It's Satisfied |
|---|---|
| Detect fraudulent FIFA ticketing portals | LightGBM + WHOIS + SSL + urgency heuristics fused in `/detect-fifa` |
| Monitor scam & malware campaigns | OSINT ingestion + Gemini classification + campaign clustering |
| Flag illegal streaming networks | Existing Quantum Defense heuristics + piracy keyword extensions |
| Domain Intelligence (WHOIS, registration, age) | Section 3.1 |
| SSL Certificate Checks | Section 3.2 |
| Visual Similarity Analysis | Section 3.3 |
| OSINT Collection | Section 3.4 (scoped, honestly framed) |
| Detect threats across tickets/scams/malware/piracy | Unified `/detect-fifa` + dashboard |
| Score risk level per domain/campaign | Fusion scoring, section 3.5 |
| Visualize on dashboard/map | Section 3.6 |

---

## 9. Risk & Scope-Cut Plan (if time runs short)

Priority order to cut if the clock runs out — cut from the bottom up, never the top:
1. Keep: core detect pipeline, badges, WHOIS, SSL, basic dashboard (non-negotiable, this is the MVP)
2. Keep if possible: visual similarity (flagship differentiator, fight to keep this)
3. Cut first if needed: full campaign clustering — fall back to a flat list of flagged OSINT posts instead of clustered campaigns
4. Cut second if needed: threat map geo-visualization — fall back to existing activity-feed/table view
5. Cut last resort: extension `declarativeNetRequest` active blocking — fall back to badge-only (still satisfies "detects and scores," just not "blocks")

---

## 10. Open Questions / Assumptions to Confirm

- Confirm hackathon rules explicitly permit prebuilt-code reuse with disclosure (stated as allowed per team, but re-verify submission guidelines for any specific disclosure format required)
- Confirm whether a live Gemini API key with sufficient quota is available for the full demo duration, or whether a local fallback classifier is needed for OSINT text classification
- Decide OSINT data source for demo: live scrape vs. static curated sample set (recommend static/curated for demo reliability — live scraping during a live demo is a failure risk)
