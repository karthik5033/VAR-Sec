import logging
import os
import uuid
from urllib.parse import urlparse
import imagehash
from PIL import Image

try:
    from playwright.async_api import async_playwright
except ImportError:
    pass

logger = logging.getLogger(__name__)

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
TEMPLATES_DIR = os.path.join(ASSETS_DIR, "templates")
SCREENSHOTS_DIR = os.path.join(ASSETS_DIR, "screenshots")

os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

async def compare_visual_similarity(url: str) -> dict:
    """
    Takes a screenshot of the URL (using Playwright), computes a pHash,
    and checks for similarity against official FIFA template screenshots.
    """
    logger.info(f"Visual similarity called for url: {url}")
    
    # Ensure URL has scheme
    if not url.startswith("http"):
        url = "http://" + url

    screenshot_path = os.path.join(SCREENSHOTS_DIR, f"{uuid.uuid4().hex}.png")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, timeout=15000, wait_until="networkidle")
            await page.screenshot(path=screenshot_path)
            await browser.close()
    except Exception as e:
        logger.error(f"Playwright screenshot failed for {url}: {e}")
        return {
            "url": url,
            "matched_template": None,
            "similarity_score": 0.0,
            "screenshot_path": ""
        }

    # Compute pHash for the target
    try:
        target_hash = imagehash.phash(Image.open(screenshot_path))
    except Exception as e:
        logger.error(f"Failed to hash screenshot for {url}: {e}")
        return {
            "url": url,
            "matched_template": None,
            "similarity_score": 0.0,
            "screenshot_path": screenshot_path
        }

    # Compare against templates
    best_match = None
    best_score = 0.0
    
    # threshold for pHash difference (0-64). Lower diff means higher similarity.
    # We convert this to a similarity percentage.
    for template_name in os.listdir(TEMPLATES_DIR):
        if not template_name.endswith((".png", ".jpg", ".jpeg")):
            continue
            
        template_path = os.path.join(TEMPLATES_DIR, template_name)
        try:
            temp_hash = imagehash.phash(Image.open(template_path))
            diff = target_hash - temp_hash
            # Max difference for phash is 64
            similarity = max(0.0, 1.0 - (diff / 64.0))
            
            if similarity > best_score:
                best_score = similarity
                best_match = template_name
        except Exception as e:
            logger.error(f"Error processing template {template_name}: {e}")

    return {
        "url": url,
        "matched_template": best_match if best_score >= 0.8 else None, # threshold 0.8
        "similarity_score": best_score,
        "screenshot_path": screenshot_path
    }
