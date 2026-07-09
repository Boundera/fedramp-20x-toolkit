---
id: KSI-CNA-DFP
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
  - KSI-CNA-EIS
  - KSI-CNA-IBP
  - KSI-CNA-MAT

oss_action_checks_this: false
---

## Plain English

This KSI asks whether the functionality and privileges of your infrastructure are strictly defined — meaning there is an authoritative, machine-readable definition of what each piece of infrastructure does, and something actively holding the environment to it. Three proof points:

1. **Infrastructure is defined as code.** Your source repositories (GitHub, GitLab, or Bitbucket) contain IaC files — Terraform, CloudFormation, ARM/Bicep, CDK, Pulumi, or Deployment Manager — that declare what exists and with what privileges.
2. **A configuration service tracks the running estate against a baseline.** AWS Config is recording, Azure Policy assignments are in enforcement mode (not audit-only), or GCP Security Command Center is enabled.
3. **Unauthorized code is detected or blocked.** Malicious-code protection is active: GuardDuty on AWS, Defender on Azure, SCC threat detection on GCP, or CrowdStrike prevention policies at the endpoint layer.

The most common way CSPs fail this one: the environment was built by hand in the console, so there is no code definition to point to — "strictly defined" cannot be evidenced no matter how tight the configuration actually is.

## Implementation: AWS

- **AWS Config** — the engine checks that at least one Config recorder has `recording: true`. A recorder that exists but is stopped fails: baseline configuration drift is not being tracked.
- **Amazon GuardDuty** — at least one detector must be enabled in the account (both the account-level flag and the detector status are checked). This is the SI-3 malicious-code-detection leg.

Independently checkable via the upstream Prowler 20x mapping: `ec2_instance_imdsv2_enabled`, `ec2_instance_older_than_specific_days`.

## Implementation: Azure

- **Azure Policy** — at least one policy assignment with `enforcementMode: Default`. Assignments in `DoNotEnforce` mode fail: the baseline exists but is not actively enforced.
- **Microsoft Defender for Cloud** — Defender must be active on the subscription (the engine reads the secure-score payload's active flag). This covers the malicious-code-protection leg.

Independently checkable via the upstream Prowler 20x mapping: `containerregistry_uses_private_link`.

## Implementation: GCP

- **Security Command Center** — SCC must be enabled on the project. In the engine, one SCC signal covers both legs for GCP: baseline configuration scanning and threat detection.

Independently checkable via the upstream Prowler 20x mapping: `cloudstorage_bucket_uniform_bucket_level_access`, `compute_network_not_legacy`.

## Evidence example

Passing automated evidence for KSI-CNA-DFP contains some combination of these signals. Every one is an any-pass check: one conforming resource satisfies the signal, and each signal with evidence contributes one point to the KSI score.

- `scm:iac` — the connected SCM (GitHub, GitLab, or Bitbucket) contains IaC files (Terraform, CloudFormation, ARM/Bicep, CDK, Pulumi, or Deployment Manager). Evaluated per connected SCM scope.
- `aws:config` — an AWS Config recorder is actively recording.
- `azure:policy` — an Azure Policy assignment is in enforcement mode.
- `gcp:scc` — Security Command Center is enabled for the project.
- `aws:guardduty` — a GuardDuty detector is enabled in the account.
- `azure:defender_secure_score` — Azure Defender is active for the subscription.
- `crowdstrike:prevention_policies` — a CrowdStrike prevention policy is enabled with at least one prevention setting configured.

Evidence is refreshed on every connector scan; there is no separate manual-upload path for this KSI.

## Common gaps

1. **No IaC anywhere.** The SCM scan finds zero Terraform/CloudFormation/ARM/Bicep/CDK/Pulumi/Deployment Manager files — the infrastructure has no code definition at all.
2. **Config recorder exists but is stopped.** `recording` is false, so the baseline is a snapshot, not a control.
3. **Azure Policy deployed in audit-only mode.** Every assignment is `DoNotEnforce` — you can see drift but nothing prevents it.
4. **GuardDuty detector suspended.** The detector object exists, but it is not enabled, so malicious-code detection is inactive.
5. **CrowdStrike policy enabled with zero prevention settings.** An empty policy passes a screenshot review but fails the engine's condition — it has to carry actual settings.

## Notes for Boundera customers

Boundera evaluates KSI-CNA-DFP automatically across three evidence layers: IaC presence in your connected SCM (`scm:iac` — GitHub, GitLab, or Bitbucket), configuration enforcement in each connected cloud (`aws:config`, `azure:policy`, `gcp:scc`), and malicious-code protection (`aws:guardduty`, `azure:defender_secure_score`, plus `crowdstrike:prevention_policies` if you connect CrowdStrike). You need to connect the relevant integrations — an SCM connector for the IaC leg and cloud connectors for the rest; nothing is uploaded by hand. [Request a demo](https://boundera.io/request-demo) to watch KSI-CNA-DFP evaluate your real repositories and Config/Policy enforcement state live.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-DFP"]`)
- NIST SP 800-53 Rev 5: CM-2, SI-3
- Prowler 20x KSI mapping: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
