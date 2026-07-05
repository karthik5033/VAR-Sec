import logging
import whoisdomain as whois
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

async def get_whois_data(domain: str) -> dict:
    """
    Lookup WHOIS data for a given domain using whoisdomain.
    Returns registrar, creation_date, expiration_date, etc.
    """
    logger.info(f"WHOIS lookup called for domain: {domain}")
    try:
        w = whois.query(domain)
        if not w:
            return _empty_whois(domain)

        created_date = w.creation_date
        expiry_date = w.expiration_date

        if isinstance(created_date, list):
            created_date = created_date[0]
        if isinstance(expiry_date, list):
            expiry_date = expiry_date[0]
            
        age_days = -1
        if created_date:
            age_days = (datetime.now().replace(tzinfo=None) - created_date.replace(tzinfo=None)).days

        return {
            "domain": domain,
            "registrar": w.registrar,
            "created_date": created_date,
            "expiry_date": expiry_date,
            "age_days": age_days,
            "registrant_country": getattr(w, 'registrant_country', "UNKNOWN")
        }
    except Exception as e:
        logger.error(f"WHOIS lookup failed for {domain}: {e}")
        return _empty_whois(domain)

def _empty_whois(domain: str) -> dict:
    return {
        "domain": domain,
        "registrar": "UNKNOWN",
        "created_date": None,
        "expiry_date": None,
        "age_days": -1,
        "registrant_country": "UNKNOWN"
    }
