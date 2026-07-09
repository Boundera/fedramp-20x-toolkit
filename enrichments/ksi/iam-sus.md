---
id: KSI-IAM-SUS
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
  - KSI-IAM-AAM
  - KSI-IAM-APM
  - KSI-IAM-JIT

oss_action_checks_this: false
---

## Plain English

This KSI is the response half of identity security: when something looks wrong on a privileged account, it gets disabled or otherwise secured — automatically. Three things to prove:

1. **A detection layer is actually on.** Per provider, at least one automated suspicious-activity detector is live: GuardDuty or Security Hub in AWS, Security Defaults (Smart Lockout + risk-based sign-in) in Azure, Security Command Center in GCP.
2. **You have the technical means to disable accounts.** The engine verifies your IdP's disable capability by confirming users sit in documented Okta lifecycle states the suspend/deactivate API can act on, and that a sign-in/lockout policy is ACTIVE.
3. **The automatic-disable workflow — with its timing — is documented and demonstrated.** AC-2(13)'s response window and the detector-to-disable wiring cannot be read from a cloud API; they are proven by uploaded artifacts (incident timestamps, runbook output, SIEM rule exports).

The most common failure: detection exists but nothing shows the *response* is automatic — GuardDuty findings pile up while account disabling remains a Slack conversation.

## Implementation: AWS

- **GuardDuty** — at least one detector with status `ENABLED` (any-pass across detectors); a suspended detector fails.
- **Security Hub** — active (not `DISABLED`) so findings aggregate into one place a response workflow can key off.

Independently checkable via Prowler: `guardduty_is_enabled`, `guardduty_no_high_severity_findings`.

## Implementation: Azure

- **Security Defaults** — `isEnabled` true brings Smart Lockout and risk-based sign-in protections, which is the engine's current Azure signal for automated account-securing behavior. Known gap, stated openly: per-service Defender for Cloud pricing-tier data is not yet available through the connector, so a stricter Defender-for-Identity signal is deferred until it is.

Independently checkable via Prowler: `defender_ensure_wdatp_is_enabled` (the PR's sole Azure mapping for this KSI).

## Implementation: GCP

- **Security Command Center** — must be enabled on the project; SCC is GCP's threat-detection layer (Event Threat Detection findings, anomalous IAM grants, credential misuse).

The Prowler PR #11701 mapping has zero GCP checks for this KSI — Boundera's `gcp:scc` signal covers ground the PR does not.

## Evidence example

Scoring is any-pass within each signal: one enabled detector or active policy per signal satisfies it, because the question is "does a live detection/response path exist," not "is every optional detector on."

- `aws:guardduty` — a GuardDuty detector is ENABLED (automated threat detection)
- `aws:securityhub` — Security Hub active (aggregated findings layer for response)
- `azure:entra_mfa` — Security Defaults enabled (Smart Lockout / risk-based sign-in)
- `gcp:scc` — Security Command Center enabled on the project
- `okta:users` — users are in documented lifecycle states (STAGED / PROVISIONED / ACTIVE / RECOVERY / LOCKED_OUT / PASSWORD_EXPIRED / SUSPENDED / DEPROVISIONED), proving the disable/suspend API can act on them
- `okta:signin_policies` — a sign-in/password policy is ACTIVE, enforcing lockout on suspicious sign-in behavior
- `manual:account_management` — required upload proving the automated-disable workflow and its response timing (AC-2(13)); missing evidence is a failing assertion, and anything older than 365 days fails freshness

## Common gaps

1. **GuardDuty present but not ENABLED.** Detectors created during a trial and later suspended still exist — status is what counts.
2. **No findings aggregation.** GuardDuty on, Security Hub off: detections exist but there is no aggregated layer a response workflow subscribes to.
3. **Security Defaults switched off.** Common in tenants that moved to Conditional Access — if Defaults are your account-securing story for this KSI, they must actually be enabled.
4. **SCC never enabled.** GCP projects where Security Command Center was simply never turned on — no threat detection signal at all.
5. **Capability without workflow.** Everything above green, but no `manual:account_management` upload proving detection wires to automatic disabling within your stated window — capability alone does not satisfy "in response to suspicious activity."

## Notes for Boundera customers

Boundera verifies the standing infrastructure for KSI-IAM-SUS automatically across all three clouds and your IdP: `aws:guardduty`, `aws:securityhub`, `azure:entra_mfa`, `gcp:scc`, `okta:users`, and `okta:signin_policies`, each any-pass so one healthy detector per path is enough. You supply the workflow proof: a `manual:account_management` upload (runbook, SIEM rule export, incident timeline showing detection-to-disable) that the engine holds to 365-day freshness so it cannot quietly expire.

[Request a demo](https://boundera.io/request-demo) to see KSI-IAM-SUS check your real detectors and Okta lockout policies live — and exactly where the manual workflow evidence slots in beside them.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.IAM.indicators["KSI-IAM-SUS"]`
- NIST SP 800-53 Rev 5: AC-2, AC-2(1), AC-2(3), AC-2(13), AC-7, PS-4, PS-8
- Prowler FedRAMP 20x mapping (prowler-cloud/prowler#11701, unmerged): per-provider check IDs cited above
