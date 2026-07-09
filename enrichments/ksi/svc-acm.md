---
id: KSI-SVC-ACM
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
  - KSI-SVC-EIS
  - KSI-SVC-VRI

oss_action_checks_this: false
---

## Plain English

You need to prove that machine configuration is handled by automation, not by hand:

1. Configuration is defined as code — at least one connected source-control system (GitHub, GitLab, or Bitbucket) contains infrastructure-as-code repositories (Terraform, CloudFormation, ARM/Bicep, etc.).
2. Changes deploy through automation — CI/CD pipelines exist and run, rather than engineers applying changes manually.
3. Something is persistently watching live configuration for drift — a cloud-native recorder or policy engine (AWS Config, Azure Policy, GCP Cloud Asset Inventory) is actively enabled, and endpoint configuration is policy-managed (e.g., CrowdStrike prevention policies with sensor auto-update).

The most common failure: the IaC repo exists, but nothing at runtime is recording or enforcing configuration — the drift-review half of the indicator has no evidence.

## Implementation: AWS

Boundera's engine inspects AWS Config recorders (`aws:config:recorders`) and passes when a recorder is actively recording (`recording` is true). A recorder that exists but is stopped fails with an explicit "automated config management disabled" reason. Independently checkable via Prowler's `config_recorder_all_regions_enabled`; the same PR also maps `ec2_instance_managed_by_ssm` and `ssm_managed_compliant_patching` to this KSI for AWS.

## Implementation: Azure

The engine inspects Azure Policy assignments (`azure:policy:policy_assigments`) and passes when an assignment's `enforcement_mode` is set to enforce (anything other than empty or `DoNotEnforce`). A subscription with zero assignments produces a placeholder `no-policy-assignments` row, which fails. Note: the Prowler PR's Azure mapping for this KSI does not cover Azure Policy, so there is no equivalent Prowler check to cite here.

## Implementation: GCP

The engine inspects the Cloud Asset Inventory summary (`gcp:cloudasset:summary`) and passes when `cai_enabled` is true for the project — CAI provides the configuration tracking that AWS Config and Azure Policy provide on the other clouds. The Prowler PR maps no GCP checks to this KSI, so there is no Prowler cross-check for GCP.

## Evidence example

Passing automated evidence for KSI-SVC-ACM contains some subset of these signals (each is an org-level check that passes if any resource satisfies it; sources you have not connected are skipped rather than failed):

- `scm:iac` — at least one connected SCM (GitHub, GitLab, or Bitbucket) reports `has_iac` with a non-zero IaC repo count; the snapshot lists the IaC types found. All SCMs are evaluated as one logical check, so one SCM with IaC is enough.
- `github:workflow_runs` — a GitHub repo has CI/CD workflow files (`has_ci` true, `workflow_file_count` > 0). This CI signal is GitHub-specific; GitLab and Bitbucket pipelines are not inspected by this KSI.
- `aws:config` — an AWS Config recorder is actively recording.
- `azure:policy` — an Azure Policy assignment is enforcing.
- `gcp:cloudasset` — Cloud Asset Inventory is enabled for the project.
- `crowdstrike:prevention_policies` — two assertions: a prevention policy is enabled with at least one configured setting, and a sensor update policy has auto-update enabled.

Evidence carries a per-resource snapshot (the exact fields the condition read) and the collection timestamp of the latest connector scan.

## Common gaps

1. **No IaC anywhere.** Every connected SCM reports zero IaC repositories — configuration exists only in consoles and tickets.
2. **Config recorder created, then stopped.** The AWS Config recorder row exists but `recording` is false — usually a cost-cutting change nobody reverted.
3. **Azure Policy in audit-only mode.** Assignments exist but every one is `DoNotEnforce`, or the subscription has no assignments at all — the engine fails both cases.
4. **Cloud Asset Inventory never enabled.** GCP projects frequently skip CAI because nothing else depends on it; the drift-review evidence is then absent.
5. **Endpoint agents without policy.** CrowdStrike prevention policies disabled or empty, or sensor auto-update turned off — endpoint configuration is then managed ad hoc.

## Notes for Boundera customers

Boundera evaluates KSI-SVC-ACM automatically across every source you connect: SCM IaC detection (`scm:iac` over GitHub, GitLab, and Bitbucket), GitHub CI/CD (`github:workflow_runs`), AWS Config (`aws:config`), Azure Policy (`azure:policy`), GCP Cloud Asset Inventory (`gcp:cloudasset`), and CrowdStrike configuration policies (`crowdstrike:prevention_policies`). Each mechanism is scored as a single organization-level check, so you see exactly which automation layers you can already prove and which are silent. You supply the connections; the engine supplies the evidence. [Request a demo](https://boundera.io/request-demo) to watch KSI-SVC-ACM evaluate your real Config recorders, policy assignments, and IaC repos in one pass.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-ACM"]`)
- NIST SP 800-53 Rev 5: AC-2(4), CM-2, CM-2(2), CM-2(3), CM-6, CM-7(1), PL-9, PL-10, SA-5, SI-5, SR-10
- Prowler FedRAMP 20x mappings: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
