---
id: KSI-CMT-LMC
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
  - KSI-CMT-RMV
  - KSI-CMT-VTD
  - KSI-CMT-RVP

oss_action_checks_this: false
---

## Plain English

This KSI asks whether changes to your offering are both **captured** and **watched**. Proving it takes four things:

1. Control-plane changes land in an audit trail everywhere your system runs — CloudTrail across all regions on AWS, Activity Log exported via diagnostic settings on Azure, audit-log sinks with a real destination on GCP.
2. Configuration state changes are recorded, not just API calls — an actively-recording AWS Config recorder, or GCP log-based metrics with a filter that captures change events.
3. A human gets notified: CloudWatch alarms with actions enabled, Azure Activity Log alert rules enabled, GCP alert policies enabled. Logging without alerting is only half the KSI ("logged **and monitored**").
4. Code and process changes flow through a tracked workflow — pull/merge request review enforced by branch protection in GitHub, GitLab, or Bitbucket, and/or formal change records in Jira or ServiceNow.

The most common way CSPs fail this one: the logging half exists but the monitoring half doesn't — trails and alert rules are configured, yet alarm actions are disabled or empty, so changes are recorded that nobody will ever see.

## Implementation: AWS

Three signals cover the capture-record-notify chain on AWS. Each is evaluated per resource; AWS is covered once at least one of its resources passes.

- **CloudTrail** (`aws:cloudtrail`) — every trail must have logging enabled **and** be multi-region. A single-region trail fails: change events outside its home region are never captured.
- **AWS Config** (`aws:config`) — every configuration recorder must be actively recording. A recorder that exists but is stopped fails: API-call logging alone does not prove configuration-state changes are captured.
- **CloudWatch alarms** (`aws:cloudwatch_alarms`) — every metric alarm must have actions enabled **and** at least one alarm action attached (an SNS topic or similar). An alarm with an empty action list fails: change events would trigger no notification.

## Implementation: Azure

Two assertions, both carried by the `azure:activity_log` signal over Azure Monitor resources.

- **Diagnostic settings** (`azure:activity_log`) — each diagnostic setting must have at least one enabled log category, proving the Activity Log is actually being exported (to a Log Analytics workspace or storage account) rather than merely retained by default.
- **Activity Log alert rules** (`azure:activity_log`) — each alert rule must be enabled. A disabled rule fails: change events would trigger no notification.

## Implementation: GCP

Three assertions across Cloud Logging and Cloud Monitoring.

- **Logging sinks** (`gcp:audit_logs`) — each sink must have an export destination. A sink with no destination fails: audit logs are not being exported anywhere durable.
- **Log-based metrics** (`gcp:audit_logs`) — each log-based metric must have a filter pattern, proving change events are actually being distilled into monitorable signals.
- **Alert policies** (`gcp:monitoring`) — each Cloud Monitoring alert policy must be enabled, closing the loop from captured change event to human notification.

## Evidence example

Boundera evaluates this KSI provider-by-provider: score = covered providers / counted providers, where a provider is covered once at least one of its resources passes. Two scoring rules worth knowing exactly:

- A **connected cloud provider (AWS, Azure, GCP) that returns zero evidence is stubbed in as a failing provider** — connecting a cloud and going dark counts against you rather than being silently skipped.
- **Non-cloud providers (Jira, ServiceNow, GitHub, GitLab, Bitbucket) with no evidence simply drop out of scoring** — they don't fail you, but they can't cover you either.

Passing automated evidence contains these signals (each row carries the `collected_at` timestamp of the most recent connector scan). The cloud signals, as detailed in the provider sections above:

- `aws:cloudtrail` — trail is logging, multi-region
- `aws:config` — recorder actively recording
- `aws:cloudwatch_alarms` — alarm actions enabled, at least one action wired
- `azure:activity_log` — diagnostic settings export at least one enabled log category; alert rules enabled
- `gcp:audit_logs` — sinks have a destination; log-based metrics have a filter
- `gcp:monitoring` — alert policies enabled

Plus the change-workflow signals:

- `jira:change_tickets` — issues are `Change` / `Change Request` type records
- `servicenow:change_requests` — change requests have been submitted for approval (not sitting in Draft state)
- `github:branch_protection` — the default branch is protected and requires at least one approving PR review
- `gitlab:branch_protection` — the default branch restricts both push and merge access, routing changes through MR workflow
- `bitbucket:pull_requests` — at least one default reviewer is configured per repo (the evidence also reports the recently-merged PR count as activity proof)

## Common gaps

1. **Single-region CloudTrail.** The trail is logging, but only in its home region — change events elsewhere in the boundary are never captured, and the signal fails on `is_multiregion`.
2. **Alerting theater.** Alarms and alert rules exist but are disabled or have no actions attached — AWS CloudWatch alarms with an empty action list, Azure alert rules toggled off, GCP alert policies disabled. Change events fire into the void.
3. **Config recorder created once, stopped since.** The recorder exists in the account but `recording` is off, so configuration drift is invisible.
4. **Dead-end GCP logging.** A sink with no destination, or a log-based metric with no filter — the plumbing exists but exports or captures nothing.
5. **Untracked merge paths.** A GitHub default branch without required reviews, a GitLab branch without push/merge restrictions, or a Bitbucket repo with no default reviewers — changes land in production code with no approval trail. On the ITSM side, ServiceNow change requests stuck in Draft prove intent, not tracking.

## Notes for Boundera customers

Boundera evaluates KSI-CMT-LMC continuously from your connectors, grouped per provider: `aws:cloudtrail`, `aws:config`, and `aws:cloudwatch_alarms` on AWS; `azure:activity_log` (diagnostics + alert rules) on Azure; `gcp:audit_logs` and `gcp:monitoring` on GCP; `jira:change_tickets` and `servicenow:change_requests` for ITSM change records; and `github:branch_protection`, `gitlab:branch_protection`, `bitbucket:pull_requests` for SCM change workflow. Each connected domain must independently demonstrate change logging — one healthy provider cannot mask another that has gone dark.

What still needs you: connect the connectors for every provider actually in your boundary, and make sure alerting resources (alarms, alert rules, policies) exist so the monitoring half has something to evaluate. [Request a demo](https://boundera.io/request-demo) to watch KSI-CMT-LMC score your real CloudTrail trails, Activity Log settings, and audit-log sinks provider by provider.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CMT.indicators["KSI-CMT-LMC"]`)
- NIST SP 800-53 Rev 5: AU-2, CM-3, CM-3(2), CM-4(2), CM-6, CM-8(3), MA-2
