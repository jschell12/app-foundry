import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

interface AnalyticsData {
  days: { date: string; views: number; visitors: number }[];
  channels: { channel: string; views: number; visitors: number }[];
  paths: { path: string; views: number }[];
}

const DAYS = 30;

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}

/** Hand-rolled daily views bar chart — flex columns, no chart dep. */
function DailyChart({ days }: { days: AnalyticsData["days"] }) {
  if (days.length === 0) {
    return <p className="text-sm text-zinc-400">No daily data yet.</p>;
  }
  const max = Math.max(...days.map((d) => d.views), 1);
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t-sm bg-amber-400/60 hover:bg-amber-400"
            style={{ height: `${Math.max((d.views / max) * 100, 2)}%` }}
            title={`${d.date}: ${d.views} views, ${d.visitors} visitors`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-zinc-600">
        <span>{days[0].date}</span>
        <span>{days[days.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AnalyticsData>(`/analytics/summary?days=${DAYS}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const totalViews = data?.days.reduce((a, d) => a + d.views, 0) ?? 0;
  const totalVisitors = data?.days.reduce((a, d) => a + d.visitors, 0) ?? 0;
  const topChannel = data?.channels[0]?.channel ?? "—";

  return (
    <>
      <h1 className="text-xl font-bold">Analytics</h1>
      <p className="mt-1 text-sm text-zinc-400">
        First-party traffic over the last {DAYS} days. Collected by the beacon
        in each frontend — no cookies, no third-party scripts.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!data && !error && <p className="mt-4 text-sm text-zinc-400">Loading…</p>}

      {data && (
        <div className="mt-6 max-w-3xl space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="page views" value={totalViews} />
            <StatCard label="visitors" value={totalVisitors} />
            <StatCard label="top channel" value={topChannel} />
          </div>

          <Card title="Daily views">
            <DailyChart days={data.days} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Channels">
              {data.channels.length === 0 ? (
                <p className="text-sm text-zinc-400">No channel data yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="pb-2 font-medium">Channel</th>
                      <th className="pb-2 text-right font-medium">Views</th>
                      <th className="pb-2 text-right font-medium">Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channels.map((c) => (
                      <tr key={c.channel} className="border-t border-zinc-800">
                        <td className="py-1.5">{c.channel}</td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-400">
                          {c.views}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-400">
                          {c.visitors}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Top pages">
              {data.paths.length === 0 ? (
                <p className="text-sm text-zinc-400">No page data yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="pb-2 font-medium">Path</th>
                      <th className="pb-2 text-right font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paths.map((p) => (
                      <tr key={p.path} className="border-t border-zinc-800">
                        <td className="max-w-0 truncate py-1.5 font-mono text-xs">
                          {p.path}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-400">
                          {p.views}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
