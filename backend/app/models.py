from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    domain = Column(String, index=True)
    risk_score = Column(Float)
    risk_level = Column(String)  # SAFE, SUSPICIOUS, HIGH_RISK
    explanation = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class BlockedDomain(Base):
    __tablename__ = "blocked_domains"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class AllowedDomain(Base):
    __tablename__ = "allowed_domains"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class WhoisData(Base):
    __tablename__ = "whois_data"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True)
    registrar = Column(String)
    created_date = Column(DateTime(timezone=True))
    expiry_date = Column(DateTime(timezone=True))
    registrant_country = Column(String)
    age_days = Column(Integer)
    last_checked = Column(DateTime(timezone=True), server_default=func.now())

class SslCheck(Base):
    __tablename__ = "ssl_checks"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True)
    issuer = Column(String)
    valid_from = Column(DateTime(timezone=True))
    valid_to = Column(DateTime(timezone=True))
    cn_mismatch = Column(Boolean, default=False)
    last_checked = Column(DateTime(timezone=True), server_default=func.now())

class VisualMatch(Base):
    __tablename__ = "visual_matches"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    matched_template = Column(String)
    similarity_score = Column(Float)
    screenshot_path = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    campaign_name = Column(String, index=True)
    scam_type = Column(String)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    post_count = Column(Integer, default=0)
    cluster_summary = Column(String)

    domains = relationship("CampaignDomain", back_populates="campaign")
    posts = relationship("OsintPost", back_populates="campaign")

class CampaignDomain(Base):
    __tablename__ = "campaign_domains"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    domain = Column(String, index=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    campaign = relationship("Campaign", back_populates="domains")

class OsintPost(Base):
    __tablename__ = "osint_posts"

    id = Column(Integer, primary_key=True, index=True)
    source_platform = Column(String)
    raw_text = Column(String)
    scam_type_classified = Column(String)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    campaign = relationship("Campaign", back_populates="posts")
