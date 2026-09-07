output "project_number" {
  value = data.google_project.current.number
}

output "artifact_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.jewelo.repository_id}"
}

output "build_service_account" {
  value = google_service_account.build.email
}

output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "staging_deployer_service_account" {
  value = google_service_account.deployer["staging"].email
}

output "production_deployer_service_account" {
  value = google_service_account.deployer["production"].email
}

output "staging_runtime_service_account" {
  value = google_service_account.runtime["staging"].email
}

output "production_runtime_service_account" {
  value = google_service_account.runtime["production"].email
}
