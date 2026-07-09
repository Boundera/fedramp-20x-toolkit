---
id: KSI-SVC-EIS
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
  - KSI-SVC-ACM
  - KSI-SVC-PRR

oss_action_checks_this: false
---

## Plain English

You need to show that security evaluation is continuous and that it feeds actual improvement:

1. Every cloud you operate in has at least one persistent evaluation mechanism actively running — threat detection, posture scoring, configuration recording, or monitoring with alerting. One well-instrumented cloud does not cover a second, bare one.
2. Endpoint and observability layers evaluate too — endpoint protection policies are enabled, and monitoring alert rules are active rather than paused.
3. Detection is not quietly bypassed — endpoint exclusions are scoped, not applied globally.
4. The procedural side (maintenance, architecture review, supply-chain improvement) is documented in a security evaluation report refreshed at least annually.

The most common failure mode: a CSP connects two clouds, has strong tooling in the primary one, and nothing enabled in the secondary — provider-grouped scoring fails the silent cloud instead of averaging it away.

## Implementation: AWS

The engine accepts any one of five AWS mechanisms as proof for the AWS group:

- GuardDuty detectors enabled in the account (`aws:guardduty:detectors`)
- Security Hub in `ACTIVE` status with standards or integrations configured (`aws:securityhub:securityhubs`)
- CloudTrail trails actively logging (`aws:cloudtrail:trails`)
- CloudWatch alarms with actions enabled and alarm actions attached (`aws:cloudwatch:metric_alarms`)
- AWS Config recorders actively recording (`aws:config:recorders`)

The Prowler PR's mapping for this KSI is sparse on AWS (a single Trusted Advisor subscription check), so the engine's coverage here is substantially broader than the Prowler cross-check.

## Implementation: Azure

Any one of three Azure mechanisms covers the Azure group:

- Microsoft Defender active for the subscription, or a non-zero secure score percentage (`azure:security:secure_scores`)
- Diagnostic settings configured (`azure:monitor:diagnostics_settings`)
- Azure Policy assignments enforcing — not `DoNotEnforce`, and not the placeholder row for a subscription with zero assignments (`azure:policy:policy_assigments`)

The Prowler PR maps no Azure checks to this KSI.

## Implementation: GCP

Any one of four GCP mechanisms covers the GCP group:

- Security Command Center enabled for the project (`gcp:scc:summary`)
- Logging sinks with a destination configured (`gcp:logging:sinks`)
- Monitoring alert policies enabled with filters (`gcp:monitoring:alert_policies`)
- Cloud Asset Inventory enabled (`gcp:cloudasset:summary`)

The Prowler PR maps no GCP checks to this KSI.

## Evidence example

Passing evidence combines cloud, endpoint, observability, and manual layers:

- Cloud signals (provider-grouped, any one passing mechanism covers its cloud): `aws:guardduty`, `aws:securityhub`, `aws:cloudtrail`, `aws:cloudwatch_alarms`, `aws:config`, `azure:defender_secure_score`, `azure:activity_log`, `azure:policy`, `gcp:scc`, `gcp:audit_logs`, `gcp:monitoring`, `gcp:cloudasset`. A connected cloud with no evidence at all is counted as failing, not skipped.
- Endpoint signals: `crowdstrike:prevention_policies` (a policy enabled with configured settings) and `crowdstrike:exclusions` (two assertions — every IOA exclusion and every ML exclusion must be scoped, i.e. not applied globally).
- Observability signals: `grafana:alert_rules` (active, unpaused rules with a condition) and `grafana:datasources` (configured datasources).
- `manual:security_evaluation_report` — a human-produced security evaluation covering the procedural controls (MA-2, PL-8, SR-10), no older than 365 days.

## Common gaps

1. **The silent second cloud.** Azure or GCP is connected for one workload but Defender/SCC, diagnostics, and policy are all absent — that provider group fails on "connected but no passing mechanism."
2. **Security Hub enabled with nothing in it.** Status `ACTIVE` but no standards or integrations configured fails the condition; an empty aggregator evaluates nothing.
3. **Policy engines in audit-only mode.** Every Azure Policy assignment set to `DoNotEnforce` — evaluation without enforcement does not demonstrate improvements being made.
4. **Global endpoint exclusions.** A CrowdStrike IOA or ML exclusion applied globally is flagged: it bypasses the very evaluation this KSI requires.
5. **Stale or missing evaluation report.** The automated signals cannot attest to maintenance and architecture review; a `manual:security_evaluation_report` older than 365 days flips that portion to failing.

## Notes for Boundera customers

Boundera scores KSI-SVC-EIS per provider: each cloud you connect must show at least one live evaluation mechanism among `aws:guardduty`, `aws:securityhub`, `aws:cloudtrail`, `aws:cloudwatch_alarms`, `aws:config`, `azure:defender_secure_score`, `azure:activity_log`, `azure:policy`, `gcp:scc`, `gcp:audit_logs`, `gcp:monitoring`, and `gcp:cloudasset`, with `crowdstrike:prevention_policies`, `crowdstrike:exclusions`, `grafana:alert_rules`, and `grafana:datasources` covering endpoints and observability. Upload your annual security evaluation report as `manual:security_evaluation_report` and the engine enforces its 365-day freshness. [Request a demo](https://boundera.io/request-demo) to see KSI-SVC-EIS score each of your clouds side by side and expose the one with no active evaluation.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-EIS"]`)
- NIST SP 800-53 Rev 5: CM-7(1), CM-12(1), MA-2, PL-8, SC-7, SC-39, SI-2(2), SI-4, SR-10
- Prowler FedRAMP 20x mappings: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
