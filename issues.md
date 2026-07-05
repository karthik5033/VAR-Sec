# VAR-Sec — Issues, Fixes & Build Checklist

> **Last Updated**: 2026-07-05  
> **Status Legend**: ✅ Done | 🔴 Critical | 🟡 Needed | 🟢 Nice-to-have

---

## 1. ERRORS & BUGS

| # | Issue | Severity | File(s) | Status |
|---|---|---|---|---|
| E1 | Port mismatch — frontend was on 8002, backend on 8000 | Critical | `constants.ts`, `api.ts`, `manifest.json` | ✅ Fixed |
| E2 | `ai-dlp.js` referenced in manifest but file doesn't exist — extension won't load | Critical | `extension-clean/manifest.json` | ✅ Fixed |
| E3 | Duplicate `"use client"` directive on lines 1-2 | Minor | `hero-section.tsx` | ✅ Fixed |
| E4 | Campaigns page uses hardcoded `localhost:8000` instead of `API_BASE_URL` | Medium | `campaigns/page.tsx` | ✅ Fixed |
| E5 | Duplicate `POST /api/v1/privacy/settings` route — dead code on L755 | Low | `backend/main.py` L755-784 | 🟡 TODO |
| E6 | Missing `ext_data/tranco_10k.csv` — Tranco top 10K whitelist not loaded | Medium | `backend/main.py` L126 | 🟡 TODO |
| E7 | `backend/sql_app.db` and `backend/data/sentinel.db` were tracked in git | Medium | `.gitignore` | ✅ Fixed |
| E8 | No `.env.example` — teammates don't know what keys are needed | Medium | Root | ✅ Fixed |
| E9 | Extension service-worker syncs blocklist every **4 seconds** — too aggressive, may cause performance issues | Low | `service-worker.js` L130 | 🟡 TODO — change to 30-60s |
| E10 | `backend/app/services/inference.py` still has `[SecureSentinel]` log prefix | Low | `inference.py` L78 | 🟡 TODO |

---

## 2. REBRANDING (SecureSentinel → VAR-Sec)

### ✅ Already Rebranded
- `backend/main.py` — FastAPI title & description
- `backend/app/main.py` — FastAPI title & description
- `backend/app/services/llm.py` — AI chat persona
- `extension-clean/manifest.json` — name, description, title
- `extension-clean/src/background/service-worker.js` — all log prefixes
- `my-app/app/layout.tsx` — metadata title & description
- `my-app/components/landing/logo.tsx` — logo text
- `my-app/components/landing/hero-section.tsx` — badge, title, subtitle
- `my-app/components/ai/AiChatWidget.tsx` — greeting & suggestions
- `my-app/components/landing/threat-map.tsx` — section description

### 🟡 Still Needs Rebranding
| File | What to Change |
|---|---|
| `my-app/app/login/page.tsx` | "Sentinel" appears 3 times — title, signup link, footer |
| `my-app/app/install/page.tsx` | "Deploy Sentinel", "Download Sentinel Core", file path references (5 occurrences) |
| `my-app/app/get-started/page.tsx` | "Sentinel" brand name |
| `my-app/app/how-it-works/page.tsx` | "Sentinel" in 3 description texts |
| `my-app/app/docs/page.tsx` | "Sentinel Documentation", "Sentinel" in 4+ paragraphs |
| `my-app/app/architecture/page.tsx` | "Sentinel Mesh v2.4.0", "Sentinel's three-tier defense" (3 occurrences) |
| `my-app/app/dashboard/privacy/page.tsx` | "Configure how Sentinel handles..." |
| `my-app/app/dashboard/controls/page.tsx` | "Sentinel Cloud Cluster", "Sentinel notify" |
| `my-app/app/features/quantum-defense/page.tsx` | "Sentinel Core" |
| `my-app/app/features/sentinel-mesh/` | Entire directory name + component name `SentinelMeshPage` |
| `my-app/components/landing/features-4.tsx` | "Sentinel Mesh" feature title |
| `backend/app/services/inference.py` | `[SecureSentinel]` log prefix |
| `backend/README.md` | "The SecureSentinel backend..." |
| `extension-clean/blocked.html` | Check for any old branding in block page |
| `extension-clean/popup.html` | Check header branding text |
| `my-app/public/sentinel.zip` | Rename file to `varsec_extension.zip` |
| `my-app/public/sentinel_v2.zip` | Rename file to `varsec_extension_v2.zip` |

---

## 3. DATASETS

| # | Dataset | Purpose | Location | Status |
|---|---|---|---|---|
| D1 | Tranco Top 10K domains | Trusted domain whitelist for ML scoring | `backend/ext_data/tranco_10k.csv` | 🟡 Download from [tranco-list.eu](https://tranco-list.eu/) |
| D2 | FIFA reference screenshots | Visual similarity template matching | `backend/app/assets/templates/` | 🔴 **EMPTY** — must capture screenshots of `fifa.com`, `tickets.fifa.com`, `fifaplus.com` checkout, login pages |
| D3 | OSINT seed posts | Demo data for campaigns pipeline | `backend/data/seed_osint_posts.json` | ✅ Created (20 posts) |
| D4 | Demo scam URLs | End-to-end testing dataset | `backend/data/demo_urls.json` | ✅ Created (12 URLs) |
| D5 | MaxMind GeoLite2-City | GeoIP for real threat map | `backend/data/GeoLite2-City.mmdb` | 🟡 Download from [MaxMind](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data) (free, requires signup) |

---

## 4. ML / TRAINING

| # | Item | Status | Notes |
|---|---|---|---|
| T1 | LightGBM phishing model (300K samples, 0.993 AUC-ROC) | ✅ Reused as-is | No retraining needed — `models/phishing_lgbm.joblib` |
| T2 | FIFA-specific brand keywords added to `known_brands` in feature extractor | 🟡 TODO | Add `"fifa"` to `known_brands` set in `extract_url_features()` so `brand_in_subdomain` feature catches FIFA typosquats |
| T3 | FIFA-specific keyword boost signal in fusion scoring | 🟡 TODO | PRD Section 3.5 mentions `fifa_keyword_boost` as a signal — not yet coded in `/detect-fifa` endpoint |
| T4 | Gemini model name in `osint_service.py` uses `gemini-2.5-flash` | 🟡 Check | LLM service uses `models/gemini-flash-latest` but OSINT service hardcodes `gemini-2.5-flash` — may have quota issues on free tier |

---

## 5. BACKEND — New Features to Build

| # | Feature | PRD Section | Status | Description |
|---|---|---|---|---|
| B1 | WHOIS caching to DB | 3.1 | 🟡 TODO | DB table `whois_data` exists in `models.py` but `whois_service.py` never writes to it. Should cache results for 24h. |
| B2 | SSL caching to DB | 3.2 | 🟡 TODO | DB table `ssl_checks` exists but `ssl_check.py` never writes to it. |
| B3 | Visual match caching to DB | 3.3 | 🟡 TODO | DB table `visual_matches` exists but `visual_similarity.py` never writes to it. |
| B4 | Registration pattern clustering | 3.1 | 🟡 TODO | Detect multiple domains sharing same registrar + recent registration → campaign indicator. |
| B5 | GeoIP endpoint `/api/v1/threat-map` | 3.6 | 🟡 TODO | Needs `geoip2` library + MaxMind DB. Return geo-plotted threat data for map. |
| B6 | `fifa_keyword_boost` in fusion scoring | 3.5 | 🟡 TODO | Add FIFA-term-presence as a weighted signal in `/detect-fifa` endpoint. |
| B7 | Temporal/OSINT service not integrated into `/detect-fifa` | — | 🟡 TODO | `impersonation.py` and `temporal.py` exist but aren't called in the `/detect-fifa` fusion pipeline. |
| B8 | Add `pandas` to `requirements.txt` | — | 🟡 TODO | `get_ml_score()` imports pandas but it's not in requirements.txt. |
| B9 | Add `httpx` to `requirements.txt` | — | 🟡 TODO | `seed_osint.py` uses httpx. |
| B10 | Playwright browser install step | — | 🟡 TODO | After `pip install playwright`, must run `playwright install chromium` — not automatic. |

---

## 6. FRONTEND — Pages to Fix/Build

### Existing Pages Needing Work
| Page | Route | Issue |
|---|---|---|
| Login | `/login` | Needs VAR-Sec rebranding (3 "Sentinel" refs) |
| Install | `/install` | Needs rebranding + fix download links (`sentinel.zip` → `varsec_extension.zip`) |
| Docs | `/docs` | Heavy rebranding needed (4+ Sentinel refs) + update content for FIFA context |
| How It Works | `/how-it-works` | Rebranding (3 Sentinel refs) + update architecture description |
| Architecture | `/architecture` | Rebranding (3 Sentinel refs) |
| Get Started | `/get-started` | Rebranding |
| Dashboard Privacy | `/dashboard/privacy` | Minor rebranding |
| Dashboard Controls | `/dashboard/controls` | Minor rebranding |
| Features (6 subpages) | `/features/*` | All 6 are generic SecureSentinel features — need repurposing or removal |

### New Pages/Components to Build
| Page | Route | PRD Section | Priority |
|---|---|---|---|
| Real Threat Map (Leaflet/Mapbox) | Landing section or `/threat-map` | 3.6 | 🟡 High |
| Campaign Detail Page | `/campaigns/[id]` | 3.4 | 🟡 Medium |
| Signal Breakdown in scan results | Dashboard enhancement | 3.5 | 🟡 Medium |
| "What's Reused vs New" transparency section | Landing page | Phase 4 | 🟢 Nice-to-have |

---

## 7. EXTENSION — Fixes & Features

| # | Item | Status | Description |
|---|---|---|---|
| X1 | `declarativeNetRequest` active blocking | 🟡 TODO | PRD 3.7 — Add `declarativeNetRequest` permission + dynamic rules for FIFA scam domains |
| X2 | FIFA official allowlist | 🟡 TODO | Bake in `fifa.com`, `tickets.fifa.com`, `fifaplus.com` as never-block rules |
| X3 | Interstitial warning page | 🟡 TODO | Softer warning for medium-risk sites (currently only full block or nothing) |
| X4 | Update extension icons | 🟢 Nice-to-have | Replace generic icons with VAR-Sec branded icons |
| X5 | Popup.html branding | 🟡 TODO | Verify and update any old branding |
| X6 | Blocked.html branding | 🟡 TODO | Verify and update any old branding |
| X7 | Blocklist sync interval too aggressive (4s) | 🟡 TODO | Change from 4s to 30-60s in `service-worker.js` L130 |

---

## 8. DEVOPS & INFRASTRUCTURE

| # | Item | Status |
|---|---|---|
| I1 | Update `README.md` with VAR-Sec branding + Getting Started guide | 🟡 TODO |
| I2 | Add Playwright install instructions to README | 🟡 TODO |
| I3 | Add `pandas` and `httpx` to `requirements.txt` | 🟡 TODO |
| I4 | Create a proper startup script (`start.sh` / `start.bat`) | 🟢 Nice-to-have |
| I5 | Remove dead feature pages or repurpose them | 🟡 TODO |
| I6 | Add favicon + og:image for the Next.js app | 🟢 Nice-to-have |
| I7 | Remove `/test` debug page | 🟢 Nice-to-have |

---

## 9. POLISH & DEMO PREP

| # | Item | Priority |
|---|---|---|
| P1 | Create/generate a VAR-Sec logo (football + shield) | 🟢 Nice-to-have |
| P2 | Prepare "what's reused vs new" transparency slide | 🟡 For pitch |
| P3 | Seed demo data end-to-end and rehearse live demo flow | 🟡 Before demo |
| P4 | Dark mode support for dashboard | 🟢 Nice-to-have |
| P5 | Test the full pipeline: scan URL → WHOIS + SSL + visual + heuristic → threat map → campaign | 🔴 Must do before demo |

---

## PRIORITY ORDER (Work Top-Down)

1. 🔴 **D2** — Capture FIFA visual templates (flagship differentiator is broken without these)
2. 🟡 **B1-B3** — WHOIS/SSL/Visual caching to DB (tables exist, just wire up)
3. 🟡 **Rebranding sweep** — Remaining 12+ frontend pages
4. 🟡 **B6-B7** — FIFA keyword boost + wire temporal/impersonation into fusion
5. 🟡 **D1** — Download Tranco list
6. 🟡 **X1-X3** — Extension `declarativeNetRequest` + allowlist + interstitial
7. 🟡 **Frontend threat map** — Replace fake map with Leaflet + GeoIP
8. 🟡 **I1-I3** — README, requirements.txt, devops
9. 🟡 **P3, P5** — Demo rehearsal
10. 🟢 **Everything else** — Logo, dark mode, favicon, cleanup
