# deploy

app-foundry on one Hetzner CX23 behind a Cloudflare tunnel, declared in
OpenTofu and shipped by GitHub Actions. This is the reference for what
infralift will generate: everything here except `infra/overrides.tf` and
`infra/terraform.tfvars` is meant to be machine-written.

```
deploy/
├── bootstrap/        R2 bucket for tofu state (run once)
├── infra/            root module: providers, backend, settings, overrides
│   ├── generated/    the stack itself (UI-owned)
│   ├── backend.tf    OpenTofu + R2, client-side encrypted (default)
│   ├── backends/     tfc.tf, the Terraform Cloud alternative
│   └── overrides.tf  yours, never rewritten
└── box/              what runs on the server: compose, Caddy, scripts

```

On the server, each environment gets its own copy of `box/` under
`/srv/app-foundry/code/<env>/`, and the nightly backup and PR teardowns run
production's copy. That keeps an ordinary PR from changing what production
runs by accident. It is not a security boundary: same-repo PRs run with the
deploy key and the deploy user is in the `docker` group, so **anyone who can
push a branch here is effectively root on the box.** Fork PRs get no secrets
and are skipped. Treat write access to this repo as access to the server.

## What it builds

| Piece | How |
|---|---|
| Server | `cx23` in `nbg1`, Ubuntu 24.04, Docker. Firewall with no inbound rules, so Hetzner drops everything inbound. |
| Data | Production Postgres lives on a separate 10 GB Hetzner volume (delete-protected), so the server can be rebuilt without touching data. |
| Ingress | Cloudflare tunnel. `demo.infralift.dev` and each preview go to Caddy on localhost, which picks the environment by host and passes the visitor's IP (from `Cf-Connecting-Ip`) to the API. |
| SSH | `demo-ssh.infralift.dev` through the tunnel, gated by Cloudflare Access: a service token for CI, browser login for the emails in `admin_emails`. sshd listens on 127.0.0.1 only. |
| Admin | `/admin` and `/api/analytics` on production sit behind Access. Previews do not serve them at all. |
| Backups | R2 bucket with a 30-day expiry rule, written nightly, restored nightly into a throwaway Postgres to prove the dump works. |
| CI wiring | tofu writes every secret and variable the workflows need straight into the repo's Actions settings. Nothing is copied by hand. |

Previews use a fixed pool of slots, `demo-preview-1` to `demo-preview-3`,
declared in tofu like every other record. The box gives each open PR the lowest
free slot and frees it on close, so CI never needs DNS access. Hosts are
single-level (`demo-preview-1.infralift.dev`, not `1.preview.demo.infralift.dev`)
so every name is covered by Cloudflare's free Universal SSL certificate.

infralift.dev also has a zone-wide `*.infralift.dev` Access app. A more
specific bypass app opens production and the preview slots;
`/admin` and `/api/analytics` stay behind Access.

## Workflows

| Workflow | Trigger | Does |
|---|---|---|
| `build.yml` | called | Builds api + three frontends once per commit to GHCR. Images carry no environment (the frontends call `/api` on their own host), so prod and previews run identical images. |
| `deploy.yml` | push to `main` | Build, ship `box/`, `deploy.sh prod`, smoke-test `/api/health`. |
| `preview.yml` | PR opened/updated/closed | Same per PR on a preview slot, shown as the PR's deployment link. Fork PRs are skipped (no secrets). At most 3 at once; a fourth fails until a PR closes. |
| `backup.yml` | nightly 07:17 UTC | `pg_dump` to R2, then restore that dump into a scratch Postgres and check the tables. |
| `infra.yml` | changes under `deploy/` | `tofu fmt`/`validate`, `terraform validate` on `generated/` (what a TFC workspace runs), shellcheck, and `box/test-local.sh`. |

Every deploy job is skipped until `vars.SSH_HOST` exists, so merging this does
nothing until the infra is applied.

## Standing it up

Credentials are environment variables only; inject them with
`scredmgr run`.

1. **Credentials**, all in scredmgr under `app-foundry/` (minted 2026-11-04):

   | Entry | Injected as | Scope |
   |---|---|---|
   | `CF_DEPLOY_TOKEN` | `CLOUDFLARE_API_TOKEN` | apply: Tunnel, Access apps/policies/service tokens, R2 buckets (account); DNS edit + zone read on `infralift.dev`. No token management. Expires 2026-12-04. |
   | `R2_BACKUP_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY` | `TF_VAR_r2_backup_*` | the backups bucket only |
   | `R2_STATE_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY` | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | the tfstate bucket only |
   | `TF_VAR_state_passphrase` | same | state encryption; `tofu init` needs it too. Lose it and the state cannot be read |

   Plus the root `HCLOUD_TOKEN` and `gh auth token`.

   tofu does not mint tokens. Cloudflare refuses token-management permission
   to any token created by another token, and an apply token that could mint
   anything would be the most dangerous credential on the account. So the
   narrow tokens are minted once (the `cf-token-mint` skill) and passed in.

2. **Prefix every command below** with
   `scredmgr run --only HCLOUD_TOKEN -- scredmgr run --path app-foundry -- env GITHUB_TOKEN=$(gh auth token) GITHUB_OWNER=jschell12`.

3. **Bootstrap the state bucket**, then move the bootstrap's own state into it
   (the steps are at the top of `bootstrap/main.tf`):
   ```sh
   cd deploy/bootstrap
   tofu init && tofu apply -var cloudflare_account_id=...   # local state, first run only
   cp r2-backend.tf.example r2-backend.tf
   tofu init -migrate-state -backend-config=../infra/backend.r2.hcl \
     -backend-config=key=bootstrap/terraform.tfstate
   ```
   `r2-backend.tf` stays uncommitted so a fresh clone of the template can
   still run the first step. To change the bootstrap later, copy it in again
   and `tofu init` with the same two `-backend-config` flags.
4. **Apply the stack**:
   ```sh
   cd deploy/infra
   cp backend.r2.hcl.example backend.r2.hcl          # fill in the account id
   cp terraform.tfvars.example terraform.tfvars      # account id, admin emails
   tofu init -backend-config=backend.r2.hcl
   tofu plan -out tfplan && tofu apply tfplan
   ```
5. **Run `deploy.yml`** (workflow_dispatch) or push to `main`.

Terraform Cloud instead: `cp backends/tfc.tf backend.tf`, set the org, and
put the same credentials on the workspace as sensitive variables.

## Acceptance

The reference is done when all three hold against the real box:

- a push to `main` deploys and `https://demo.infralift.dev/api/health` reports `"database":"ok"`
- a PR gets a working `demo-preview-<slot>.infralift.dev` link, and closing it removes the containers and frees the slot
- `backup.yml` writes a dump and its `verify-restore` job passes

`box/test-local.sh` runs the box half of this (deploy, routing, backup,
restore, teardown) in local Docker and in CI. It cannot cover the tunnel,
Access or R2.

## Notes

- `cloud-init` runs once, so the server ignores later template changes.
  Rebuild deliberately with `tofu apply -replace=module.app.hcloud_server.box`;
  production data survives on the volume.
- cloudflared is pinned (version + SHA-256) in `generated/variables.tf` and
  `.github/actions/box-ssh`; bump both together.
- Prod's tunnel token is in the server's user data (readable from the server
  only) and in state. State is encrypted for this reason.
- A real restore into production is `box/bin/restore.sh prod < file.dump`
  over `ssh`. It is destructive and nothing runs it automatically.
