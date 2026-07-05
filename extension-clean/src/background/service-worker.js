/**
 * FIFA Threat Intel Service Worker v3.0
 * Real-time blocking enabled
 */

const API_BASE = "http://127.0.0.1:8000/api/v1";
console.log("[FIFA Threat Intel] Service Worker v3.1 - Build: 2025-03-17");

// Cache for analyzed URLs
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour
const MAX_CACHE_SIZE = 100; // Limit cache to 100 entries to prevent memory leak

// Temporary whitelist (session only)
const tempWhitelist = new Set();

// Permanent blocklist (synced from backend)
let permanentBlocklist = new Set();

// Settings
const DEFAULT_SETTINGS = {
    blockingEnabled: true,
    blockThreshold: 0.75,  // 75% risk score triggers block
    showWarnings: true
};

/**
 * Sync permanent blocklist from backend
 */
async function syncBlocklist() {
    try {
        const response = await fetch(`${API_BASE}/blocklist`, {
            method: "GET",
            cache: "no-cache"
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("[FIFA Threat Intel] 📥 Received blocklist data:", data);
            
            permanentBlocklist.clear();
            
            if (data.domains && Array.isArray(data.domains)) {
                data.domains.forEach(item => {
                    permanentBlocklist.add(item.domain.toLowerCase().trim()); // Normalize
                });
                console.log(`[FIFA Threat Intel] 📋 Synced ${permanentBlocklist.size} permanently blocked domains:`, Array.from(permanentBlocklist));
            }
        } else {
             console.error(`[FIFA Threat Intel] ❌ Blocklist sync failed: ${response.status}`);
        }
    } catch (error) {
        console.error("[FIFA Threat Intel] ❌ Failed to sync blocklist (Network Error):", error);
    }
}

/**
 * Check if domain is in permanent blocklist
 */
function isPermanentlyBlocked(url) {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase(); // Normalize
        
        console.log(`[FIFA Threat Intel] 🔍 Checking: ${domain} (Blocklist size: ${permanentBlocklist.size})`);
        
        // Debug: Log first 5 items if list is small or debugging
        if (permanentBlocklist.size > 0 && permanentBlocklist.size < 10) {
             console.log("[FIFA Threat Intel] Blocklist content:", Array.from(permanentBlocklist));
        }

        // Check exact match
        if (permanentBlocklist.has(domain)) {
            console.log(`[FIFA Threat Intel] 🚫 EXACT MATCH found for: ${domain}`);
            return true;
        }
        
        // Check if any parent domain is blocked
        const parts = domain.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            const parentDomain = parts.slice(i).join('.');
            if (permanentBlocklist.has(parentDomain)) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Get user settings
 */
async function getSettings() {
    const result = await chrome.storage.local.get(['settings', 'protectionEnabled']);
    // Fallback to protectionEnabled if settings.blockingEnabled is not set
    const protectionEnabled = result.protectionEnabled !== undefined ? result.protectionEnabled : DEFAULT_SETTINGS.blockingEnabled;
    return { ...DEFAULT_SETTINGS, ...result.settings, blockingEnabled: protectionEnabled };
}

/**
 * Check backend health on startup
 */
async function checkBackend() {
    try {
        const res = await fetch("http://127.0.0.1:8000/health", {
            method: "GET",
            cache: "no-cache"
        });
        if (res.ok) {
            console.log("[FIFA Threat Intel] ✅ Backend online");
            return true;
        }
    } catch (err) {
        console.warn("[FIFA Threat Intel] ⚠️ Backend offline - start with: python start_server.py");
    }
    return false;
}

// Check backend on install/startup
chrome.runtime.onInstalled.addListener(() => {
    console.log("[FIFA Threat Intel] Extension installed");
    checkBackend();
    syncBlocklist(); // Sync blocklist on install
});

// Sync blocklist every 4 seconds for real-time responsiveness
setInterval(syncBlocklist, 4 * 1000);

// Initial sync
syncBlocklist();

/**
 * Analyze URL for phishing/malicious content
 */
async function analyzeURL(url, isMainFrame = false) {
    // Check cache first
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (isMainFrame) updateStats(url, cached.data.max_risk_score, true);
        return cached.data;
    }

    try {
        console.log(`[FIFA Threat Intel] 🚀 Analyzing: ${url.substring(0, 50)}...`);
        const response = await fetch(`${API_BASE}/detect-fifa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        data.max_risk_score = data.fusion_score !== undefined ? data.fusion_score : (data.max_risk_score || 0);
        console.log(`[FIFA Threat Intel] 📉 Result for ${url.substring(0, 30)}: ${Math.round(data.max_risk_score * 100)}%`);
        
        // Cache result
        cache.set(url, {
            data: data,
            timestamp: Date.now()
        });

        // Limit cache size
        if (cache.size > MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        // Track stats for popup
        await updateStats(url, data.max_risk_score, isMainFrame);

        return data;
    } catch (error) {
        console.error("[FIFA Threat Intel] API Error:", error.message);
        // Return safe default on error
        return {
            max_risk_score: 0,
            text: url,
            labels: { error: { probability: 1.0, top_features: [{word: "BACKEND_OFFLINE", weight: 1.0}] } }
        };
    }
}

/**
 * Analyze dialog text with temporal analysis
 */
async function analyzeDialog(text, dialogType, url) {
    try {
        console.log(`[FIFA Threat Intel] 🔔 Analyzing ${dialogType}: ${text.substring(0, 50)}...`);
        
        // Try the new dedicated temporal analysis endpoint first
        try {
            const temporalResponse = await fetch(`${API_BASE}/temporal/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    text: text,
                    context: dialogType,
                    url: url
                })
            });

            if (temporalResponse.ok) {
                const temporalData = await temporalResponse.json();
                console.log(`[FIFA Threat Intel] 📊 Temporal analysis: ${Math.round(temporalData.risk_score * 100)}%, ${temporalData.triggers.length} triggers`);
                
                // Update stats
                await updateStats(url || 'dialog', temporalData.risk_score, false);
                
                return {
                    riskScore: temporalData.risk_score,
                    triggers: temporalData.triggers,
                    labels: temporalData.categories,
                    dialogType: dialogType,
                    explanation: temporalData.explanation
                };
            }
        } catch (temporalError) {
            console.warn("[FIFA Threat Intel] Temporal endpoint failed, falling back to detect:", temporalError.message);
        }
        
        // Fallback to the old /detect endpoint
        const response = await fetch(`${API_BASE}/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Extract trigger words using same logic as temporal service
        const TRIGGER_PATTERNS = {
            URGENCY: ["immediately", "urgent", "now", "asap", "hurry", "quick", "expire", "expiring", "deadline", "limited time", "act now", "don't wait"],
            FEAR: ["locked", "suspended", "terminated", "blocked", "compromised", "unauthorized", "suspicious", "fraud", "security alert", "breach"],
            AUTHORITY: ["verify", "confirm", "update", "required", "must", "mandatory", "compliance", "official", "authorized"],
            IMPERSONATION: ["account", "password", "credentials", "login", "security", "bank", "payment", "billing"]
        };
        
        const triggers = [];
        const lowerText = text.toLowerCase();
        
        Object.entries(TRIGGER_PATTERNS).forEach(([category, words]) => {
            words.forEach(word => {
                if (lowerText.includes(word)) {
                    const position = lowerText.indexOf(word);
                    const score = category === 'URGENCY' ? 0.9 : category === 'FEAR' ? 0.85 : 0.75;
                    triggers.push({ word, category, score, position });
                }
            });
        });
        
        // Sort by position (temporal order)
        triggers.sort((a, b) => a.position - b.position);
        
        console.log(`[FIFA Threat Intel] 📊 Dialog analysis (fallback): ${Math.round(data.max_risk_score * 100)}%, ${triggers.length} triggers`);
        
        // Update stats
        await updateStats(url || 'dialog', data.max_risk_score, false);
        
        return {
            riskScore: data.max_risk_score,
            triggers: triggers.slice(0, 15),
            labels: data.labels,
            dialogType: dialogType
        };
    } catch (error) {
        console.error("[FIFA Threat Intel] Dialog analysis error:", error.message);
        return {
            riskScore: 0,
            triggers: [],
            labels: {},
            dialogType: dialogType
        };
    }
}

/**
 * Update statistics for popup
 */
async function updateStats(url, riskScore, isMainFrame) {
    try {
        const result = await chrome.storage.local.get(['scansToday', 'threatsBlocked', 'recentScans', 'lastResetDate']);
        
        const today = new Date().toDateString();
        let scansToday = result.scansToday || 0;
        let threatsBlocked = result.threatsBlocked || 0;
        let recentScans = result.recentScans || [];
        
        // Reset daily count if new day
        if (result.lastResetDate !== today) {
            scansToday = 0;
            await chrome.storage.local.set({ lastResetDate: today });
        }
        
        // Increment counters
        scansToday++;
        if (riskScore >= 0.55) {
            threatsBlocked++;
            // Badge text for threats
            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: riskScore >= 0.75 ? "#ef4444" : "#f59e0b" });
        }
        
        // HISTORY LOGIC:
        // Only log if it's the MAIN PAGE we visited, OR if it's a THREAT found on the page.
        if (isMainFrame || riskScore >= 0.55) {
            // Avoid duplicate consecutive entries
            if (recentScans.length === 0 || recentScans[0].url !== url) {
                recentScans.unshift({
                    url: url,
                    risk_score: riskScore,
                    timestamp: Date.now()
                });
                recentScans = recentScans.slice(0, 10);
            }
        }
        
        // Save updated stats
        await chrome.storage.local.set({
            scansToday,
            threatsBlocked,
            recentScans
        });
    } catch (error) {
        console.error("[FIFA Threat Intel] Stats update failed:", error);
    }
}

/**
 * Web Navigation Listener - Real-time blocking
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only process main frame navigations
    if (details.frameId !== 0) return;
    
    const url = details.url;
    const tabId = details.tabId;
    
    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        return;
    }
    
    // NOTIFY BACKEND of current browsing (Fire and Forget)
    fetch(`${API_BASE}/status/current-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url })
    }).catch(e => {});
    
    // Check if URL is whitelisted
    if (tempWhitelist.has(url)) {
        console.log("[FIFA Threat Intel] ✅ Whitelisted:", url);
        return;
    }
    
    // Get settings
    const settings = await getSettings();
    if (!settings.blockingEnabled) {
        console.log("[FIFA Threat Intel] ⏸️ Blocking disabled");
        return;
    }
    
    // PRIORITY 1: Check permanent blocklist (instant block, no API call needed)
    if (isPermanentlyBlocked(url)) {
        console.log("[FIFA Threat Intel] 🚫 PERMANENTLY BLOCKED:", url);
        
        // Redirect to blocking page with permanent block indicator
        const blockedPageUrl = chrome.runtime.getURL('blocked.html') +
            '?url=' + encodeURIComponent(url) +
            '&risk=1.0' +
            '&permanent=true' +
            '&labels=' + encodeURIComponent(JSON.stringify({
                blocked: { probability: 1.0, top_features: [] }
            }));
        
        chrome.tabs.update(tabId, { url: blockedPageUrl });
        return;
    }
    
    // PRIORITY 2: Analyze URL with AI model
    console.log("[FIFA Threat Intel] 🔍 Analyzing navigation:", url);
    const analysis = await analyzeURL(url, true);
    
    // Check if should block based on risk score
    if (analysis.max_risk_score >= settings.blockThreshold) {
        console.log("[FIFA Threat Intel] 🛑 BLOCKING:", url, "Risk:", analysis.max_risk_score);
        
        // Redirect to blocking page
        const blockedPageUrl = chrome.runtime.getURL('blocked.html') +
            '?url=' + encodeURIComponent(url) +
            '&risk=' + analysis.max_risk_score +
            '&labels=' + encodeURIComponent(JSON.stringify(analysis.labels));
        
        chrome.tabs.update(tabId, { url: blockedPageUrl });
    } else {
        console.log("[FIFA Threat Intel] ✅ Safe:", url, "Risk:", analysis.max_risk_score);
    }
});

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_URL") {
        analyzeURL(message.url, message.isMainFrame)
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; 
    }
    
    if (message.type === "ANALYZE_DIALOG") {
        // New handler for dialog/notification analysis
        analyzeDialog(message.text, message.dialogType, message.url)
            .then(data => sendResponse(data))
            .catch(err => sendResponse({ riskScore: 0, triggers: [], error: err.message }));
        return true;
    }
    
    if (message.type === "WHITELIST_TEMP") {
        // Add URL to temporary whitelist
        tempWhitelist.add(message.url);
        console.log("[FIFA Threat Intel] ➕ Whitelisted:", message.url);
        sendResponse({ success: true });
        return false;
    }
    
    if (message.type === "LOG_BLOCKED") {
        // Log blocked attempt
        console.log("[FIFA Threat Intel] 📝 Logged block:", message.url);
        sendResponse({ success: true });
        return false;
    }
    
    if (message.type === "REPORT_FALSE_POSITIVE") {
        // Handle false positive report
        console.log("[FIFA Threat Intel] 📢 False positive reported:", message.url);
        // Could send to backend for retraining
        sendResponse({ success: true });
        return false;
    }
    
    
    if (message.type === "SYNC_BLOCKLIST") {
        // Force immediate blocklist sync
        console.log("[FIFA Threat Intel] 🔄 Force syncing blocklist...");
        syncBlocklist()
            .then(() => {
                console.log("[FIFA Threat Intel] ✅ Blocklist synced. Current size:", permanentBlocklist.size);
                sendResponse({ 
                    success: true, 
                    count: permanentBlocklist.size,
                    domains: Array.from(permanentBlocklist)
                });
            })
            .catch(err => {
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }
    
    if (message.type === "PING") {
        sendResponse({ status: "ok" });
        return false;
    }
});

console.log("[FIFA Threat Intel] Service Worker ready - Blocking enabled");
