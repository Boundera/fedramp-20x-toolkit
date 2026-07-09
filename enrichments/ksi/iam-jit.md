---
id: KSI-IAM-JIT
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
  - KSI-IAM-ELP
  - KSI-IAM-SNU
  - KSI-IAM-APM

oss_action_checks_this: false
---

## Plain English

The statement names three properties of one authorization model, and you have to prove all three:

1. **Least-privileged** — no admin/wildcard policies on AWS users, no Azure Global Administrators, no GCP project-level owner/editor bindings, and a root account that holds no access keys and has MFA.
2. **Role and attribute-based** — privileges arrive through groups and roles, not direct grants: AWS users carry zero directly attached or inline policies, and your IdP shows group-based access control.
3. **Just-in-time** — no standing static credentials: any active AWS access key must be both rotated *and* used within 90 days, no user holds two active keys at once, and GCP service accounts carry no long-lived user-managed keys. The JIT *tooling* itself — Azure PIM, AWS Identity Center session policies, a PAM product — is proven with uploaded evidence, because no cloud API attests that elevation is time-boxed.

The most common failure is failing pillars 2 and 3 in one resource: an IAM user with directly attached policies *and* a years-old access key — standing privilege delivered the standing way.

## Implementation: AWS

AWS carries the most assertions because the credential report exposes standing-credential state directly:

- **Users** — no `AdministratorAccess`/wildcard attached policy (pillar 1); no directly attached or inline policies at all — privileges must come via groups/roles (pillar 2).
- **Root account** — no active access keys, and MFA active (pillar 1).
- **Access keys** — every active key rotated *and* used within 90 days; a key nobody uses is standing privilege with no owner. Users with no active keys pass outright.
- **Key accumulation** — both key slots active simultaneously fails; the second slot is for rotation, not for a spare credential.

Independently checkable via Prowler: `iam_policy_attached_only_to_group_or_roles`, `iam_aws_attached_policy_no_administrative_privileges`, `iam_inline_policy_no_administrative_privileges`, `iam_no_custom_policy_permissive_role_assumption`.

## Implementation: Azure

- **Entra users** — no Global Administrator role: standing tenant-wide privilege is the opposite of just-in-time; PIM-eligible (not permanently active) assignments are the target state, evidenced through the manual upload below.

Known engine gap, stated plainly: a pillar-3 signal for Azure managed identities is deliberately omitted because the connector data (VM and Function App identity fields) is not yet verifiable — Azure JIT tooling (PIM) is covered by the manual evidence path instead. Independently checkable via Prowler: `entra_global_admin_in_less_than_five_users`, `iam_subscription_roles_owner_custom_not_created`, `iam_role_user_access_admin_restricted`.

## Implementation: GCP

- **Project bindings** — no `roles/owner` or `roles/editor` at project level (pillar 1).
- **Service accounts** — no `USER_MANAGED` keys (pillar 3): a user-managed SA key is a non-expiring credential, the direct opposite of just-in-time; workload identity or impersonation with Google-rotated keys passes.

Independently checkable via Prowler: `iam_no_service_roles_at_project_level`, `iam_sa_no_administrative_privileges`, `iam_role_sa_enforce_separation_of_duties`.

## Evidence example

A passing package combines per-resource connector verdicts with one uploaded artifact:

- `aws:iam_users` — two assertions: no admin/wildcard policy, and no direct policy attachments (privileges via groups/roles)
- `aws:credential_report` — four assertions: root has no active access keys, root has MFA, active keys are rotated and used within 90 days, and no user has both key slots active
- `azure:entra_users` — no Global Administrator assignments
- `gcp:iam` — two assertions: no project-level owner/editor bindings, and service accounts free of user-managed keys
- `okta:groups` — any-pass: at least one well-formed group proves the role-based structure (pillar 2)
- `manual:jit_access_evidence` — required upload covering the JIT tooling itself (PIM configuration, Identity Center session policies, PAM elevation workflow); a missing upload is a failing assertion, and evidence older than 365 days fails freshness

Note the overlap with KSI-IAM-ELP is intentional — each KSI stands alone with its own evidence package.

## Common gaps

1. **Root with a live access key.** The single worst standing credential; the root assertions are absolute, not proportional.
2. **Active-but-idle keys.** Keys rotated on schedule but unused for months, or used daily but never rotated — the engine requires *both* within 90 days, and most orgs check only one.
3. **Two active keys per user.** Rotation started, old key never deactivated — credential accumulation that reads as standing privilege.
4. **Direct policy attachments.** Per-user grants that bypass the role/group model; even correctly-scoped ones fail pillar 2 because the *model* is what is being assessed.
5. **No JIT tooling evidence.** Connectors can prove the absence of standing credentials, but not that elevation is time-boxed — no `manual:jit_access_evidence` upload (or one older than a year) fails the KSI even with clean clouds.

## Notes for Boundera customers

Boundera automates the connector side of KSI-IAM-JIT across all three clouds and your IdP — `aws:iam_users`, `aws:credential_report`, `azure:entra_users`, `gcp:iam`, `okta:groups` — with per-resource scoring that names each violating user, key, and binding. You provide two things: connected AWS/Azure/GCP/Okta, and a current `manual:jit_access_evidence` upload documenting your PIM / Identity Center / PAM configuration (the engine enforces 365-day freshness so it cannot silently go stale).

[Request a demo](https://boundera.io/request-demo) to watch KSI-IAM-JIT dissect your real credential report — stale keys, double-active keys, and direct attachments surface per user on the first scan.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.IAM.indicators["KSI-IAM-JIT"]`
- NIST SP 800-53 Rev 5: AC-2, AC-2(1), AC-2(2), AC-2(3), AC-2(4), AC-2(6), AC-3, AC-4, AC-5, AC-6, AC-6(1), AC-6(2), AC-6(5), AC-6(7), AC-6(9), AC-6(10), AC-7, AC-20(1), AC-17, AU-9(4), CM-5, CM-7, CM-7(2), CM-7(5), CM-9, IA-4, IA-4(4), IA-7, PS-2, PS-3, PS-4, PS-5, PS-6, PS-9, RA-5(5), SC-2, SC-23, SC-39
- Prowler FedRAMP 20x mapping (prowler-cloud/prowler#11701, unmerged): per-provider check IDs cited above
