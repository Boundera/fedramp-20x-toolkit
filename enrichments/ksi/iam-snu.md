---
id: KSI-IAM-SNU
kind: ksi
family: IAM
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
  - KSI-IAM-JIT
  - KSI-IAM-AAM
  - KSI-IAM-APM

oss_action_checks_this: false
---

## Plain English

Humans get MFA; machines get this KSI. You need to show that every non-user identity — service accounts, workload identities, application identities — authenticates securely:

1. **Platform-issued credentials over embedded secrets.** Services authenticate by assuming roles (AWS), running as managed identities/service principals (Azure), or using workload identity (GCP) — not with a static key pasted into config.
2. **Where static credentials exist, they rotate.** Programmatic-only AWS users acting as service accounts must rotate any active access key within 90 days.
3. **Machine identities are scoped and dedicated.** Azure service-principal and managed-identity role assignments are never granted at root (`/`) scope, and GCP workloads run as dedicated service accounts — not the auto-provisioned default Compute Engine SA with no user-managed keys attached.

The most common failure: a "service user" created years ago with an access key that has never rotated — a permanent password for a robot, embedded in something nobody remembers.

## Implementation: AWS

- **IAM roles** — the existence of well-formed roles (ARN + name) proves the role-assumption path services should use; this is any-pass, since one healthy role demonstrates the mechanism.
- **Credential report** — users *without* console passwords are treated as service accounts: any active access key must have been rotated within 90 days. Console users pass here — they are evaluated by the user-authentication KSIs instead, so the two never double-count.

Independently checkable via Prowler: `iam_rotate_access_key_90_days`, `iam_user_two_active_access_key`.

## Implementation: Azure

- **Role assignments** — assignments whose principal is a `ServicePrincipal` or `ManagedIdentity` must be scoped below root: a machine identity bound at `/` has unrestricted reach. User and group assignments pass through untouched — they are out of scope for non-user authentication.

Independently checkable via Prowler: `app_register_with_identity`, `app_function_identity_is_configured`.

## Implementation: GCP

- **Service account keys** — no `USER_MANAGED` keys on any service account; those are the long-lived static credentials this KSI exists to eliminate. No keys at all (workload identity / impersonation) or only Google-rotated system keys passes.
- **Dedicated service accounts** — at least one non-default service account must exist (any-pass): a project whose only SA is `*-compute@developer.gserviceaccount.com` is running everything as the auto-provisioned default.

Independently checkable via Prowler: `iam_sa_no_user_managed_keys`, `iam_sa_user_managed_key_rotate_90_days`, `apikeys_key_rotated_in_90_days`.

## Evidence example

A passing automated package contains:

- `aws:iam_roles` — any-pass: role-based service authentication is available and configured
- `aws:credential_report` — per-resource: every programmatic-only user's active keys rotated within 90 days (console users explicitly out of scope)
- `azure:iam` — per-resource: every ServicePrincipal/ManagedIdentity role assignment scoped below root
- `gcp:iam` — two assertions: per-SA absence of user-managed keys, and (any-pass) at least one dedicated non-default-compute service account

All connector-driven, re-evaluated each scan — which is what the statement's "persistently reviewed" requires. No manual-evidence path on this KSI.

## Common gaps

1. **Unrotated service-user keys.** The classic: a programmatic AWS user whose key predates the compliance program. Anything past 90 days fails, per key slot.
2. **User-managed GCP SA keys.** Downloaded JSON key files that never expire — replace with workload identity or SA impersonation; Google-rotated system keys are fine.
3. **Default compute SA as the workload identity.** Every VM in the project running as the auto-created default SA — no dedicated SA means no least-privilege story for machines.
4. **Root-scoped machine identities.** An Azure service principal granted a role at `/` — one assignment giving a non-user identity tenant-wide reach.
5. **No role-assumption path at all.** An AWS account where services authenticate exclusively through IAM-user access keys because no roles were ever built for them.

## Notes for Boundera customers

Boundera evaluates KSI-IAM-SNU automatically from `aws:iam_roles`, `aws:credential_report`, `azure:iam`, and `gcp:iam` — all three clouds, per-resource, with console users and human role assignments filtered out so findings are genuinely about machine identities. Three coverage limits are tracked openly rather than glossed: per-VM detection of the GCP default compute SA awaits populated compute-instance data, Azure VM/Function managed-identity verification awaits verifiable connector fields, and Okta API-token expiration for service users cannot yet be enforced (the connector does not expose `userType`).

What you bring: connected AWS/Azure/GCP, plus the rotation and workload-identity migrations the findings point at. [Request a demo](https://boundera.io/request-demo) to watch KSI-IAM-SNU sweep your real service accounts — unrotated keys and user-managed SA keys are named individually on the first scan.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.IAM.indicators["KSI-IAM-SNU"]`
- NIST SP 800-53 Rev 5: AC-2, AC-2(2), AC-4, AC-6(5), IA-3, IA-5(2), RA-5(5)
- Prowler FedRAMP 20x mapping (prowler-cloud/prowler#11701, unmerged): per-provider check IDs cited above
