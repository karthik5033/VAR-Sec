import logging
import json
import google.generativeai as genai
import os

logger = logging.getLogger(__name__)

async def ingest_osint_post(source: str, text: str) -> dict:
    """
    Ingest a social media / messaging post, use LLM to classify
    the scam type and entities.
    """
    logger.info(f"OSINT ingestion called for post from {source}")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found. Fallback to basic keyword matching.")
        return _fallback_classification(source, text)
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are a cybersecurity analyst for FIFA. Analyze the following social media/messaging post for potential scams.
        
        Post content:
        "{text}"
        
        Classify this post into one of the following scam types:
        - TICKETING (Fake tickets, unauthorized resales)
        - STREAMING (Illegal broadcasts, piracy)
        - PHISHING (Credential theft, malware drops, fake giveaways)
        - SAFE (Not a scam)
        
        Also extract any key entities mentioned (e.g. URLs, email addresses, phone numbers, crypto wallets).
        
        Respond ONLY with a valid JSON object matching this schema:
        {{
            "scam_type": "TYPE",
            "entities": ["entity1", "entity2"]
        }}
        """
        
        response = model.generate_content(prompt)
        # Parse JSON
        result_text = response.text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:-3].strip()
        elif result_text.startswith("```"):
            result_text = result_text[3:-3].strip()
            
        data = json.loads(result_text)
        
        return {
            "source_platform": source,
            "raw_text": text,
            "scam_type_classified": data.get("scam_type", "UNKNOWN"),
            "entities": data.get("entities", [])
        }
    except Exception as e:
        logger.error(f"Gemini API failed for OSINT ingestion: {e}")
        return _fallback_classification(source, text)

def _fallback_classification(source: str, text: str) -> dict:
    text_lower = text.lower()
    scam_type = "SAFE"
    
    if any(kw in text_lower for kw in ["ticket", "resale", "seat", "buy"]):
        scam_type = "TICKETING"
    elif any(kw in text_lower for kw in ["stream", "live", "watch", "broadcast", "free"]):
        scam_type = "STREAMING"
    elif any(kw in text_lower for kw in ["giveaway", "win", "claim", "login", "password"]):
        scam_type = "PHISHING"
        
    return {
        "source_platform": source,
        "raw_text": text,
        "scam_type_classified": scam_type,
        "entities": []
    }
