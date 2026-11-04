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

## What it builds

| Piece | How |
|---|---|
| Server | `cx23` in `nbg1`, Ubuntu 24.04, Docker. Firewall with no inbound rules, so Hetzner drops everything inbound. |
| Data | Production Postgres lives on a separate 10 GB Hetzner volume (delete-protected), so the server can be rebuilt without touching data. |
| Ingress | Cloudflare tunnel. `demo.infralift.dev` and each preview go to Caddy on localhost, which picks the environment by host. |
| SSH | `demo-ssh.infralift.dev` through the tunnel, gated by Cloudflare Access: a service token for CI, browser login for the emails in `admin_emails`. sshd listens on 127.0.0.1 only. |
| Admin | `/admin` and `/api/analytics` on production sit behind Access. Previews do not serve them at all. |
| Backups | R2 bucket with a 30-day expiry rule, written nightly, restored nightly into a throwaway Postgres to prove the dump works. |
| CI wiring | tofu writes every secret and variable the workflows need straight into the repo's Actions settings. Nothing is copied by hand. |

Hosts are single-level (`demo-pr-12.infralift.dev`, not `pr-12.demo.infralift.dev`)
so every name is covered by Cloudflare's free Universal SSL certificate. The
nested form needs Advanced Certificate Manager.

## Workflows

| Workflow | Trigger | Does |
|---|---|---|
| `build.yml` | called | Builds api + three frontends once per commit to GHCR. Images carry no environment (the frontends call `/api` on their own host), so prod and previews run identical images. |
| `deploy.yml` | push to `main` | Build, ship `box/`, `deploy.sh prod`, smoke-test `/api/health`. |
| `preview.yml` | PR opened/updated/closed | Same per PR at `demo-pr-<n>.infralift.dev`, shown as the PR's deployment link. Creates and deletes the preview DNS record. Fork PRs are skipped (no secrets). Max 3 at once. |
| `backup.yml` | nightly 07:17 UTC | `pg_dump` to R2, then restore that dump into a scratch Postgres and check the tables. |
| `infra.yml` | changes under `deploy/` | `tofu fmt`/`validate`, `terraform validate` on `generated/` (what a TFC workspace runs), shellcheck, and `box/test-local.sh`. |

Every deploy job is skipped until `vars.SSH_HOST` exists, so merging this does
nothing until the infra is applied.

## Standing it up

Credentials are environment variables only; inject them with
`scredmgr run`.

1. **A Cloudflare token for apply.** The existing deploy tokens can read the
   zone but not mint tokens (plan fails on the two permission-group lookups
   with a 403). It needs, on the account: Account API Tokens Write, Cloudflare
   Tunnel Edit, Access: Apps and Policies Edit, Access: Service Tokens Edit,
   Workers R2 Storage Edit; and on the `infralift.dev` zone: DNS Edit, Zone Read.
2. **A state passphrase.** Store it (e.g. `app-foundry/TF_VAR_state_passphrase`).
   `tofu init` needs it too, not just plan. Lose it and the state cannot be read.
3. **Bootstrap the state bucket**, then move the bootstrap's own state into it:
   ```sh
   cd deploy/bootstrap
   tofu init && tofu apply -var cloudflare_account_id=...
   ```
4. **Apply the stack**:
   ```sh
   cd deploy/infra
   cp backend.r2.hcl.example backend.r2.hcl          # fill in the account id
   cp terraform.tfvars.example terraform.tfvars      # account id, admin emails
   export GITHUB_TOKEN=$(gh auth token) GITHUB_OWNER=jschell12
   # + HCLOUD_TOKEN, CLOUDFLARE_API_TOKEN, AWS_ACCESS_KEY_ID/SECRET (R2),
   #   TF_VAR_state_passphrase
   tofu init -backend-config=backend.r2.hcl
   tofu plan -out tfplan && tofu apply tfplan
   ```
5. **Run `deploy.yml`** (workflow_dispatch) or push to `main`.

Terraform Cloud instead: `cp backends/tfc.tf backend.tf`, set the org, and
put the same credentials on the workspace as sensitive variables.

## Acceptance

The reference is done when all three hold against the real box:

- a push to `main` deploys and `https://demo.infralift.dev/api/health` reports `"database":"ok"`
- a PR gets a working `demo-pr-<n>.infralift.dev` link, and closing it removes the containers and the DNS record
- `backup.yml` writes a dump and its `verify-restore` job passes

`box/test-local.sh` runs the box half of this (deploy, routing, backup,
restore, teardown) in local Docker and in CI. It cannot cover the tunnel,
Access or R2.

## Notes

- `cloud-init` runs once, so the server ignores later template changes.
  Rebuild deliberately with `tofu apply -replace=module.app.hcloud_server.box`;
  production data survives on the volume.
- Prod's tunnel token is in the server's user data (readable from the server
  only) and in state. State is encrypted for this reason.
- A real restore into production is `box/bin/restore.sh prod < file.dump`
  over `ssh`. It is destructive and nothing runs it automatically.
