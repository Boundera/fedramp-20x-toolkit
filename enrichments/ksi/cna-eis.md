---
id: KSI-CNA-EIS
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
  - KSI-CNA-DFP
  - KSI-CNA-IBP

oss_action_checks_this: false
---

## Plain English

KSI-CNA-EIS (not to be confused with KSI-SVC-EIS, a different indicator) is about automated enforcement of intended state. What you need to show:

1. **An automated service — not a human on a schedule — persistently assesses your machine-based resources.** Point-in-time audits and quarterly reviews do not qualify.
2. **That service enforces (or at minimum detects departure from) the intended operational state:** AWS Config actively recording, Azure Policy assignments in enforcement mode, or GCP Security Command Center / Cloud Asset Inventory watching the project.

One nuance worth knowing before you invest: in the upstream FRMR data this indicator's requirement varies by class — it is marked Optional for Class B and required as written for Class C. Check which class your offering targets before treating a gap here as blocking.

The most common way CSPs fail it: the enforcement tooling is deployed in audit-only mode. Visibility without enforcement gives you a drift report, not an enforced intended state.

## Implementation: AWS

- **AWS Config** — the engine requires a Config recorder with `recording: true`. A recorder that exists but is stopped fails with "configuration drift detection is disabled."

## Implementation: Azure

- **Azure Policy** — at least one policy assignment with `enforcementMode: Default`. Assignments in `DoNotEnforce` mode are audit-only and fail the condition.

## Implementation: GCP

The engine accepts either of two services on GCP:

- **Security Command Center** — SCC enabled on the project (actively scanning project resources), or
- **Cloud Asset Inventory** — CAI accessible for the project, accepted as an alternative because it proves configuration state is being monitored.

Note: the upstream Prowler 20x mapping (prowler-cloud/prowler#11701) maps zero checks to KSI-CNA-EIS on every provider, so there is currently no independent Prowler cross-check for this indicator.

## Evidence example

Passing automated evidence contains one or more of these signals. Each is an any-pass check — one conforming resource satisfies the signal — and each signal with evidence contributes one point to the score:

- `aws:config` — an AWS Config recorder is actively recording.
- `azure:policy` — an Azure Policy assignment is in enforcement mode (`Default`).
- `gcp:scc` — the GCP project has Security Command Center enabled.
- `gcp:cloudasset` — the GCP project's Cloud Asset Inventory is accessible.

Evidence is refreshed on every connector scan; there is no manual-upload path for this KSI.

## Common gaps

1. **Config recorder created once, then stopped.** The recorder object survives in the account, but `recording` is false — the assessor sees a disabled control.
2. **Every Azure Policy assignment in `DoNotEnforce`.** Teams often stage policies in audit mode and never flip them; that fails this indicator's condition outright.
3. **GCP project with neither SCC nor CAI reachable.** No automated assessment service means no evidence at all for that cloud.
4. **"Persistent" interpreted as a recurring calendar event.** A human-run quarterly configuration review produces no automated signal — the engine (and the KSI) wants a always-on service.

## Notes for Boundera customers

Boundera evaluates KSI-CNA-EIS fully automatically from your cloud connectors: `aws:config` on AWS, `azure:policy` on Azure, and `gcp:scc` or `gcp:cloudasset` on GCP — CAI is accepted as an alternative when SCC is not enabled. Your only setup work is connecting the clouds in your boundary and turning the respective services on. [Request a demo](https://boundera.io/request-demo) to see KSI-CNA-EIS evaluate your live Config recorders and Policy enforcement modes and flag any audit-only assignments.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-EIS"]`)
- NIST SP 800-53 Rev 5: CA-2(1), CA-7(1)
