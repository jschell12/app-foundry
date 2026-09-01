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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">app-foundry</span>
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a
            href="http://localhost:3001"
            className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
          >
            Sign in
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-24 pb-32 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Ship your next idea
          <span className="block text-indigo-400">from a running start.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          This is the public marketing site. Replace this page with your
          product story — the dashboard, admin, API, and database are already
          wired up behind it.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="http://localhost:3001"
            className="rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white hover:bg-indigo-400"
          >
            Get started
          </a>
          <a
            href="https://github.com/jschell12/app-foundry"
            className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:border-slate-500"
          >
            View template
          </a>
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-8 text-center text-xs text-slate-500">
        API status: <span className="text-slate-300">{apiStatus}</span>
      </footer>
    </div>
  );
}
