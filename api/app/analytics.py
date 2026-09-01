"""Channel bucketing for the first-party analytics collector."""


def channel_for(ref_host: str, utm_source: str) -> str:
    """Map a page view's (referrer host, utm_source) pair to a channel.

    utm_source wins when present — an explicit tag is more trustworthy than
    a referrer header, which link shims and privacy settings routinely strip.
    """
    s = (utm_source or "").lower()
    if s:
        if "hn" in s or "hackernews" in s:
            return "hn"
        if "reddit" in s:
            return "reddit"
        if "lobsters" in s:
            return "lobsters"
        if "twitter" in s or s == "x":
            return "x"
        if "newsletter" in s or "email" in s:
            return "email"
        return s
    h = (ref_host or "").lower()
    if not h:
        return "direct"
    if "news.ycombinator" in h:
        return "hn"
    if "reddit" in h:
        return "reddit"
    if "lobste.rs" in h:
        return "lobsters"
    if h == "t.co" or "twitter" in h or h == "x.com":
        return "x"
    if "google" in h:
        return "google"
    if "bing" in h or "duckduckgo" in h:
        return "search"
    if "github" in h:
        return "github"
    if "linkedin" in h:
        return "linkedin"
    if "facebook" in h:
        return "facebook"
    return "other"
