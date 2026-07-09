---
id: KSI-SVC-ASM
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
  - KSI-SVC-SIN
  - KSI-SVC-VCM

oss_action_checks_this: false
---

## Plain English

This KSI is about the lifecycle of keys, certificates, and secrets — automated, protected, rotated. You need to prove:

1. Every encryption key is enabled and rotates automatically — AWS KMS keys, Azure Key Vault keys, GCP Cloud KMS keys.
2. Application secrets rotate automatically (e.g., AWS Secrets Manager), instead of living unchanged for years.
3. Certificates are lifecycle-managed by a certificate service rather than tracked in a spreadsheet.
4. When a secret leaks into source code, it gets caught and remediated — secret-scanning alerts are resolved, not left open.

Scoring is per-resource: every key, secret, certificate, and alert must comply. The most common failure is a customer-managed KMS key that was created once, encrypts production data, and has never had rotation enabled.

## Implementation: AWS

The engine evaluates three AWS resource types:

- KMS keys (`aws:kms:keys`) pass when the key is enabled and rotation is handled — either the key is AWS-managed (rotation is automatic) or it is a customer key with `rotation_enabled` true. Independently checkable via Prowler's `kms_cmk_rotation_enabled`.
- Secrets Manager secrets (`aws:secretsmanager:secrets`) pass only when `rotation_enabled` is true; the last rotation date is captured in the evidence snapshot.
- ACM certificates (`aws:acm:certificates`) pass when they carry a recognized management type (`AMAZON_ISSUED`, `PRIVATE`, or `IMPORTED`) — presence in ACM demonstrates certificate lifecycle management, and days-to-expiration is snapshotted alongside.

## Implementation: Azure

Key Vault keys (`azure:keyvault:keys`) pass when the key is enabled. Note the honest limitation: the engine snapshots each key's `rotation_policy` as evidence but does not currently gate on it — Azure key rotation enforcement is weaker in the engine than the AWS and GCP equivalents. Independently checkable via Prowler's `keyvault_key_rotation_enabled`, which does gate on rotation policy.

## Implementation: GCP

Cloud KMS crypto keys (`gcp:kms:crypto_keys`) pass when a `rotation_period` is set on the key — a configured rotation period is GCP's automated-rotation mechanism. Keys without any rotation period fail with the project named in the reason. Independently checkable via Prowler's `kms_key_rotation_enabled`.

## Evidence example

Passing automated evidence contains, per resource, the fields the condition read plus collection timestamp:

- `aws:kms_keys` — key state, rotation flag, and whether the key is AWS-managed or customer-managed.
- `aws:secretsmanager` — rotation enabled flag and last rotated date per secret.
- `aws:acm_certificates` — certificate type, name, and expiration window.
- `azure:keyvault_keys` — enabled flag and the key's rotation policy.
- `gcp:kms_keys` — rotation period and project per crypto key.
- `github:secret_scanning` — every GitHub secret-scanning alert must be in `resolved` or `dismissed` state; an open alert is a failing resource with a "revoke and rotate immediately" reason. This signal is GitHub-specific — the engine has no GitLab or Bitbucket secret-scanning equivalent for this KSI.

All six signals are scored per-resource: one non-rotating key is one failing resource in the evidence package.

## Common gaps

1. **Customer-managed KMS keys without rotation.** Enabled and in daily use, `rotation_enabled` false — the single most frequent failing resource.
2. **Secrets Manager as storage, not rotation.** Secrets are centralized but `rotation_enabled` is false on most of them; centralizing without rotating fails the statement's "regular rotation" clause.
3. **GCP keys created without a rotation period.** Unlike AWS-managed keys, Cloud KMS keys have no rotation unless you set one — a missing `rotation_period` fails.
4. **Disabled Key Vault keys still in inventory.** A disabled key signals abandoned key material that was never cleaned up.
5. **Open secret-scanning alerts.** A leaked credential sitting in an open alert directly contradicts "protection of secrets is automated and persistently reviewed."

## Notes for Boundera customers

Boundera evaluates KSI-SVC-ASM per-resource across `aws:kms_keys`, `aws:secretsmanager`, `aws:acm_certificates`, `azure:keyvault_keys`, `gcp:kms_keys`, and `github:secret_scanning` — every key, secret, certificate, and leak alert appears individually in the evidence, so remediation is a worklist rather than a guess. Connect your AWS, Azure, GCP, and GitHub integrations and the engine keeps the inventory current on every scan. [Request a demo](https://boundera.io/request-demo) to watch KSI-SVC-ASM enumerate your real keys and flag exactly which ones are not rotating.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-ASM"]`)
- NIST SP 800-53 Rev 5: AC-17(2), IA-5(2), IA-5(6), SC-12, SC-17
- Prowler FedRAMP 20x mappings: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
