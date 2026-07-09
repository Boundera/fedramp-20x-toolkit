---
id: KSI-IAM-AAM
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
  - KSI-IAM-JIT
  - KSI-IAM-SUS

oss_action_checks_this: false
---

## Plain English

This KSI is about proving that account lifecycle is machine-managed, not spreadsheet-managed. You need to show, per identity in your boundary:

1. **No stale accounts.** Users who have not authenticated in a defined window (Boundera's engine flags AWS IAM users idle for more than 90 days) get caught by automation, not by an annual review.
2. **Every role and group has lifecycle evidence.** Roles carry an ownership signal (a `ManagedBy` tag, a trust policy, or provenance like service-linked / Identity Center reservation); groups actually have members or policies attached rather than sitting as clutter.
3. **Deprovisioning runs to completion.** Offboarding tickets and access requests do not sit open — a disabled-but-not-deleted account is deprovisioning debt, not a finished job.
4. **Machine identities are inventoried too.** Service principals and service accounts are enabled, attributable, and tied to an application identity — "accounts" in this KSI is not limited to humans.

The most common way CSPs fail this one: a documented joiner-mover-leaver procedure with no runtime signal behind it — the assessor pulls the live IAM inventory and finds users whose last activity was 200+ days ago.

## Implementation: AWS

The engine reads your IAM inventory directly:

- **IAM users** — `password_last_used` / last-activity must be within 90 days; older means the account should have been disabled or removed.
- **IAM roles** — each role needs identity metadata plus either an assume-role trust policy or a management signal: a `ManagedBy`/`managed_by` tag, service-linked provenance (`:role/aws-service-role/`, `AWSServiceRole*`), or an Identity Center reserved role (`AWSReservedSSO_*`).
- **IAM groups** — a group passes only if it has members or attached/inline policies; an empty, policy-less group has no management evidence.

## Implementation: Azure

- **Entra users** — `accountEnabled` must be true; a disabled user is flagged so you finish deprovisioning it rather than leaving it dormant.
- **Entra service principals** — must be enabled and carry application identity metadata (`appId` / display name), proving the machine identity is inventoried.
- **Role assignments** — every assignment must have complete scope, role, and principal metadata; an assignment you cannot attribute is an assignment you cannot manage.
- **Custom roles** — must define permissions (actions) and assignable scopes.

## Implementation: GCP

- **Service accounts** — `disabled` must not be true. A disabled service account left in place is the same deprovisioning debt as a disabled Entra user: confirm it can be deleted, then delete it.

## Evidence example

A passing automated evidence package contains per-resource verdicts (score = passing resources / total resources) from these signals:

- `aws:iam_users` — no IAM user idle beyond 90 days
- `aws:iam_roles` — every role has trust-policy or lifecycle-management evidence
- `aws:iam_groups` — every group shows membership or policy management
- `azure:entra_users` — every Entra user account is enabled (disabled = finish deprovisioning)
- `azure:entra_service_principals` — service principals enabled and inventoried
- `azure:iam` — two assertions: role assignments fully attributed (scope, role, principal) and custom roles with permissions + assignable scopes
- `gcp:iam` — no disabled service accounts lingering
- `okta:users` — no users stuck in `SUSPENDED`/`DEPROVISIONED` with access still to revoke
- `crowdstrike:users` — no admin-role sprawl in the endpoint console
- `jira:offboarding_ticket` / `servicenow:access_request` — offboarding tickets and access requests resolved, not open

All signals are per-resource and re-evaluated on every scan — that recurring evaluation is what makes the "using automation" claim credible. There is no manual-evidence path for this KSI; the evidence is your live inventory.

## Common gaps

1. **Idle AWS IAM users.** Human accounts that authenticated once during setup and never again — anything past 90 days of inactivity fails.
2. **Roles with no ownership evidence.** Hand-created roles with no `ManagedBy` tag and no captured trust policy; nobody can say who owns them or why they exist.
3. **Empty IAM groups.** Groups with zero members and zero policies — leftover structure that shows lifecycle management is not actually running.
4. **Disabled-but-present identities.** Disabled Entra users and disabled GCP service accounts that were never deleted; the disable was step one of deprovisioning and step two never happened.
5. **Open offboarding tickets.** A Jira offboarding ticket in `Open`/`To Do` or an unfulfilled ServiceNow access request means access revocation may be incomplete — exactly what AC-2(13) is about.

## Notes for Boundera customers

Boundera evaluates KSI-IAM-AAM continuously across every connector you attach: `aws:iam_users`, `aws:iam_roles`, `aws:iam_groups`, `azure:entra_users`, `azure:entra_service_principals`, `azure:iam`, `gcp:iam`, `okta:users`, `crowdstrike:users`, `jira:offboarding_ticket`, and `servicenow:access_request`. SCM accounts (GitHub/GitLab members) are deliberately excluded — they sit outside the authorization boundary this KSI covers.

What you bring: connect the cloud, IdP, endpoint, and ticketing connectors; tag hand-managed AWS roles with `ManagedBy`; and keep offboarding workflows moving to closure. [Request a demo](https://boundera.io/request-demo) to watch KSI-IAM-AAM evaluate your real account, role, and group inventory — stale users and open offboarding tickets surface on the first scan.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.IAM.indicators["KSI-IAM-AAM"]`
- NIST SP 800-53 Rev 5: AC-2(2), AC-2(3), AC-2(13), AC-6(7), IA-4(4), IA-12, IA-12(2), IA-12(3), IA-12(5)
