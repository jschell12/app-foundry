import logging

import resend

from .config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> str | None:
    """Send an email via Resend. Returns the Resend email id, or None when
    no RESEND_API_KEY is configured (the send is logged instead so the
    template works out of the box)."""
    if not settings.resend_api_key:
        logger.info(
            "RESEND_API_KEY not set — skipping email to %s (subject: %s)",
            to,
            subject,
        )
        return None

    resend.api_key = settings.resend_api_key
    result = resend.Emails.send(
        {
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        }
    )
    return result.get("id")
