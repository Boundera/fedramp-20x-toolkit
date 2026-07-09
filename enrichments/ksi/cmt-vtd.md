---
id: KSI-CMT-VTD
kind: ksi
family: CMT
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
  - KSI-CMT-LMC
  - KSI-CMT-RMV
  - KSI-CMT-RVP

oss_action_checks_this: false
---

## Plain English

"Throughout deployment" is the operative phrase: validation has to be automated both before a change merges and after it is running. Four proof points:

1. CI pipelines exist in version control — `.github/workflows/` on GitHub, `.gitlab-ci.yml` on GitLab, `bitbucket-pipelines.yml` on Bitbucket.
2. Those pipelines actually run — recent workflow/pipeline executions, not dormant config committed a year ago.
3. Those pipelines actually test — detectable test commands in the CI config, not just build-and-push steps.
4. Validation continues after deploy: patch compliance and vulnerability scanning on running resources (AWS SSM Patch Manager, AWS Inspector), continuous posture and managed-config assessment (Azure Defender secure score, Azure VM Guest Configuration), and automated inventory tracking of resource changes (GCP Cloud Asset Inventory).

The most common way CSPs fail it: CI exists but doesn't validate — a pipeline that lints and deploys proves automation, not testing. The "has tests" question is checked separately from "has CI" for exactly this reason.

## Implementation: AWS

Two post-deploy signals prove that validation keeps running after changes ship.

- **SSM Patch Manager** (`aws:ssm_patch_compliance`) — every managed instance must be patch-compliant: no missing critical or security patches, no failed patch operations, managed by a patch baseline. Scored per instance — one non-compliant instance is a listed failure. When no instances are managed at all, the evidence is an explicit failing row with a reason, so the KSI does not false-pass on an unscanned environment. Independently checkable via Prowler `ssm_managed_compliant_patching`.
- **Inspector v2** (`aws:inspector`) — satisfied by any one region where Inspector is enabled **and** actually covering more than zero resources. Enabled-but-covering-nothing fails. The evidence reports enabled scan types and active finding counts (critical/high), proving post-deploy CVE detection is live — CI tests catch issues before merge; Inspector catches vulnerabilities introduced into running resources after.

## Implementation: Azure

Two signals prove continuous post-deploy assessment. Note: Prowler's Azure mapping for this KSI in #11701 (`defender_assessments_vm_endpoint_protection_installed`) does not correspond to either of the engine's signals — treat it as a mapping gap, not an independent cross-check.

- **Defender for Cloud secure score** (`azure:defender_secure_score`) — every subscription must have an active Defender secure score. An unavailable score fails: it means the Defender assessment baseline is not running for that subscription. The evidence records the current/max score and percentage as continuous posture measurement.
- **VM Guest Configuration** (`azure:vm_guest_config`) — every VM with a Guest Configuration assignment must report Compliant. NonCompliant, NotAssigned, or missing assignments fail: managed configuration drift is not being detected and remediated on that VM.

## Implementation: GCP

One signal. Note: Prowler's GCP mapping for this KSI in #11701 is empty — there is no independent Prowler cross-check on GCP.

- **Cloud Asset Inventory** (`gcp:cloudasset`) — satisfied by any one project where Cloud Asset Inventory is enabled **and** tracking more than zero assets. Enabled-but-tracking-nothing fails. This proves automated component-inventory updates: every resource change in the project is captured, the automation CM-8(1) asks for.

## Evidence example

Passing automated evidence contains these signals (each row carries the `collected_at` timestamp of the most recent connector scan; no separate freshness gate applies):

- `scm:ci_exists` — org-level, satisfied by any one connected SCM (GitHub, GitLab, or Bitbucket) that has CI configuration in version control; the evidence reports how many repos have CI out of the total.
- `scm:ci_runs` — org-level: any SCM **that has CI config** shows recent pipeline/workflow runs. SCMs with no CI at all are filtered out of this signal so the missing-config failure isn't double-counted.
- `scm:ci_has_tests` — org-level: any SCM-with-CI has test commands detected in its CI config. Same filter applies.
- `aws:ssm_patch_compliance` — per managed instance, patch-compliant (see Implementation: AWS)
- `aws:inspector` — any one region enabled and covering resources (see Implementation: AWS)
- `azure:defender_secure_score` — per subscription, Defender secure score active (see Implementation: Azure)
- `azure:vm_guest_config` — per VM, Guest Configuration assignment Compliant (see Implementation: Azure)
- `gcp:cloudasset` — any one project with Cloud Asset Inventory enabled and tracking assets (see Implementation: GCP)

## Common gaps

1. **CI with no test step.** Pipelines that build, package, and deploy but contain no detectable test commands — `scm:ci_has_tests` fails even while `scm:ci_exists` passes.
2. **Dormant pipelines.** CI config is committed but there are no recent runs — automated validation is configured, not executing.
3. **Scanners that scan nothing.** AWS Inspector enabled but covering zero resources, or SSM Patch Manager with no managed instances — both are explicit failures, not silent passes.
4. **Post-deploy drift unwatched on Azure.** VMs whose Guest Configuration assignment reports NonCompliant (or was never assigned), or subscriptions where the Defender secure score is unavailable because the assessment baseline isn't running.
5. **Inventory blind spot on GCP.** Cloud Asset Inventory disabled, or enabled but tracking zero assets — resource changes aren't feeding any automated inventory.

## Notes for Boundera customers

Boundera evaluates KSI-CMT-VTD across the whole deployment lifecycle. Pre-merge, `scm:ci_exists`, `scm:ci_runs`, and `scm:ci_has_tests` are evaluated over GitHub, GitLab, and Bitbucket — any one connected SCM can satisfy each. Post-deploy, coverage is provider-specific as implemented: on AWS, `aws:ssm_patch_compliance` scores every managed instance and `aws:inspector` confirms live vulnerability scanning; on Azure, `azure:defender_secure_score` scores each subscription and `azure:vm_guest_config` scores each VM; on GCP, `gcp:cloudasset` confirms automated inventory tracking.

What still needs you: connect your SCM and cloud connectors, put real test commands in your pipelines, and enroll instances/VMs into SSM Patch Manager and Guest Configuration so the per-resource signals have something to score. [Request a demo](https://boundera.io/request-demo) to watch KSI-CMT-VTD evaluate your real pipelines, patch compliance, and scanner coverage end to end.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CMT.indicators["KSI-CMT-VTD"]`)
- NIST SP 800-53 Rev 5: CM-3, CM-3(2), CM-4(2), SI-2
- Prowler KSI mapping (prowler-cloud/prowler#11701, unmerged, aligned 2026.06.24.01)
