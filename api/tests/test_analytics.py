from app.analytics import channel_for


def test_utm_source_wins_over_referrer():
    assert channel_for("google.com", "newsletter-sept") == "email"
    assert channel_for("", "hackernews") == "hn"
    assert channel_for("", "x") == "x"
    assert channel_for("", "reddit_ads") == "reddit"
    assert channel_for("", "partner-blog") == "partner-blog"


def test_referrer_buckets():
    assert channel_for("", "") == "direct"
    assert channel_for("news.ycombinator.com", "") == "hn"
    assert channel_for("old.reddit.com", "") == "reddit"
    assert channel_for("lobste.rs", "") == "lobsters"
    assert channel_for("t.co", "") == "x"
    assert channel_for("x.com", "") == "x"
    assert channel_for("www.google.com", "") == "google"
    assert channel_for("duckduckgo.com", "") == "search"
    assert channel_for("github.com", "") == "github"
    assert channel_for("www.linkedin.com", "") == "linkedin"
    assert channel_for("m.facebook.com", "") == "facebook"
    assert channel_for("example.org", "") == "other"
