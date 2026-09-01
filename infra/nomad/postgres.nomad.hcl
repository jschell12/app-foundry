# Bundled Postgres for small Nomad clusters. For production, prefer a
# managed database and point the api job's DATABASE_URL at it.
job "app-foundry-postgres" {
  datacenters = ["dc1"]
  type        = "service"

  group "db" {
    count = 1

    network {
      port "db" {
        static = 5432
      }
    }

    volume "pgdata" {
      type      = "host"
      source    = "pgdata" # define this host volume in your client config
      read_only = false
    }

    task "postgres" {
      driver = "docker"

      config {
        image = "postgres:17-alpine"
        ports = ["db"]
      }

      volume_mount {
        volume      = "pgdata"
        destination = "/var/lib/postgresql/data"
      }

      # Prefer Nomad Variables or Vault for real credentials.
      env {
        POSTGRES_USER     = "postgres"
        POSTGRES_PASSWORD = "change-me"
        POSTGRES_DB       = "app_foundry"
      }

      resources {
        cpu    = 500
        memory = 512
      }

      service {
        name     = "postgres"
        port     = "db"
        provider = "nomad"

        check {
          type     = "tcp"
          interval = "10s"
          timeout  = "2s"
        }
      }
    }
  }
}
