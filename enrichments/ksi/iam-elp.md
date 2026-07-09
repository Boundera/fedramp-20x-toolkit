---
id: KSI-IAM-ELP
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
  - KSI-IAM-SNU

oss_action_checks_this: false
---

## Plain English

Least privilege here is measured against your live IAM inventory, not your policy document. You need to show:

1. **No blanket admin on human users.** No AWS IAM user with `AdministratorAccess` or a wildcard policy attached; no Azure Entra user holding Global Administrator; no GCP project-level `roles/owner` or `roles/editor` bindings.
2. **Access is granted through structure.** Your IdP demonstrates group-based (role-based) access control — the engine confirms this via Okta groups with a defined type.
3. **"Persistently reviewed" means re-checked every scan.** The evaluation runs against current inventory each time, so a privilege granted "temporarily" last sprint shows up as drift, not as a surprise at assessment.

The most common failure: an admin policy attached directly to a human user during an incident and never removed — it sits there until the per-user scan flags it.

## Implementation: AWS

The engine iterates IAM users and inspects `attached_policies` for `AdministratorAccess` or a bare `*` — any hit fails that user. This is per-resource: one over-privileged user out of fifty gives you 49/50, and names the user.

The Prowler PR #11701 mapping for this KSI takes an org-guardrail angle on AWS (`organizations_scp_check_deny_regions`, `organizations_opt_out_ai_services_policy`); Boundera's per-user admin-policy signal is stricter and complements it — the closely related Prowler admin-policy checks are mapped under KSI-IAM-JIT instead.

## Implementation: Azure

The engine iterates Entra users and fails any whose roles include `GlobalAdministrator` — standing tenant-wide admin is the Azure shape of the same problem. Independently checkable via Prowler: `entra_policy_guest_users_access_restrictions`, `entra_policy_guest_invite_only_for_admin_roles`, `keyvault_rbac_enabled`.

## Implementation: GCP

The engine iterates project IAM bindings and fails any binding whose role is `roles/owner` or `roles/editor` — the primitive roles that grant broad project access and defeat least privilege. Independently checkable via Prowler: `compute_instance_default_service_account_in_use`, `compute_instance_default_service_account_in_use_with_full_api_access` (the default compute SA carries Editor, so it usually surfaces both ways).

## Evidence example

A passing package shows per-resource verdicts from:

- `aws:iam_users` — no user carries `AdministratorAccess` or a wildcard policy
- `azure:entra_users` — no user holds the Global Administrator role
- `gcp:iam` — no project-level owner/editor bindings
- `okta:groups` — group-based access control confirmed; this one is any-pass: a single well-formed group (id + type) proves the RBAC structure exists, since the aim is proving the model, not scoring each group

Scope is per-resource on the three cloud signals (score = passing/total, failing users and bindings named individually) and re-evaluated on every scan — that recurrence is what covers the statement's "persistently reviewed" term. No manual evidence path.

## Common gaps

1. **`AdministratorAccess` on a human.** The break-glass user that became the everyday user. Move admin into assumable roles and the per-user signal goes green.
2. **Too many Global Administrators.** Entra tenants where day-to-day operators hold GA instead of scoped directory roles — every one of them is a named failing resource.
3. **Primitive roles at project level.** GCP `roles/editor` handed to service accounts or humans at project scope (often inherited from the default compute SA pattern) instead of granular predefined roles.
4. **No RBAC structure in the IdP.** Direct per-user app assignments with no Okta groups — the any-pass group signal has nothing to pass on.
5. **Assuming ELP evidence covers JIT.** KSI-IAM-JIT evaluates least privilege too; the overlap is intentional and each KSI must stand alone with its own evidence package.

## Notes for Boundera customers

Boundera evaluates KSI-IAM-ELP from live inventory across all three clouds plus your IdP: `aws:iam_users`, `azure:entra_users`, `gcp:iam`, and `okta:groups`. The cloud signals are deliberately boundary-scoped — SCM tools, endpoint security, and monitoring stacks are excluded because they sit outside the authorization boundary this KSI measures.

What you bring: connected AWS/Azure/GCP and Okta, plus the remediation itself (moving admin to roles, trimming GA assignments, replacing primitive GCP roles). [Request a demo](https://boundera.io/request-demo) to watch KSI-IAM-ELP score your real users and bindings — it names each over-privileged identity rather than giving you a pass/fail sticker.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.IAM.indicators["KSI-IAM-ELP"]`
- NIST SP 800-53 Rev 5: AC-2(5), AC-2(6), AC-3, AC-4, AC-6, AC-12, AC-14, AC-17, AC-17(1), AC-17(2), AC-17(3), AC-20, AC-20(1), CM-2(7), CM-9, IA-2, IA-3, IA-4, IA-4(4), IA-5(2), IA-5(6), IA-11, PS-2, PS-3, PS-4, PS-5, PS-6, SC-4, SC-20, SC-21, SC-22, SC-23, SC-39, SI-3
- Prowler FedRAMP 20x mapping (prowler-cloud/prowler#11701, unmerged): per-provider check IDs cited above
