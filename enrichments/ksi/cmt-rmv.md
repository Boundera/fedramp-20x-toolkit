---
id: KSI-CMT-RMV
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
  - KSI-CMT-VTD
  - KSI-CMT-RVP

oss_action_checks_this: false
---

## Plain English

"Redeploy, don't patch in place." This KSI asks you to prove that changes reach machine-based resources by redeploying version-controlled definitions, not by SSHing in or clicking around a console. Three proof points:

1. Your infrastructure is defined as code and lives in version control — Terraform, CloudFormation, CDK, Helm, or Pulumi files detectable in your GitHub, GitLab, or Bitbucket repos.
2. The default branch of those repos is protected: no direct pushes, changes only land through a pull/merge request.
3. Merging requires at least one human approval — so every redeploy is gated by review, and the reviewed commit is what gets deployed.

The most common way CSPs fail it: the IaC exists but the gate doesn't — Terraform sits in the repo while direct pushes to the default branch are still possible, or branch "protection" is on without any required reviews. Version control without enforcement proves nothing about how changes actually happen.

## Evidence example

Boundera evaluates this KSI entirely from your SCM connectors (GitHub, GitLab, Bitbucket), per repository — every repo's default branch counts toward the score. Passing automated evidence contains these signals (each row carries the `collected_at` timestamp of the most recent connector scan):

- `github:branch_protection` — per repo: the default branch is protected, required PR reviews are enabled, and at least 1 approving review is required. All three conditions, not just the protection flag.
- `scm:iac` — org-level, satisfied once: at least one connected SCM has IaC files in version control (Terraform, CloudFormation, CDK, Helm, Pulumi). The evidence records which IaC types were detected. One SCM with IaC is sufficient proof of the pattern.
- `gitlab:branch_protection` — per project: the default branch restricts both push access and merge access.
- `gitlab:merge_approvals` — per project: merge requests require at least 1 approval before merge.
- `bitbucket:branch_restrictions` — per repo: at least one review/merge restriction is enforced on the default branch (any of `require_approvals_to_merge`, `require_passing_builds_to_merge`, `restrict_merges`, `push`).

## Common gaps

1. **Unprotected default branch.** The single biggest failure: `main` accepts direct pushes, so any change can bypass the redeploy workflow entirely.
2. **Protection without review.** GitHub branch protection is on but required PR reviews are disabled or set to zero approvals; GitLab projects requiring 0 MR approvals. The gate exists but never closes.
3. **No IaC anywhere.** No Terraform/CloudFormation/CDK/Helm/Pulumi files detected in any connected SCM — a strong indicator that infrastructure is managed by direct modification.
4. **Bare Bitbucket repos.** Repos with no branch restrictions at all — no approval requirement, no build requirement, no merge or push restriction.
5. **Partial coverage across repos.** Scoring is per repository: protecting your flagship repo while ten supporting repos stay unprotected drags the score, and each unprotected repo is listed as a failing resource with its reason.

## Notes for Boundera customers

Boundera evaluates KSI-CMT-RMV continuously across GitHub, GitLab, and Bitbucket: `github:branch_protection`, `gitlab:branch_protection`, `gitlab:merge_approvals`, and `bitbucket:branch_restrictions` are scored per repository, and `scm:iac` confirms infrastructure-as-code presence across whichever SCM you connect. Today this KSI is proven from your SCM alone — cloud-side immutability signals (AWS SSM-managed instances, Azure Guest Configuration, GCP Cloud Asset Inventory) are documented on the roadmap and will tighten the check further once connector data supports them.

What still needs you: connect the SCM connector for each system that hosts deployable code, keep IaC in scanned repos, and turn on branch protection everywhere — the engine will show you exactly which repos are the holdouts. [Request a demo](https://boundera.io/request-demo) to see KSI-CMT-RMV score every default branch in your GitHub, GitLab, or Bitbucket organization.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CMT.indicators["KSI-CMT-RMV"]`)
- NIST SP 800-53 Rev 5: CM-2, CM-3, CM-5, CM-6, CM-7, CM-8(1), SI-3
