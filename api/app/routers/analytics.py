import hashlib
import json
import re
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..analytics import channel_for
from ..config import settings
from ..db import SessionLocal, get_session
from ..models import AnalyticsEvent

router = APIRouter(tags=["analytics"])

# First-party page-view collector. The beacon in each frontend's
# src/lib/analytics.ts POSTs { p: pathname, r: referrer, q: search } here;
# each accepted hit becomes one analytics_events row. Raw IP and user-agent
# are only inputs to a salted SHA-256 that rotates daily — never stored.

MAX_BODY_CHARS = 2048

BOT_UA = re.compile(
    r"bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|scan"
    r"|python|curl|wget|httpx|monitor|uptime|facebookexternalhit",
    re.IGNORECASE,
)


def _ref_host(referrer: object, request: Request) -> str:
    if not isinstance(referrer, str) or referrer == "":
        return ""
    try:
        host = urlsplit(referrer).hostname or ""
    except ValueError:
        return ""
    # Same-site referrers are noise: the beacon's page host arrives in the
    # Origin header (the API is a separate origin from the frontends).
    origin = request.headers.get("origin", "")
    own = urlsplit(origin).hostname if origin else request.url.hostname
    return "" if host == own else host


def _visitor_hash(ip: str, ua: str) -> str:
    day = datetime.now(UTC).date().isoformat()
    raw = f"{settings.analytics_salt}{day}|{settings.app_name}|{ip}|{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


@router.post("/a/e", status_code=204)
async def collect(request: Request) -> Response:
    # Always 204: the beacon never retries and callers learn nothing about
    # what was accepted, dropped, or how it failed.
    done = Response(status_code=204)
    try:
        raw = await request.body()
        if len(raw) > MAX_BODY_CHARS:
            return done
        try:
            body = json.loads(raw)
        except ValueError:
            return done
        if not isinstance(body, dict):
            return done

        p = body.get("p")
        if not isinstance(p, str) or not p.startswith("/"):
            return done
        path = p[:256]

        ua = request.headers.get("user-agent", "")
        if ua == "" or BOT_UA.search(ua):
            return done
        purpose = request.headers.get("sec-purpose", "") + request.headers.get(
            "purpose", ""
        )
        if "prefetch" in purpose:
            return done

        ref_host = _ref_host(body.get("r"), request)
        q = body.get("q")
        params = parse_qs(q[:512].lstrip("?")) if isinstance(q, str) else {}

        def utm(key: str) -> str:
            return params.get(key, [""])[0][:128]

        forwarded = request.headers.get("x-forwarded-for", "")
        ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "")
        )
        country = request.headers.get("cf-ipcountry", "")[:8]

        event = AnalyticsEvent(
            path=path,
            ref_host=ref_host[:256],
            utm_source=utm("utm_source"),
            utm_medium=utm("utm_medium"),
            utm_campaign=utm("utm_campaign"),
            channel=channel_for(ref_host, utm("utm_source")),
            country=country,
            visitor_hash=_visitor_hash(ip, ua),
        )
        async with SessionLocal() as session:
            session.add(event)
            await session.commit()
    except Exception:
        # Analytics must never surface an error to the page.
        pass
    return done


@router.get("/analytics/summary")
async def summary(
    days: int = 30, session: AsyncSession = Depends(get_session)
) -> dict[str, list[dict[str, object]]]:
    days = max(1, min(days, 90))
    today = datetime.now(UTC).date()
    start = today - timedelta(days=days - 1)
    since = datetime.combine(start, datetime.min.time(), tzinfo=UTC)

    day_col = func.date(AnalyticsEvent.ts)
    visitors = func.count(distinct(AnalyticsEvent.visitor_hash))

    daily_rows = (
        await session.execute(
            select(day_col, func.count(), visitors)
            .where(AnalyticsEvent.ts >= since)
            .group_by(day_col)
        )
    ).all()
    by_day = {str(d)[:10]: (v, u) for d, v, u in daily_rows}
    daily = []
    for i in range(days):
        date = (start + timedelta(days=i)).isoformat()
        views, uniques = by_day.get(date, (0, 0))
        daily.append({"date": date, "views": views, "visitors": uniques})

    channel_rows = (
        await session.execute(
            select(AnalyticsEvent.channel, func.count(), visitors)
            .where(AnalyticsEvent.ts >= since)
            .group_by(AnalyticsEvent.channel)
            .order_by(func.count().desc())
        )
    ).all()
    channels = [
        {"channel": c, "views": v, "visitors": u} for c, v, u in channel_rows
    ]

    path_rows = (
        await session.execute(
            select(AnalyticsEvent.path, func.count())
            .where(AnalyticsEvent.ts >= since)
            .group_by(AnalyticsEvent.path)
            .order_by(func.count().desc())
            .limit(20)
        )
    ).all()
    paths = [{"path": p, "views": v} for p, v in path_rows]

    return {"days": daily, "channels": channels, "paths": paths}
