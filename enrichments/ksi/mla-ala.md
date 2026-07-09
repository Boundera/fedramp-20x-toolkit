---
id: KSI-MLA-ALA
kind: ksi
family: MLA
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
  - KSI-MLA-OSM
  - KSI-MLA-RVL
  - KSI-MLA-EVC

oss_action_checks_this: false
---

## Plain English

This KSI asks who can read your audit logs — and the acceptable answer is "nobody, until they justify it." You need to prove:

1. No human identity has **standing** read access to log data. No user or group carries an attached policy that can read your audit trail whenever it likes; log access is earned at need through just-in-time role assumption.
2. The roles that *do* grant log-read are trust-scoped — assumable only by enumerated accounts, an SSO provider, or specific services, never by `Principal: *`.
3. The places logs land are themselves locked down: no public exposure, no wildcard grants on the bucket or store that holds the audit trail.
4. The just-in-time authorization model exists as a documented, reviewed workflow — not just an accident of your IAM layout.

One scope note grounded in the FRMR JSON: this indicator varies by class — it is marked **Optional** for Class B and required for Class C.

The most common way CSPs fail it: a long-lived "read-only" policy attached to an ops group for convenience, which quietly includes `s3:GetObject` or `logs:*` over the CloudTrail destination — standing log access for every member of the group.

## Implementation: AWS

Boundera's engine evaluates this with cross-resource correlation, not per-resource rules in isolation. It first reads every CloudTrail trail to learn where logs actually live (the trail's S3 bucket and CloudWatch Logs log group), then asks who can reach those destinations. Only log-relevant resources are scored — a user, group, policy, or bucket with no connection to a log destination is excluded, not "passing."

What you need in place:

- **No standing log-read on users or groups.** Any attached policy that allows a log-read action — `s3:GetObject`, `logs:GetLogEvents`, `logs:FilterLogEvents`, `logs:StartQuery`, `logs:GetQueryResults`, `cloudtrail:LookupEvents`, or wildcards like `s3:Get*`, `logs:*`, `cloudtrail:*`, `*` — on a log destination ARN (or on `Resource: *`) fails the identity. Groups fail with the member count reported, since one grant multiplies across every member.
- **Trust-scoped log-read roles.** Roles whose attached policies grant log-read pass only if their trust policy is scoped (specific accounts, SAML provider, or services). A trust policy allowing assumption by `Principal: *` fails. Service roles are excluded from scoring.
- **Protected log buckets.** Every S3 bucket that is a CloudTrail destination must have all four public-access-block flags on (`block_public_acls`, `ignore_public_acls`, `block_public_policy`, `restrict_public_buckets`) and no bucket policy statement granting a log-read action to a wildcard principal.
- **No god-mode policies.** Attached customer-managed policies that allow a log-read action on `Resource: *` fail regardless of who holds them. AWS-managed and unattached policies are excluded.

## Implementation: Azure

The engine inspects role assignments and custom role definitions:

- **No broad-reader assignments at root scope.** A role assignment fails when it grants one of the broad log-reading built-in roles — Reader, Log Analytics Reader, Monitoring Reader, Storage Blob Data Reader, Owner, or Contributor — at scope `/` to a User, Group, or ForeignGroup. Assignments at narrower scopes, or to service principals, are excluded.
- **No broadly assignable custom log-reader roles.** A custom role fails when its permissions include `*` or actions under log-read prefixes (`Microsoft.OperationalInsights/workspaces/`, `Microsoft.Insights/logs/`, `Microsoft.Insights/logProfiles/`, `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/`) *and* its assignable scopes include `/`.

## Implementation: GCP

The engine inspects Cloud Resource Manager IAM bindings: a binding fails when it grants a broad log-reader role — `roles/logging.viewer`, `roles/logging.privateLogViewer`, `roles/storage.objectViewer`, `roles/bigquery.dataViewer`, or `roles/bigquery.metadataViewer` — to `allUsers` or `allAuthenticatedUsers`. All other bindings are excluded from scoring.

## Evidence example

A passing evaluation contains, per signal:

- `aws:iam_users` — no in-scope IAM user holds standing log-read on a CloudTrail destination (assertion `aws_iam_user_no_standing_log_read`). Users with no log-read grant do not appear at all.
- `aws:iam_groups` — same assertion for groups, with affected member counts (`aws_iam_group_no_standing_log_read`).
- `aws:iam_roles` — each non-service role that grants log-read shows a scoped-trust summary such as "trust scoped to account 123456789012, SAML provider (JIT path)" (`aws_iam_role_log_read_trust_scoped`).
- `aws:s3_buckets` — each CloudTrail destination bucket blocks public access and has no broad bucket-policy grant (`aws_s3_log_bucket_protections`).
- `aws:iam_policies` — no attached customer-managed policy grants log-read on `Resource: *` (`aws_iam_policy_no_broad_log_read`).
- `azure:iam` — no broad-reader role assignment at root scope and no broadly assignable custom log-reader role.
- `gcp:iam` — no public-principal binding to a log-reader role.
- `manual:log_access_authorization` — your uploaded JIT log-access workflow evidence, no older than 365 days.

Scope is per-resource and filter-first: only resources relevant to log access count toward the score, and the manual signal always adds one item to the denominator. The manual evidence is the only freshness-gated input (365 days); cloud signals reflect the latest connector scan.

## Common gaps

1. **Standing user grants.** An IAM user with an attached policy allowing `s3:GetObject` on the trail bucket, or `logs:*` on `Resource: *`. The engine names the granting policy and the destination in the finding.
2. **Group-amplified access.** One log-read policy on an ops group silently authorizes every member — the finding reports how many people are affected.
3. **Wildcard trust on the break-glass role.** The log-read role exists for JIT, but its trust policy allows `Principal: *` — anyone can assume it, so it is not JIT at all.
4. **Unprotected log bucket.** The CloudTrail destination bucket is missing one of the four public-access-block flags, or its bucket policy grants `s3:Get*` to a wildcard principal.
5. **Root-scope broad readers (Azure) / public log-viewer bindings (GCP).** Reader, Owner, or Contributor assigned to a user or group at `/`; or `roles/logging.viewer`-class roles bound to `allUsers` / `allAuthenticatedUsers`.
6. **Missing or stale JIT workflow evidence.** No `manual:log_access_authorization` upload, or the latest one is older than 365 days — the manual slot fails even if every cloud signal passes.

## Notes for Boundera customers

Boundera evaluates KSI-MLA-ALA automatically across AWS, Azure, and GCP once your cloud connectors are set up. On AWS the engine performs the full cross-resource correlation for you — deriving log destinations from `aws:cloudtrail:trails` and scoring `aws:iam_users`, `aws:iam_groups`, `aws:iam_roles`, `aws:iam_policies`, and `aws:s3_buckets` against them — while `azure:iam` and `gcp:iam` catch broad or public log-reader grants on the other clouds. Findings are filter-first, so you see only the identities and buckets that actually matter for log access, each with the specific granting policy named.

Two things remain yours: connect the cloud accounts in your boundary, and upload your JIT log-access authorization workflow as `manual:log_access_authorization` evidence at least once a year (the engine enforces the 365-day freshness window). [Request a demo](https://boundera.io/request-demo) to watch KSI-MLA-ALA correlate your real CloudTrail destinations against every IAM identity that can reach them.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.MLA.indicators["KSI-MLA-ALA"]`
- NIST SP 800-53 Rev 5: SI-11
