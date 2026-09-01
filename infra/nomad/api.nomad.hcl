job "app-foundry-api" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 2

    network {
      port "http" {
        to = 8000
      }
    }

    task "api" {
      driver = "docker"

      config {
        image = "ghcr.io/jschell12/app-foundry-api:latest" # replace with your registry
        ports = ["http"]
      }

      # Prefer Nomad Variables or Vault for real credentials.
      env {
        ENVIRONMENT    = "production"
        DATABASE_URL   = "postgresql+asyncpg://postgres:change-me@postgres.service.consul:5432/app_foundry"
        RESEND_API_KEY = ""
        EMAIL_FROM     = "App Foundry <noreply@example.com>"
        CORS_ORIGINS   = "https://example.com,https://app.example.com,https://admin.example.com"
      }

      resources {
        cpu    = 250
        memory = 256
      }

      service {
        name     = "api"
        port     = "http"
        provider = "nomad"

        check {
          type     = "http"
          path     = "/health"
          interval = "10s"
          timeout  = "3s"
        }
      }
    }
  }
}
