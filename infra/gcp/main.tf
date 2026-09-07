locals {
  services = toset([
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbilling.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "sts.googleapis.com",
  ])

  environments = toset(["staging", "production"])

  build_config_names = toset([
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_JEWELO_DATA_MODE",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_SENTRY_DSN",
  ])

  runtime_config_names = toset([
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SHOPIFY_STORE_DOMAIN",
    "SHOPIFY_CLIENT_ID",
    "SHOPIFY_CLIENT_SECRET",
    "SHOPIFY_WEBHOOK_SECRET",
    "OPERATOR_EMAIL",
    "OPERATOR_PASSPHRASE",
    "OPERATOR_SESSION_SECRET",
  ])

  all_config_names = setunion(local.build_config_names, local.runtime_config_names)
  config_pairs = {
    for pair in setproduct(local.environments, local.all_config_names) :
    "${pair[0]}:${pair[1]}" => {
      environment = pair[0]
      env_name    = pair[1]
      secret_id   = "${pair[0]}-${lower(replace(pair[1], "_", "-"))}"
    }
  }
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_service" "required" {
  for_each = local.services

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "jewelo" {
  location      = var.region
  repository_id = "jewelo"
  description   = "Immutable Jewelo web images"
  format        = "DOCKER"

  cleanup_policy_dry_run = true

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket" "build_logs" {
  name                        = "${var.project_id}-build-logs"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret" "app_config" {
  for_each = local.config_pairs

  secret_id = each.value.secret_id

  labels = {
    app         = "jewelo"
    environment = each.value.environment
    managed_by  = "terraform"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_billing_budget" "jewelo" {
  billing_account = var.billing_account_id
  display_name    = "Jewelo Cloud monthly budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency
      units         = var.budget_units
    }
  }

  dynamic "threshold_rules" {
    for_each = toset([0.5, 0.8, 1.0])
    content {
      threshold_percent = threshold_rules.value
      spend_basis       = "CURRENT_SPEND"
    }
  }

  depends_on = [google_project_service.required]
}
