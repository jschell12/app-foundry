from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class AnalyticsEvent(Base):
    """One accepted page view from the first-party beacon.

    Raw IP and user-agent are inputs to visitor_hash only — they are never
    stored. The hash's salt rotates daily, so a visitor collapses to one
    hash within a UTC day but cannot be linked across days.
    """

    __tablename__ = "analytics_events"
    __table_args__ = (Index("ix_analytics_events_ts", "ts"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    path: Mapped[str] = mapped_column(String(256))
    ref_host: Mapped[str] = mapped_column(String(256), default="")
    utm_source: Mapped[str] = mapped_column(String(128), default="")
    utm_medium: Mapped[str] = mapped_column(String(128), default="")
    utm_campaign: Mapped[str] = mapped_column(String(128), default="")
    channel: Mapped[str] = mapped_column(String(64), default="direct")
    country: Mapped[str] = mapped_column(String(8), default="")
    visitor_hash: Mapped[str] = mapped_column(String(16))
