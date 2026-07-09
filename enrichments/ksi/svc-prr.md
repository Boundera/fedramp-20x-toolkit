---
id: KSI-SVC-PRR
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
  - KSI-SVC-RUD

oss_action_checks_this: false
---

## Plain English

After you change the system, what is left behind? This KSI asks you to prove that leftover risk — vulnerable packages, unresolved findings, lingering threats — is persistently found and removed. (Under the 2026 rules the requirement varies by class: it is optional for Class B and required for Class C.) Concretely:

1. Persistent monitoring for residual threats is switched on in your clouds (AWS GuardDuty, Microsoft Defender).
2. Every critical- or high-severity vulnerability from your scanners (CrowdStrike, GitLab, Qualys host and container scanning) is remediated, or formally dispositioned as accepted/resolved — not sitting open.
3. Every GitHub Dependabot and code-scanning alert is fixed or dismissed. Note the stricter bar: for GitHub alerts, any open alert fails regardless of severity.

The most common failure: a standing backlog of open high/critical findings that predates the last several changes — evidence that post-change review is not actually happening.

## Implementation: AWS

The engine treats GuardDuty as the AWS residual-risk monitor: detectors (`aws:guardduty:detectors`) pass when `enabled_in_account` is true, evaluated as a single capability check (one enabled detector is enough). The Prowler PR maps no AWS checks to this KSI, so there is no Prowler cross-check to cite.

## Implementation: Azure

Microsoft Defender is the Azure equivalent: secure-score rows (`azure:security:secure_scores`) pass when `defender_active` is true for the subscription, again as a single capability check. The Prowler PR maps no Azure checks to this KSI.

## Implementation: GCP

The engine has no GCP-native signal for KSI-SVC-PRR — this is a real coverage difference, not an omission in the write-up. Residual-risk evidence for GCP-hosted workloads comes through the provider-neutral scanner signals below (Qualys and CrowdStrike agents evaluate hosts wherever they run, and the SCM signals are cloud-independent). The Prowler PR maps no GCP checks to this KSI either.

## Evidence example

Passing evidence combines two capability signals with six per-resource remediation signals:

- `aws:guardduty` — a GuardDuty detector is enabled (capability, one passing detector suffices).
- `azure:defender_secure_score` — Defender is active for the subscription (capability).
- `crowdstrike:vulnerabilities` — every endpoint vulnerability is either below high severity or closed/remediated; open critical/high CVEs are failing resources.
- `github:dependabot_alerts` — every Dependabot alert is `dismissed` or `fixed`.
- `github:code_scanning` — every code-scanning alert is `dismissed` or `fixed`.
- `gitlab:vulnerabilities` — every GitLab-reported vulnerability is below high severity or dismissed/resolved.
- `qualys:vulnerabilities` — every Qualys host finding is below high severity or carries a closed disposition (accepted, closed, fixed, remediated, or resolved).
- `qualys:container_vulnerabilities` — the same bar applied to container image findings, with package, installed version, and fixed version in the snapshot.

Each failing resource names the CVE, severity, and package where available, so the evidence doubles as the remediation queue.

## Common gaps

1. **Open critical/high Qualys findings.** Host or container findings without a closed disposition are the most frequent failing resources — especially container images rebuilt without picking up the fixed package version.
2. **Dependabot alerts left open because they are "low".** The engine fails any open Dependabot or code-scanning alert regardless of severity — triage them to fixed or dismissed with rationale.
3. **Scanner findings dispositioned nowhere.** Risk-accepted findings tracked in a spreadsheet instead of the scanner keep failing; the engine reads the scanner's state field (accepted/dismissed/resolved), not your spreadsheet.
4. **GuardDuty disabled in a spoke account.** Detectors exist but `enabled_in_account` is false — persistent residual-threat monitoring is off.
5. **Defender inactive on a subscription that hosts federal data.** `defender_active` false fails the Azure capability signal.

## Notes for Boundera customers

Boundera evaluates KSI-SVC-PRR from the tools you already run: `aws:guardduty` and `azure:defender_secure_score` prove the monitoring capability, while `crowdstrike:vulnerabilities`, `github:dependabot_alerts`, `github:code_scanning`, `gitlab:vulnerabilities`, `qualys:vulnerabilities`, and `qualys:container_vulnerabilities` are scored per finding — every open high/critical item appears individually with its CVE and disposition. There is currently no GCP-native signal for this KSI; GCP workloads are covered through the scanner integrations. [Request a demo](https://boundera.io/request-demo) to see KSI-SVC-PRR turn your real vulnerability backlog into a per-finding evidence list.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-PRR"]`)
- NIST SP 800-53 Rev 5: SC-4
- Prowler FedRAMP 20x mappings: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
