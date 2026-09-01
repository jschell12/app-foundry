# One parameterized job spec for all three frontends:
#   nomad job run -var app=marketing -var port=3000 web.nomad.hcl
#   nomad job run -var app=dashboard -var port=3001 web.nomad.hcl
#   nomad job run -var app=admin     -var port=3002 web.nomad.hcl

variable "app" {
  type        = string
  description = "Which frontend to deploy: marketing, dashboard, or admin"

  validation {
    condition     = contains(["marketing", "dashboard", "admin"], var.app)
    error_message = "app must be one of: marketing, dashboard, admin."
  }
}

variable "port" {
  type        = number
  description = "Static host port for this frontend"
}

job "app-foundry-web" {
  datacenters = ["dc1"]
  type        = "service"

  # One job instance per frontend
  name = "app-foundry-${var.app}"

  group "web" {
    count = 2

    network {
      port "http" {
        static = var.port
        to     = 80
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "ghcr.io/jschell12/app-foundry-${var.app}:latest" # replace with your registry
        ports = ["http"]
      }

      resources {
        cpu    = 100
        memory = 64
      }

      service {
        name     = var.app
        port     = "http"
        provider = "nomad"

        check {
          type     = "http"
          path     = "/"
          interval = "10s"
          timeout  = "3s"
        }
      }
    }
  }
}
