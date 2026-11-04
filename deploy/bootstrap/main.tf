# Creates the R2 bucket that holds the main stack's state. Run once:
#
#   tofu init && tofu apply
#   # then move this module's own state into the bucket it just made:
#   tofu init -migrate-state -backend-config=../infra/backend.r2.hcl \
#     -backend-config='key=bootstrap/terraform.tfstate'
#
# Keeping the bootstrap state in the same bucket means nothing is left on a
# laptop. Its state holds no secrets, so it is not encrypted.

terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }
}

provider "cloudflare" {}

variable "cloudflare_account_id" {
  type = string
}

variable "bucket_name" {
  type    = string
  default = "app-foundry-demo-tfstate"
}

resource "cloudflare_r2_bucket" "state" {
  account_id = var.cloudflare_account_id
  name       = var.bucket_name
}

output "bucket" {
  value = cloudflare_r2_bucket.state.name
}
