variable "project_id" {
  description = "Existing Google Cloud project owned by localhosthq.com."
  type        = string
  default     = "jewelo-cloud-lhq-20260827"
}

variable "region" {
  description = "Cloud Run, Artifact Registry, and build-log region."
  type        = string
  default     = "asia-south1"
}

variable "billing_account_id" {
  description = "Billing account used only to scope the project budget."
  type        = string
  sensitive   = true
}

variable "budget_currency" {
  description = "Billing-account currency for the monthly budget."
  type        = string
  default     = "USD"
}

variable "budget_units" {
  description = "Monthly GCP alert budget in budget_currency."
  type        = string
  default     = "100"
}

variable "github_repository" {
  description = "Repository allowed to exchange GitHub OIDC tokens."
  type        = string
  default     = "Sanchay-T/jewelo"
}

variable "github_repository_id" {
  description = "Immutable GitHub repository ID."
  type        = string
  default     = "1165745784"
}

variable "github_owner_id" {
  description = "Immutable GitHub owner ID."
  type        = string
  default     = "64085789"
}
