import { API_URL } from "./api";

// First-party page-view beacon: POSTs { p, r, q } to the API collector at
// /a/e on load and on SPA navigations. No cookies, no third-party script —
// the collector hashes IP+UA with a daily-rotating salt and never stores
// either. The body is sent as a plain string so the cross-origin request
// stays "simple" (no CORS preflight).
export function startAnalytics(): void {
  if (navigator.webdriver) return;
  let last = "";
  const send = () => {
    const p = location.pathname;
    if (p === last) return;
    last = p;
    try {
      const d = JSON.stringify({
        p,
        r: document.referrer || "",
        q: location.search || "",
      });
      const url = `${API_URL}/a/e`;
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, d))) {
        fetch(url, { method: "POST", body: d, keepalive: true }).catch(
          () => {},
        );
      }
    } catch {
      // Analytics must never break the page.
    }
  };
  const h = history;
  const ps = h.pushState.bind(h);
  const rs = h.replaceState.bind(h);
  h.pushState = (...args) => {
    ps(...args);
    setTimeout(send, 0);
  };
  h.replaceState = (...args) => {
    rs(...args);
    setTimeout(send, 0);
  };
  addEventListener("popstate", () => setTimeout(send, 0));
  addEventListener("pageshow", (e) => {
    if (e.persisted) {
      last = "";
      send();
    }
  });
  send();
}
