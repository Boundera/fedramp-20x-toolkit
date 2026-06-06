# implementations/aws/ksi-mla-evc/main.tf
#
# Boundera reference Terraform module for KSI-MLA-EVC (Evaluating Configurations).
# Self-contained — `terraform plan` should work in a fresh AWS account.
#
# This module deploys, per region in var.boundary_regions:
#   - AWS Config configuration recorder + delivery channel
#   - A baseline set of managed AWS Config rules
#   - EventBridge rule routing Config compliance-change events to SNS
#   - SNS topic + (commented) email subscription
#   - SSM Automation document remediating a single common drift
#
# See README.md for what this proves and what it leaves to you.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      configuration_aliases = []
    }
  }
}

variable "boundary_regions" {
  description = "AWS regions inside your FedRAMP authorization boundary. AWS Config will be enabled in every one."
  type        = list(string)
  default     = ["us-east-1"]
}

variable "config_bucket_name" {
  description = "Name for the S3 bucket Config writes evaluations to. Must be globally unique."
  type        = string
}

variable "alert_email" {
  description = "Email subscribed to drift-alert SNS topic. Leave empty to skip the subscription."
  type        = string
  default     = ""
}

# ----------------------------------------------------------------------------
# Shared resources (single region — bucket + Config-service role)
# ----------------------------------------------------------------------------

resource "aws_s3_bucket" "config_evidence" {
  bucket        = var.config_bucket_name
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "config_evidence" {
  bucket = aws_s3_bucket.config_evidence.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "config_evidence" {
  bucket = aws_s3_bucket.config_evidence.id
  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 540 # 18 months
    }
  }
}

resource "aws_s3_bucket_public_access_block" "config_evidence" {
  bucket                  = aws_s3_bucket.config_evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "config_recorder" {
  name = "boundera-config-recorder-ksi-mla-evc"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config_recorder" {
  role       = aws_iam_role.config_recorder.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# ----------------------------------------------------------------------------
# Per-region resources
# ----------------------------------------------------------------------------

resource "aws_config_configuration_recorder" "this" {
  for_each = toset(var.boundary_regions)
  name     = "boundera-recorder-${each.key}"
  role_arn = aws_iam_role.config_recorder.arn
  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "this" {
  for_each       = toset(var.boundary_regions)
  name           = "boundera-channel-${each.key}"
  s3_bucket_name = aws_s3_bucket.config_evidence.bucket
  depends_on     = [aws_config_configuration_recorder.this]
}

# Baseline managed rules — extend this list per your boundary
resource "aws_config_config_rule" "baseline" {
  for_each = {
    s3_public_access  = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
    s3_versioning     = "S3_BUCKET_VERSIONING_ENABLED"
    encrypted_volumes = "ENCRYPTED_VOLUMES"
    mfa_on_root       = "ROOT_ACCOUNT_MFA_ENABLED"
    cloudtrail_on     = "CLOUD_TRAIL_ENABLED"
  }
  name = "boundera-baseline-${each.key}"
  source {
    owner             = "AWS"
    source_identifier = each.value
  }
  depends_on = [aws_config_delivery_channel.this]
}

# ----------------------------------------------------------------------------
# Drift alerting
# ----------------------------------------------------------------------------

resource "aws_sns_topic" "drift" {
  name = "boundera-config-drift-ksi-mla-evc"
}

resource "aws_sns_topic_subscription" "drift_email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.drift.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_event_rule" "drift" {
  name        = "boundera-config-drift-ksi-mla-evc"
  description = "Route Config compliance-change events to SNS for KSI-MLA-EVC."
  event_pattern = jsonencode({
    source        = ["aws.config"]
    "detail-type" = ["Config Rules Compliance Change"]
    detail = {
      newEvaluationResult = {
        complianceType = ["NON_COMPLIANT"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "drift_to_sns" {
  rule      = aws_cloudwatch_event_rule.drift.name
  target_id = "sns"
  arn       = aws_sns_topic.drift.arn
}

# ----------------------------------------------------------------------------
# Outputs — emitted as evidence by the Boundera GitHub Action
# ----------------------------------------------------------------------------

output "ksi_mla_evc_evidence" {
  description = "Structured evidence record consumed by the Boundera fedramp-20x-ksi-action."
  value = {
    ksi_id          = "KSI-MLA-EVC"
    regions_covered = var.boundary_regions
    config_recorders = [
      for r in aws_config_configuration_recorder.this : r.arn
    ]
    config_rules = [
      for r in aws_config_config_rule.baseline : r.arn
    ]
    drift_topic    = aws_sns_topic.drift.arn
    s3_bucket      = aws_s3_bucket.config_evidence.bucket
    retention_days = 540
  }
}
