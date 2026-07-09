---
id: KSI-CNA-IBP
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
  - KSI-CNA-DFP
  - KSI-CNA-EIS
  - KSI-CNA-MAT

oss_action_checks_this: false
---

## Plain English

This KSI asks whether your use of third-party machine-based resources — in practice, your cloud services — is persistently compared against the provider's own best practices. Two proof points:

1. **The provider's best-practice tooling is running.** AWS Security Hub, Well-Architected, and Trusted Advisor; Azure Defender for Cloud, Advisor, and Policy; GCP Security Command Center, Recommender, and Cloud Asset Inventory. These are the mechanisms each provider ships for exactly this comparison.
2. **Your service configurations actually follow the provider's published guidance.** Public access blocked on storage, databases encrypted and private, IMDSv2 enforced, supported runtimes, TLS 1.2 minimums, purge protection on key vaults — the flagship recommendations from each provider's own baseline.

The most common way CSPs fail it: the advisory tooling is enabled (so the dashboard looks green) but flagship misconfigurations remain in the estate — an S3 bucket missing Block Public Access settings, a Lambda on a deprecated runtime. The engine checks both the tooling and the configurations.

## Implementation: AWS

Tool presence:

- **Security Hub** — hub status must be `ACTIVE`.
- **Well-Architected** — at least one registered workload.
- **Trusted Advisor** — checks are available (requires a support plan that exposes them).

Service configurations the engine inspects:

- **S3** — all four Block Public Access settings enabled per bucket.
- **RDS** — instances encrypted at rest and not publicly accessible.
- **EC2** — instances require IMDSv2 (`http_tokens: required`).
- **EKS** — clusters have private endpoint access enabled.
- **GuardDuty** — a detector is enabled.
- **VPC** — flow logs enabled.
- **Lambda** — no function on a deprecated runtime (the engine maintains an explicit end-of-life list including `python2.7`–`python3.7`, `nodejs10.x`–`nodejs14.x`, `dotnetcore2.1`–`dotnet5.0`, `ruby2.5`/`ruby2.7`, `java8`, `go1.x`).

Independently checkable via the upstream Prowler 20x mapping: `eks_cluster_uses_a_supported_version`.

## Implementation: Azure

Tool presence:

- **Defender for Cloud** — active with a nonzero max secure score.
- **Advisor** — accessible for the subscription.
- **Azure Policy** — at least one assignment in enforcement mode (`Default`).

Service configurations the engine inspects:

- **Storage accounts** — HTTPS-only traffic enforced, and minimum TLS version at least `TLS1_2` (two separate assertions).
- **SQL Server** — auditing enabled (at least one auditing policy in `Enabled` state).
- **Key Vault** — purge protection enabled.
- **AKS** — Kubernetes RBAC enabled.
- **Virtual machines** — Trusted Launch secure boot enabled.

Independently checkable via the upstream Prowler 20x mapping: `keyvault_private_endpoints`, `cosmosdb_account_use_private_endpoints`.

## Implementation: GCP

Tool presence:

- **Recommender** — accessible for the project.
- **Security Command Center** — enabled.
- **Cloud Asset Inventory** — accessible.

Service configurations the engine inspects:

- **Cloud SQL** — SSL required and no public IP assigned (two separate assertions).
- **GKE** — private cluster (private endpoint enabled).
- **Cloud Storage** — uniform bucket-level access.
- **Compute Engine** — interactive serial port access disabled (the engine parses instance metadata for `serial-port-enable`).

Independently checkable via the upstream Prowler 20x mapping: `gke_cluster_no_default_service_account`.

## Evidence example

Passing evidence combines tool-presence and service-configuration signals. Every signal here is any-pass — one conforming resource satisfies it — and each signal with evidence contributes one point to the score. Non-conforming resources are still individually listed so you see every improvement option.

- AWS: `aws:securityhub`, `aws:wellarchitected`, `aws:trusted_advisor`, `aws:s3_buckets`, `aws:rds`, `aws:ec2_instances`, `aws:eks`, `aws:guardduty`, `aws:vpc`, `aws:lambda`
- Azure: `azure:defender_secure_score`, `azure:advisor`, `azure:policy`, `azure:storage_accounts` (HTTPS-only and TLS 1.2 as separate assertions), `azure:sql`, `azure:key_vault`, `azure:aks`, `azure:vm`
- GCP: `gcp:recommender`, `gcp:scc`, `gcp:cloudasset`, `gcp:cloudsql` (SSL and no-public-IP as separate assertions), `gcp:gke`, `gcp:storage_buckets`, `gcp:compute_instances`

Evidence is refreshed on every connector scan; there is no manual-upload path for this KSI.

## Common gaps

1. **The provider's security service was never enabled.** No Security Hub, no Defender for Cloud, no SCC — the "persistent comparison" mechanism simply does not exist in the account.
2. **Deprecated Lambda runtimes still deployed.** Functions on `python3.7`, `nodejs14.x`, `go1.x`, and similar runtimes no longer receive patches and fail the runtime assertion.
3. **Storage accepting weak transport.** Azure storage accounts that permit TLS below 1.2 or non-HTTPS traffic fail two separate assertions.
4. **Key Vaults without purge protection.** A deleted-and-purged vault is unrecoverable; the provider's own guidance says to enable it, and the engine checks for exactly that.
5. **EC2 fleet not enforcing IMDSv2.** Instances with `http_tokens` not set to `required` leave the metadata service open to SSRF-style credential theft.

## Notes for Boundera customers

Boundera evaluates KSI-CNA-IBP automatically across all three clouds — roughly two dozen assertions spanning tool presence (`aws:securityhub`, `azure:defender_secure_score`, `gcp:scc`, and peers) and service configurations (`aws:s3_buckets`, `azure:storage_accounts`, `gcp:cloudsql`, and the rest listed above). Any-pass scoring means one conforming resource satisfies each assertion, but every non-conforming resource is surfaced with a specific reason, so the failing list doubles as your remediation backlog. Your setup work is connecting the cloud accounts in your boundary. [Request a demo](https://boundera.io/request-demo) to watch KSI-CNA-IBP compare your real estate against provider best practices, from Security Hub status down to individual Lambda runtimes.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-IBP"]`)
- NIST SP 800-53 Rev 5: AC-17(3), CM-2, PL-10
- Prowler 20x KSI mapping: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
