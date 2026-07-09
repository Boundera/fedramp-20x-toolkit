---
id: KSI-CNA-OFA
kind: ksi
family: CNA
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
  - KSI-CNA-RVP
  - KSI-CNA-EIS

oss_action_checks_this: false
---

## Plain English

This KSI asks whether your resources are actually built for high availability and rapid recovery — per resource, not per policy document. Three proof points:

1. **Every stateful resource runs in an HA configuration.** Multi-AZ databases, zone-redundant storage, regional (not zonal) Cloud SQL, multi-AZ auto-scaling groups.
2. **Recovery is provable per resource.** Point-in-time recovery, automated backups, versioning, and soft-delete are enabled where the resource supports them.
3. **Compute is not a snowflake.** EC2 instances sit behind a load balancer or in an auto-scaling group; a fleet of standalone instances fails.

Unlike most CNA indicators, this one is scored per resource: the score is passing resources over all evaluated resources across every connected cloud. One neglected single-AZ database pulls the score down even when the flagship workloads are fine — which is also the most common way CSPs fail it.

## Implementation: AWS

Per-resource checks (every matching resource is scored individually):

- **RDS** — instance is Multi-AZ.
- **DynamoDB** — point-in-time recovery enabled.
- **ElastiCache** — replication group has automatic failover or Multi-AZ enabled.
- **OpenSearch** — domain has zone awareness enabled (not single-AZ).
- **S3** — bucket versioning enabled.
- **EFS** — backup policy is `ENABLED`.
- **Auto Scaling** — group spans at least 2 availability zones.
- **EC2 compute HA** — a cross-resource summary that fails when EC2 instances run without any load balancer or auto-scaling group.

Org-level checks (any-pass — one is enough):

- **AWS Backup** — at least one backup plan with rules configured.
- **ELBv2** — at least one load balancer exists.

## Implementation: Azure

Per-resource checks:

- **Storage accounts** — replication SKU is zone- or geo-redundant (ZRS/GRS/RA-GRS/GZRS families), not locally redundant only; and blob soft-delete or a container delete-retention policy is enabled (two separate assertions).
- **SQL Database** — zone-redundant.
- **MySQL Flexible Server** — HA mode `ZoneRedundant` or `SameZone`, or geo-redundant backup enabled.
- **PostgreSQL Flexible Server** — same condition as MySQL.

Org-level check (any-pass):

- **Recovery Services vault** — a vault with backup-protected items or backup policies.

## Implementation: GCP

Per-resource checks:

- **Cloud SQL** — automated backups enabled; and availability type is `REGIONAL` rather than `ZONAL` (two separate assertions).
- **Cloud Storage** — versioning or a lifecycle policy configured; and soft-delete enabled (two separate assertions).

## Evidence example

Passing evidence shows per-resource HA and recovery configuration. Per-resource signals count every matching resource in the score; the three org-level signals (`aws:backup`, `aws:elbv2`, `azure:recovery`) are any-pass.

- `aws:rds` — Multi-AZ per instance. `aws:dynamodb` — PITR per table. `aws:elasticache` — failover/Multi-AZ per replication group. `aws:opensearch` — zone awareness per domain. `aws:s3_buckets` — versioning per bucket. `aws:efs` — backup policy per file system. `aws:autoscaling` — ≥2 AZs per group. `aws:ec2_compute_ha` — account-level summary that EC2 has LB/ASG infrastructure.
- `aws:backup` — a backup plan with rules exists. `aws:elbv2` — a load balancer exists.
- `azure:storage_accounts` — geo/zone-redundant replication and soft-delete (two assertions per account). `azure:recovery` — a Recovery Services vault with items or policies. `azure:sql_ha` — zone redundancy per database. `azure:mysql_ha` / `azure:postgresql_ha` — HA mode or geo-redundant backup per server.
- `gcp:cloudsql` — automated backups per instance. `gcp:cloudsql_ha` — `REGIONAL` availability per instance. `gcp:storage_buckets` — versioning/lifecycle and soft-delete (two assertions per bucket).

Evidence is refreshed on every connector scan; there is no manual-upload path for this KSI.

## Common gaps

1. **Single-AZ databases.** RDS without Multi-AZ, Cloud SQL on `ZONAL` availability, Azure SQL without zone redundancy — the most frequent per-resource failures.
2. **Tables and buckets without recovery settings.** DynamoDB without PITR, S3 without versioning, GCS without soft-delete: each one is a scored failure, not a footnote.
3. **Standalone EC2.** Instances running with no load balancer and no auto-scaling group fail the `aws:ec2_compute_ha` summary — there is no failover story for that compute.
4. **Locally-redundant Azure storage.** LRS-only replication fails the geo-redundancy assertion; one zone outage means data unavailability.
5. **Backup services present but empty.** A Recovery Services vault with nothing protected, or an AWS Backup plan with no rules, does not pass the org-level checks.

## Notes for Boundera customers

Boundera evaluates KSI-CNA-OFA per resource across AWS, Azure, and GCP — twenty assertions spanning `aws:rds`, `aws:dynamodb`, `aws:elasticache`, `aws:opensearch`, `aws:s3_buckets`, `aws:efs`, `aws:autoscaling`, `aws:ec2_compute_ha`, `aws:backup`, `aws:elbv2`, `azure:storage_accounts`, `azure:recovery`, `azure:sql_ha`, `azure:mysql_ha`, `azure:postgresql_ha`, `gcp:cloudsql`, `gcp:cloudsql_ha`, and `gcp:storage_buckets`. Every non-HA resource is listed with the exact reason it failed, so the finding list is a ready-made availability backlog. Your setup work is connecting the cloud accounts. [Request a demo](https://boundera.io/request-demo) to watch KSI-CNA-OFA score your real databases, buckets, and auto-scaling groups for HA and recovery, resource by resource.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-OFA"]`)
- NIST SP 800-53 Rev 5: none mapped upstream (the FRMR entry lists no controls for this indicator)
