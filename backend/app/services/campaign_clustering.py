import logging
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import Campaign, OsintPost

logger = logging.getLogger(__name__)

def cluster_campaigns(db: Session, post_data: dict) -> int:
    """
    Groups related OSINT posts into cohesive 'Campaign' entities.
    Returns the campaign ID.
    """
    logger.info("Campaign clustering called")
    
    scam_type = post_data.get("scam_type_classified", "UNKNOWN")
    entities = post_data.get("entities", [])
    source = post_data.get("source_platform", "UNKNOWN")
    raw_text = post_data.get("raw_text", "")
    
    # 1. Search for an existing campaign that matches this scam type
    active_campaigns = db.query(Campaign).filter(Campaign.scam_type == scam_type).all()
    
    matched_campaign = None
    for campaign in active_campaigns:
        # Simplistic heuristic: if any entity matches the cluster summary, we group it.
        summary = (campaign.cluster_summary or "").lower()
        for entity in entities:
            if entity.lower() in summary:
                matched_campaign = campaign
                break
        if matched_campaign:
            break
            
    if matched_campaign:
        # Add new entities to summary if not already there
        current_summary = matched_campaign.cluster_summary or ""
        new_summary_parts = current_summary.split(",") if current_summary else []
        for entity in entities:
            if entity not in new_summary_parts:
                new_summary_parts.append(entity)
        
        matched_campaign.cluster_summary = ",".join(new_summary_parts)
        matched_campaign.post_count += 1
        matched_campaign.last_seen = datetime.utcnow()
        campaign_id = matched_campaign.id
    else:
        # Create new campaign
        new_campaign = Campaign(
            campaign_name=f"FIFA_{scam_type}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            scam_type=scam_type,
            post_count=1,
            cluster_summary=",".join(entities) if entities else ""
        )
        db.add(new_campaign)
        db.flush() # flush to get the ID
        campaign_id = new_campaign.id
        
    # Create the OsintPost record
    new_post = OsintPost(
        source_platform=source,
        raw_text=raw_text,
        scam_type_classified=scam_type,
        campaign_id=campaign_id
    )
    db.add(new_post)
    db.commit()
    
    return campaign_id
