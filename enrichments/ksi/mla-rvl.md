---
id: KSI-MLA-RVL
kind: ksi
family: MLA
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
  - KSI-MLA-OSM
  - KSI-MLA-LET
  - KSI-MLA-ALA

oss_action_checks_this: false
---

## Plain English

Collecting logs is the other MLA indicators' job; this one asks whether anyone **looks at them** — persistently. Review is proven by the state of your alerting and triage tooling, not by a policy document:

1. Alerts derived from logs actually reach humans — every notification route ends at a real receiver (a person, channel, or on-call integration), not a dead end.
2. Security detections get triaged: nothing sits in "new" status, because "new" means no human has looked.
3. High-impact detections are driven to closure, not just acknowledged — critical and high findings must be resolved, not merely moved out of the inbox.
4. Incidents raised from log review move through a workflow with recorded state changes.

The engine reads this from the tools where review actually happens — Grafana (alert routing), CrowdStrike (detection triage), and ServiceNow (incident workflow). Because review lives in this tool layer, coverage is provider-neutral: the same signals attest review of logs originating from AWS, Azure, and GCP alike. The most common way CSPs fail it: a healthy pipeline feeding a detection queue where findings pile up in "new" for weeks — collection without review.

## Evidence example

A passing evaluation contains three per-resource signals (no manual-evidence slot; results reflect the latest connector scan):

- `grafana:alert_rules` — evaluated here against Grafana notification policies: each policy has a receiver configured, so firing alerts reach someone (assertion `grafana_alert_rules`). A policy with no receiver fails with "alerts won't reach anyone."
- `crowdstrike:detections` — each detection has been triaged past `new` status, **and** any detection with `critical` or `high` severity also has a closed timestamp (assertion `crowdstrike_detections`). Untriaged or unresolved high-severity detections fail.
- `servicenow:incidents` — each incident has moved beyond the New state (state `1`/`new` fails) — someone reviewed and progressed it (assertion `servicenow_incidents`).

Upstream Prowler mapping context: prowler-cloud/prowler#11701 maps per-service logging-enablement checks to this KSI — e.g. `vpc_flow_logs_enabled` (AWS), `sqlserver_auditing_enabled` (Azure), `cloudsql_instance_postgres_log_connections_flag` (GCP). Those prove reviewable logs exist; the signals above prove the review happens. Strong evidence packages show both.

## Common gaps

1. **Receiver-less notification policies.** The alert rule fires, the notification policy matches, and the alert goes nowhere — a routing tree edited during an org change and never re-pointed at a contact.
2. **Detections stuck in "new."** The EDR queue accumulates findings no analyst has opened. Every detection still in `new` (or with no status at all) fails — this is the single clearest "logs are not reviewed" signal.
3. **Acknowledged-but-never-closed criticals.** A critical or high detection moved to "in progress" months ago with no closure. Triage alone does not pass at those severities; the engine requires a closed timestamp.
4. **Incidents parked in New.** ServiceNow tickets auto-created from alerts that nobody picks up — state `1` is treated as unreviewed.
5. **Review happens, tooling disconnected.** Analysts triage in a tool the platform cannot see, so no automated evidence exists. Connect the tools where triage actually occurs, or the KSI has nothing to score.

## Notes for Boundera customers

Boundera evaluates KSI-MLA-RVL from three connectors: `grafana:alert_rules` (notification-policy routing), `crowdstrike:detections` (triage and closure state), and `servicenow:incidents` (incident workflow progress). Every unrouted policy, untriaged detection, and untouched incident surfaces as a named per-resource finding on each scan — so a stalled review process flips the indicator before your assessor samples the queue. The signals are tool-based rather than cloud-based, which means one connected triage stack covers log review across AWS, Azure, and GCP simultaneously.

Setup on your side: connect Grafana, CrowdStrike, and ServiceNow (whichever of these your operation uses — each connected tool adds its signal). [Request a demo](https://boundera.io/request-demo) to see KSI-MLA-RVL score your live detection queue and show exactly which findings have been sitting in "new."

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.MLA.indicators["KSI-MLA-RVL"]`
- NIST SP 800-53 Rev 5: AC-2(4), AC-6(9), AU-2, AU-6, AU-6(1), SI-4, SI-4(4)
- Prowler KSI mapping: prowler-cloud/prowler#11701 (checks cited above)
