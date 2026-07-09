---
id: KSI-RPL-ABO
kind: ksi
family: RPL
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
  - KSI-RPL-TRC
  - KSI-RPL-RRO
  - KSI-RPL-ARP

oss_action_checks_this: false
---

## Plain English

This KSI is about whether your backups match your stated recovery objectives — and whether you keep checking that they do. You need to prove:

1. Every data-bearing resource in your boundary has a backup or durability mechanism actually configured — backup plans with rules, object versioning, soft-delete — not just a policy that says backups should exist.
2. The backup settings (frequency, retention, redundancy) trace to your documented RTO and RPO. A backup plan whose retention was never compared to your RPO does not demonstrate alignment.
3. The review of that alignment is ongoing. "Persistently" means the comparison between backup configuration and objectives keeps happening as resources are added and objectives change — not a one-time setup exercise.

The most common way CSPs fail this KSI: backups were enabled ad hoc, per team, with provider defaults — and nobody can show how those settings map to the recovery objectives in KSI-RPL-RRO.

## Implementation: AWS

The engine inspects two AWS resource types on every scan:

- **AWS Backup plans** (`aws:backup:backup_plans`) — each discovered plan must carry backup rules (schedule + lifecycle). A plan record with no rules and no plan ID fails with "has no backup rules configured". Centralize backups in AWS Backup rather than per-service snapshot scripts so the plan, its rules, and its selections are inspectable in one place.
- **S3 buckets** (`aws:s3:buckets`) — every bucket must have versioning enabled. Versioning is the point-in-time durability mechanism the engine accepts for object storage; a bucket with versioning suspended or never enabled fails individually.

Independently checkable via Prowler: `rds_instance_backup_enabled`, `efs_have_backup_enabled`, `dynamodb_tables_pitr_enabled`, `redshift_cluster_automated_snapshot`.

## Implementation: Azure

The engine inspects storage accounts (`azure:storage:storage_accounts`): each account passes if blob soft-delete is enabled **or** a backup policy protects it. An account with neither fails with "has no soft-delete or backup policy". Enable blob soft-delete at the account level, and use Azure Backup vault policies for VM and file-share workloads.

Independently checkable via Prowler: `vm_backup_enabled`, `storage_ensure_soft_delete_is_enabled`, `storage_geo_redundant_enabled`, `vm_sufficient_daily_backup_retention_period`.

## Implementation: GCP

The engine inspects Cloud Storage buckets (`gcp:cloudstorage:buckets`): each bucket passes if object versioning is enabled **or** lifecycle rules are configured. A bucket with neither fails with "has no versioning or lifecycle policy". Turn on versioning for buckets holding recoverable data, and pair it with lifecycle rules so noncurrent versions age out on a schedule you chose against your RPO — not by accident.

Independently checkable via Prowler: `cloudsql_instance_automated_backups`, `cloudstorage_bucket_versioning_enabled`, `cloudstorage_bucket_lifecycle_management_enabled`.

## Evidence example

Passing automated evidence for KSI-RPL-ABO contains four signals, each scored per resource (every matching resource in the boundary is tested individually, and the score is passing/total):

- `aws:backup` — asserts each AWS Backup plan has backup rules configured (or at minimum a registered plan ID)
- `aws:s3_buckets` — asserts each S3 bucket has versioning enabled; the evidence snapshot records the bucket's `versioning` flag and `name`
- `azure:storage_accounts` — asserts each storage account has blob soft-delete enabled or a backup policy attached
- `gcp:storage_buckets` — asserts each bucket has versioning enabled or lifecycle rules configured

Each entry carries the resource ID and its `collected_at` timestamp from the connector scan. There is no fixed staleness window on these cloud signals — evidence recency is driven by your scan cadence, so keep connector scans running on schedule.

## Common gaps

1. **S3 buckets without versioning.** The single most frequent per-resource failure — one team's logging or scratch bucket without versioning drags the score down, because every bucket in the boundary is evaluated.
2. **Azure storage accounts with neither soft-delete nor backup.** Accounts created before the org standardized on soft-delete tend to linger; each one fails individually.
3. **GCP buckets with no versioning and no lifecycle rules.** Buckets created with gcloud defaults have neither; each fails until one of the two is configured.
4. **Backups exist, alignment doesn't.** The engine verifies the mechanisms are configured; it cannot verify your retention matches your RPO. Assessors will put your backup rule retention next to your documented objectives — if 7-day retention meets a 30-day RPO claim, the KSI fails on paper even with green automation.
5. **Green by absence.** A signal with zero matching resources contributes nothing rather than failing — a boundary with no AWS Backup plans at all produces no `aws:backup` evidence. Assessors notice missing evidence for resource types you claim to run; make sure every in-scope data store is actually discovered.

## Notes for Boundera customers

Boundera evaluates KSI-RPL-ABO automatically across all three clouds on every connector scan: `aws:backup` (Backup plan rules), `aws:s3_buckets` (versioning), `azure:storage_accounts` (soft-delete or backup policy), and `gcp:storage_buckets` (versioning or lifecycle rules). Scoring is per resource, so the dashboard shows exactly which bucket, account, or plan is failing and why.

What still needs you: connect the AWS, Azure, and GCP connectors for every account/subscription/project in your boundary, and document your RTO/RPO (KSI-RPL-RRO) so the alignment half of this indicator has something to align to — the engine proves the backup mechanisms; the objectives comparison is yours to document.

[Request a demo](https://boundera.io/request-demo) to watch KSI-RPL-ABO evaluate your real buckets, storage accounts, and backup plans resource-by-resource.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.RPL.indicators["KSI-RPL-ABO"]`
- NIST SP 800-53 Rev 5: CM-2(3), CP-6, CP-9, CP-10, CP-10(2), SI-12
- Prowler KSI mapping (prowler-cloud/prowler#11701, unmerged, aligned 2026.06.24.01)
