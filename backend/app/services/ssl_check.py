import logging
import ssl
import socket
from datetime import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

async def validate_ssl_cert(domain: str) -> dict:
    """
    Validates SSL certificate for the given domain.
    Returns issuer, valid dates, and mismatch status.
    """
    logger.info(f"SSL validation called for domain: {domain}")
    try:
        # Strip scheme if present
        if "://" in domain:
            domain = domain.split("://")[1].split("/")[0]

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with socket.create_connection((domain, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                der_cert = ssock.getpeercert(True)
                
        cert = x509.load_der_x509_certificate(der_cert, default_backend())
        
        # Extract issuer
        issuer_attrs = cert.issuer.get_attributes_for_oid(x509.NameOID.ORGANIZATION_NAME)
        if not issuer_attrs:
            issuer_attrs = cert.issuer.get_attributes_for_oid(x509.NameOID.COMMON_NAME)
        issuer = issuer_attrs[0].value if issuer_attrs else "Unknown"

        # Valid dates
        valid_from = cert.not_valid_before_utc
        valid_to = cert.not_valid_after_utc

        # Check mismatch
        cn_mismatch = True
        try:
            ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
            sans = ext.value.get_values_for_type(x509.DNSName)
            for san in sans:
                san_val = san.lower()
                dom_val = domain.lower()
                if san_val == dom_val or san_val == f"*.{dom_val}" or dom_val.endswith(san_val.lstrip("*.")):
                    cn_mismatch = False
                    break
        except x509.ExtensionNotFound:
            # Fallback to CN
            cn_attrs = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)
            if cn_attrs:
                cn = cn_attrs[0].value.lower()
                dom_val = domain.lower()
                if cn == dom_val or cn == f"*.{dom_val}" or dom_val.endswith(cn.lstrip("*.")):
                    cn_mismatch = False

        return {
            "domain": domain,
            "issuer": issuer,
            "valid_from": valid_from,
            "valid_to": valid_to,
            "cn_mismatch": cn_mismatch
        }
    except Exception as e:
        logger.error(f"SSL check failed for {domain}: {e}")
        return {
            "domain": domain,
            "issuer": "FAILED",
            "valid_from": None,
            "valid_to": None,
            "cn_mismatch": True
        }
