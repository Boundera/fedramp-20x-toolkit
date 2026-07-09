---
id: KSI-MLA-OSM
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
  - KSI-MLA-LET
  - KSI-MLA-RVL
  - KSI-MLA-ALA

oss_action_checks_this: false
---

## Plain English

Owning a SIEM license is not the bar. This KSI asks whether a SIEM (or an equivalent centralized system) is **operating** — used and persistently reviewed for centralized, tamper-resistant logging of events, activities, and changes. You need to show:

1. Log and audit data from your in-scope systems is centralized into one queryable place — a SIEM or a similar aggregation layer.
2. That system is in active use: alerting is wired up and healthy, not paused, erroring, or abandoned after setup.
3. The logging pipeline is tamper-resistant (integrity validation, retention/immutability on stored logs) — this part is largely proven through your logging platform's configuration rather than the SIEM UI.

The most common way CSPs fail it: a SIEM stood up before the assessment whose alert rules have been paused or sitting in an error state for months — centralization exists, operation does not.

## Implementation: AWS

For this KSI the engine has no AWS-native signal; AWS coverage arrives through the observability layer. Point a Grafana datasource of type `cloudwatch` at the account so CloudTrail/CloudWatch Logs data is queryable centrally — the engine recognizes it as a log/audit source (see Evidence below) and scores your alert rules over it.

For the tamper-resistance and centralization posture on the AWS side, independently checkable via Prowler: `cloudtrail_cloudwatch_logging_enabled`, `cloudtrail_log_file_validation_enabled`, `cloudtrail_kms_encryption_enabled`, `cloudwatch_log_group_retention_policy_specific_days_enabled`.

## Implementation: Azure

Azure is the one provider with a direct cloud signal here: the engine reads Azure Monitor alert rules (`azure:monitor:alert_rules` evidence) and passes each rule only when `enabled` is true. A disabled alert rule fails — monitoring that has been switched off is the exact failure mode this KSI targets. A Grafana datasource of type `azuremonitor` additionally counts as a recognized log/audit source.

Independently checkable via Prowler: `keyvault_logging_enabled`.

## Implementation: GCP

As with AWS, GCP coverage flows through the observability layer: a Grafana datasource of type `stackdriver` (Google Cloud Monitoring/Logging) makes GCP audit data part of your centralized view, and the engine's alert-rule signal covers rules built on it.

Independently checkable via Prowler: `iam_audit_logs_enabled`, `logging_sink_created`, `cloudstorage_bucket_log_retention_policy_lock`.

## Evidence example

A passing evaluation contains three per-resource signals (no manual-evidence slot; results reflect the latest connector scan):

- `grafana:datasources` — each Grafana datasource is a recognized log/audit backend: type `loki`, `elasticsearch`, `cloudwatch`, `azuremonitor`, `stackdriver`, `prometheus`, or `tempo` (assertion `grafana_datasources`). A datasource of any other type fails as "not a recognised log/audit source."
- `grafana:alert_rules` — each alert rule is actively monitoring: its state is not `error`/`Error` and not `paused`/`Paused` (assertion `grafana_alert_rules`).
- `azure:activity_log` — each Azure Monitor alert rule is enabled (assertion `azure_activity_log`).

Strong packages pair these with tamper-resistance artifacts the engine does not collect for this KSI: log-file integrity validation settings, retention-lock or object-lock configuration, and SIEM access records (the access-control half lives in KSI-MLA-ALA).

## Common gaps

1. **Paused alert rules.** Silenced during a noisy incident or a maintenance window and never resumed — the engine fails any rule in a `paused` state.
2. **Alert rules in error.** A renamed datasource or broken query leaves rules erroring indefinitely; nobody notices because the alerts that would tell you are the ones broken.
3. **Disabled Azure Monitor alert rules.** Rules toggled off subscription-side fail the `azure:activity_log` signal even if Grafana looks healthy.
4. **Non-log datasources in the mix.** Grafana datasources pointing at business databases or generic JSON APIs fail the recognized-source check — keep the compliance-scoped Grafana instance focused on log/audit backends.
5. **Centralization without tamper-resistance.** Everything is in the SIEM, but log-file validation, KMS encryption, or retention locks were never enabled upstream — assessors will ask how you would detect log tampering, and the SIEM alone cannot answer.

## Notes for Boundera customers

Boundera evaluates KSI-MLA-OSM from your Grafana and Azure connectors: `grafana:datasources` proves your centralized layer is actually wired to log/audit backends (CloudWatch for AWS, Azure Monitor, Google Cloud operations, or self-hosted stacks like Loki and Elasticsearch), `grafana:alert_rules` proves the system is in active use rather than shelfware, and `azure:activity_log` verifies Azure Monitor alert rules stay enabled. AWS and GCP participation is deliberately provider-neutral — it flows through the datasources you centralize, while the underlying trail/sink health is scored by the sibling KSI-MLA-LET.

Setup on your side: connect Grafana (and Azure, if in scope) so the engine can see datasources and alert-rule state. [Request a demo](https://boundera.io/request-demo) to watch KSI-MLA-OSM score your real Grafana datasources and surface the alert rules that have been sitting paused since your last incident.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.MLA.indicators["KSI-MLA-OSM"]`
- NIST SP 800-53 Rev 5: AC-17(1), AC-20(1), AU-2, AU-3, AU-3(1), AU-4, AU-5, AU-6(1), AU-6(3), AU-7, AU-7(1), AU-8, AU-9, AU-11, IR-4(1), SI-4(2), SI-4(4), SI-7(7)
- Prowler KSI mapping: prowler-cloud/prowler#11701 (checks cited above)
