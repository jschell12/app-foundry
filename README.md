# app-foundry

Production-ready full-stack application template with React, Tailwind CSS,
FastAPI, PostgreSQL, Resend, Docker Compose, Kubernetes, and Nomad support.

Use this repository as a GitHub template for new app ideas: three separate
frontends (marketing, customer dashboard, admin dashboard), one API, one
database, and infrastructure definitions for local development and
production orchestration.

## Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontends | React 19 + Vite + Tailwind CSS 4 (three apps)   |
| API       | FastAPI + SQLAlchemy (async) + asyncpg          |
| Database  | PostgreSQL 17                                   |
| Email     | Resend (configured via `RESEND_API_KEY`)        |
| Local dev | Docker Compose                                  |
| Deploy    | Kubernetes manifests and Nomad job specs        |

## Layout

```
app-foundry/
├── apps/
│   ├── marketing/       # Public marketing site        (dev port 3000)
│   ├── dashboard/       # Customer-facing dashboard    (dev port 3001)
│   └── admin/           # Owner/admin dashboard        (dev port 3002)
├── api/                 # FastAPI service              (port 8000)
├── infra/
│   ├── docker/          # Dockerfiles + nginx config
│   ├── kubernetes/      # Deployments, services, ingress, Postgres
│   └── nomad/           # Nomad job specs
├── docker-compose.yml
└── .env.example
```

The three frontends are intentionally separate apps in a pnpm workspace
rather than one React app with three sections. This keeps deployment,
authentication boundaries, and evolution independent per surface.

## Quick start (Docker Compose)

```sh
cp .env.example .env
docker compose up --build
```

| Service   | URL                    |
| --------- | ---------------------- |
| Marketing | http://localhost:3000  |
| Dashboard | http://localhost:3001  |
| Admin     | http://localhost:3002  |
| API       | http://localhost:8000  |
| API docs  | http://localhost:8000/docs |
| Postgres  | localhost:5432         |

## Local development (hot reload)

Run only the database in Docker and everything else natively:

```sh
cp .env.example .env
docker compose up -d db

# API (requires Python 3.12+)
cd api
python -m venv .venv && . .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload

# Frontends (requires Node 22+, pnpm via corepack)
corepack enable
pnpm install
pnpm dev:marketing   # or dev:dashboard / dev:admin
```

## Email (Resend)

The API sends email through [Resend](https://resend.com). Set
`RESEND_API_KEY` and `EMAIL_FROM` in `.env`. Without a key, email sending
is a no-op that logs instead of failing, so the template runs out of the
box.

## Analytics

The template ships with first-party page-view analytics — no cookies, no
third-party scripts. Same pattern as the permitguv and infralift sites,
adapted to store events in Postgres instead of Workers Analytics Engine.

- **Beacon** — `apps/{marketing,dashboard}/src/lib/analytics.ts`, started
  from each app's `main.tsx`. Sends `{ p, r, q }` to the API on load and on
  SPA navigations. The admin app is not instrumented.
- **Collector** — `POST /a/e` in `api/app/routers/analytics.py`. Drops bot
  user agents and prefetches, strips same-site referrers, buckets the
  referrer/utm_source into a channel, and writes one `analytics_events`
  row. Raw IP and user-agent are only inputs to a salted SHA-256 visitor
  hash that rotates daily — they are never stored. Always returns 204.
- **Admin view** — the Analytics tab in `apps/admin` renders 30 days of
  stat cards, a daily views chart, channels, and top pages from
  `GET /analytics/summary`.

Set `ANALYTICS_SALT` in `.env` to any random string. Events are stored
unaggregated; add a rollup table if a site outgrows query-time aggregation.

## Deploying

### Kubernetes

Manifests live in `infra/kubernetes/`. Edit the image references and the
secret, then:

```sh
kubectl apply -f infra/kubernetes/
```

For production, prefer a managed PostgreSQL service over the bundled
StatefulSet and point `DATABASE_URL` at it via the secret.

### Nomad

Job specs live in `infra/nomad/`. The web job is parameterized so one spec
serves all three frontends:

```sh
nomad job run infra/nomad/postgres.nomad.hcl
nomad job run infra/nomad/api.nomad.hcl
nomad job run -var app=marketing -var port=3000 infra/nomad/web.nomad.hcl
nomad job run -var app=dashboard -var port=3001 infra/nomad/web.nomad.hcl
nomad job run -var app=admin     -var port=3002 infra/nomad/web.nomad.hcl
```

## Using this as a template

1. Click **Use this template** on GitHub (or clone and re-init git).
2. Search-and-replace `app-foundry` / `app_foundry` with your project name.
3. Update `.env.example` defaults and the image names in `infra/`.
4. Start building: add SQLAlchemy models in `api/app/`, routes in
   `api/app/routers/`, and screens in `apps/*/src/`.
