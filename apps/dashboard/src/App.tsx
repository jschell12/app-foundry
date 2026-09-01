import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking…");

  useEffect(() => {
    apiFetch<{ status: string }>("/health")
      .then((h) => setApiStatus(h.status))
      .catch(() => setApiStatus("unreachable"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight">
            app-foundry <span className="text-indigo-600">dashboard</span>
          </span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            customer@example.com
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          This is the customer-facing dashboard. Build your product's core
          experience here.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "API status", value: apiStatus },
            { label: "Projects", value: "0" },
            { label: "Usage this month", value: "—" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
