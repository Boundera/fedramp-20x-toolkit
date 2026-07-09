---
id: KSI-SVC-SIN
kind: ksi
family: SVC
last_reviewed_upstream_version: "2026-07-06-7227d7f"
last_reviewed_by: eddy@boundera.io
last_reviewed_on: "2026-07-09"
confidence: medium

authors:
  - name: Eddy Agu
    role: Founder, Boundera
    github: chukyjack

sme_reviewed: false

related_ksis:
  - KSI-SVC-ASM
  - KSI-SVC-VCM

oss_action_checks_this: false
---

## Plain English

KSI-SVC-SIN is one of the net-new indicators in the 2026 consolidated rules. It asks you to prove information is encrypted — or otherwise secured — against unwanted access and modification, and Boundera's engine evaluates it as two halves, per resource:

1. **In transit (SC-8):** every externally reachable path enforces TLS — load balancers, storage endpoints, app services, and managed databases across AWS, Azure, and GCP, with TLS 1.2 as the floor where a version is configurable.
2. **At rest (SC-28):** every data store is encrypted — and several signals deliberately demand more than the platform default: DynamoDB must use a KMS customer-managed key, Azure Storage must have infrastructure (double) encryption, and BigQuery must use CMEK.

Scoring is per-resource: one load balancer with a plain-HTTP listener or one unencrypted RDS instance is a failing resource. The most common failure is relying on provider-default encryption where a signal explicitly requires customer-managed or double encryption.

## Implementation: AWS

In transit, the engine checks: application load balancers (`aws:elbv2:loadbalancersv2`, filtered to ALBs — network load balancers are excluded from this signal) for HTTPS/TLS listeners or an HTTP-to-HTTPS redirect; S3 bucket policies for a `Deny` statement on insecure transport (`aws:SecureTransport: false`); Redshift `require_ssl`; ElastiCache transit encryption; and OpenSearch `enforce_https`. At rest: S3 default encryption, RDS storage encryption, EFS encryption, OpenSearch encryption at rest, DynamoDB KMS-CMK encryption, CloudTrail KMS encryption, and Redshift and ElastiCache encryption.

Per the engine's own notes, EBS volume and CloudWatch-log at-rest checks, plus CloudFront/classic-ELB/API-Gateway transport checks, are deferred until the connector emits those fields — the engine does not pretend to cover them.

## Implementation: Azure

In transit: App Services must redirect HTTP to HTTPS (`https_only`), enforce minimum TLS 1.2, and (as a separate assertion) require client certificates; storage accounts must require secure transfer and minimum TLS 1.2; PostgreSQL flexible servers must enforce SSL (`require_secure_transport` ON); MySQL flexible servers must require secure transport and TLS 1.2+; SQL Server must enforce a minimal TLS version of 1.2+. At rest: storage accounts must have infrastructure (double) encryption enabled — standard service-side encryption alone does not pass that assertion.

## Implementation: GCP

In transit: Cloud SQL instances (`gcp:cloudsql:instances`) must require SSL — `ssl_mode` of `ALLOW_UNENCRYPTED_AND_ENCRYPTED` fails, and when the mode is unspecified the engine falls back to the `require_ssl` flag. At rest: BigQuery datasets must be encrypted with a customer-managed key (`cmk_encryption`). This is the only GCP at-rest field the collected connector data exposes; Cloud Storage and Cloud SQL storage are Google-default-encrypted with no CMEK field collected, so the engine does not check them rather than fake a result.

## Evidence example

Passing evidence enumerates every in-scope resource against its assertion, with the exact fields the condition read:

- Transport: `aws:elbv2` (listener protocols and redirect rules), `aws:s3_buckets` (the secure-transport deny policy), `aws:redshift` (`require_ssl`), `aws:elasticache` (transit encryption), `aws:opensearch` (`enforce_https`), `azure:app` (HTTPS-only, minimum TLS, client certificate mode), `azure:storage_accounts` (secure transfer, minimum TLS), `azure:postgresql`, `azure:mysql`, `azure:sql` (SSL/TLS enforcement), `gcp:cloudsql` (`ssl_mode` / `require_ssl`).
- At rest: `aws:s3_buckets` (default encryption), `aws:rds`, `aws:efs`, `aws:opensearch`, `aws:dynamodb` (KMS CMK), `aws:cloudtrail` (KMS key), `aws:redshift`, `aws:elasticache`, `azure:storage_accounts` (infrastructure encryption), `gcp:bigquery` (CMEK).

All assertions are per-resource; there is no any-pass shortcut. Evidence reflects the latest connector scan.

## Common gaps

1. **An ALB listener still on plain HTTP.** No HTTPS/TLS protocol and no redirect action to HTTPS — the single most visible transport failure.
2. **S3 buckets missing the secure-transport deny.** Default encryption is on, but the bucket policy has no `Deny` for `aws:SecureTransport: false` — the transport assertion fails independently of the at-rest one.
3. **Default encryption where the signal wants customer-managed.** DynamoDB on AWS-owned keys, Azure Storage without infrastructure encryption, and BigQuery without CMEK all fail even though the platform encrypts by default.
4. **TLS floors below 1.2.** App Services, storage accounts, and SQL servers with an unset or pre-1.2 minimum TLS version fail their TLS assertions.
5. **Cloud SQL accepting unencrypted connections.** `ssl_mode` left at `ALLOW_UNENCRYPTED_AND_ENCRYPTED` (or `require_ssl` unset on legacy instances) fails.

## Notes for Boundera customers

Boundera evaluates KSI-SVC-SIN across roughly two dozen assertions spanning `aws:elbv2`, `aws:s3_buckets`, `aws:rds`, `aws:efs`, `aws:opensearch`, `aws:dynamodb`, `aws:cloudtrail`, `aws:redshift`, `aws:elasticache`, `azure:app`, `azure:storage_accounts`, `azure:postgresql`, `azure:mysql`, `azure:sql`, `gcp:cloudsql`, and `gcp:bigquery` — every resource is checked for both its transport and at-rest posture where fields exist, and the engine documents what it deliberately does not yet check instead of inflating coverage. Connect your cloud accounts and the full encryption inventory builds itself. [Request a demo](https://boundera.io/request-demo) to watch KSI-SVC-SIN sweep your real buckets, databases, and load balancers and show exactly which resources fail which encryption assertion.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-SIN"]`)
- NIST SP 800-53 Rev 5: AC-1, AC-17(2), CP-9(8), SC-8, SC-8(1), SC-13, SC-20, SC-21, SC-22, SC-23, SC-28, SC-28(1)
