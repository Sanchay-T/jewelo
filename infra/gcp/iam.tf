resource "google_service_account" "build" {
  account_id   = "jewelo-build"
  display_name = "Jewelo Cloud Build"
}

resource "google_service_account" "runtime" {
  for_each = local.environments

  account_id   = "jewelo-runtime-${each.key}"
  display_name = "Jewelo ${title(each.key)} Runtime"
}

resource "google_service_account" "deployer" {
  for_each = local.environments

  account_id   = "jewelo-deploy-${each.key}"
  display_name = "Jewelo ${title(each.key)} GitHub Deployer"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-jewelo"
  display_name              = "GitHub Jewelo"
  description               = "Keyless GitHub Actions authentication for Jewelo"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.ref"                 = "assertion.ref"
  }

  attribute_condition = "assertion.repository_id == '${var.github_repository_id}' && assertion.repository_owner_id == '${var.github_owner_id}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

locals {
  deployer_project_roles = toset([
    "roles/cloudbuild.builds.editor",
    "roles/run.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  build_project_roles = toset([
    "roles/artifactregistry.writer",
    "roles/logging.logWriter",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  deployer_role_pairs = {
    for pair in setproduct(local.environments, local.deployer_project_roles) :
    "${pair[0]}:${pair[1]}" => {
      environment = pair[0]
      role        = pair[1]
    }
  }
}

resource "google_project_iam_member" "deployer" {
  for_each = local.deployer_role_pairs

  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.deployer[each.value.environment].email}"
}

resource "google_project_iam_member" "build" {
  for_each = local.build_project_roles

  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.build.email}"
}

resource "google_storage_bucket_iam_member" "build_logs" {
  bucket = google_storage_bucket.build_logs.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.build.email}"
}

resource "google_service_account_iam_member" "deployer_can_use_build" {
  for_each = local.environments

  service_account_id = google_service_account.build.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[each.key].email}"
}

resource "google_service_account_iam_member" "deployer_can_use_runtime" {
  for_each = local.environments

  service_account_id = google_service_account.runtime[each.key].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[each.key].email}"
}

resource "google_service_account_iam_member" "github_environment" {
  for_each = {
    staging    = "Preview"
    production = "Production"
  }

  service_account_id = google_service_account.deployer[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/subject/repo:${var.github_repository}:environment:${each.value}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access" {
  for_each = local.config_pairs

  project   = var.project_id
  secret_id = google_secret_manager_secret.app_config[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.value.environment].email}"
}

resource "google_secret_manager_secret_iam_member" "deployer_view" {
  for_each = local.config_pairs

  project   = var.project_id
  secret_id = google_secret_manager_secret.app_config[each.key].secret_id
  role      = "roles/secretmanager.viewer"
  member    = "serviceAccount:${google_service_account.deployer[each.value.environment].email}"
}

resource "google_secret_manager_secret_iam_member" "build_access" {
  for_each = {
    for key, value in local.config_pairs : key => value
    if contains(local.build_config_names, value.env_name)
  }

  project   = var.project_id
  secret_id = google_secret_manager_secret.app_config[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.build.email}"
}
