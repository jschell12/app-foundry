import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

interface Health {
  status: string;
  environment: string;
  database: string;
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Health>("/health")
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex">
        <aside className="min-h-screen w-56 border-r border-zinc-800 p-4">
          <p className="px-2 text-sm font-semibold tracking-tight">
            app-foundry <span className="text-amber-400">admin</span>
          </p>
          <nav className="mt-6 space-y-1 text-sm">
            {["Overview", "Users", "Data", "Emails", "Settings"].map(
              (item, i) => (
                <a
                  key={item}
                  href="#"
                  className={`block rounded-lg px-2 py-1.5 ${
                    i === 0
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {item}
                </a>
              ),
            )}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <h1 className="text-xl font-bold">System overview</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Owner-only admin surface for managing the site's data.
          </p>

          <div className="mt-6 max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              API health
            </p>
            {error ? (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            ) : health ? (
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Status</dt>
                  <dd className="text-emerald-400">{health.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Environment</dt>
                  <dd>{health.environment}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Database</dt>
                  <dd>{health.database}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">checking…</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
