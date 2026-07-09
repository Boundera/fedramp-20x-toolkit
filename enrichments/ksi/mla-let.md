---
id: KSI-MLA-LET
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
  - KSI-MLA-RVL
  - KSI-MLA-EVC

oss_action_checks_this: false
---

## Plain English

This KSI has two halves: a maintained *list* of which information resources and event types you log, monitor, and audit — and proof that the logging on that list **actually occurs** and the list is persistently reviewed. You need to show:

1. A documented inventory of logged resources and event types (the list itself is a human-maintained artifact — no API can produce it for you).
2. The audit trails behind that list are live: your cloud control-plane and activity logging is enabled and capturing, not merely configured once.
3. Recurring review that the list still matches reality as your boundary changes.

Boundera's engine automates the second half — verifying per resource that logging is switched on across AWS, Azure, and GCP. The most common way CSPs fail it: the trail or diagnostic setting exists in the console, but logging was stopped (or never captured audit categories), so the "list" describes activity that is not happening.

## Implementation: AWS

The engine inspects every CloudTrail trail (`aws:cloudtrail:trails` evidence) and passes a trail only when `is_logging` is true. A trail that exists but has been stopped — the classic `StopLogging` bypass — fails with "logging disabled."

One engine behavior worth knowing: connector scans can include synthetic per-region CloudTrail rows for regions with no local trail. When a real multi-region trail is actively logging, the engine suppresses those placeholder rows so they do not pollute the score; when **no** multi-region trail is logging, they remain visible — which is exactly when you want the per-region gap surfaced. Practical takeaway: run one organization or multi-region trail with logging on.

## Implementation: Azure

The engine inspects Monitor diagnostic settings (`azure:monitor:diagnostics_settings` evidence). A setting passes only when both are true:

- It has a real destination — a Log Analytics workspace, a storage account, or an Event Hub authorization rule.
- At least one enabled log entry captures audit-relevant events: category group `audit` or `allLogs`, or an explicit category among `Administrative`, `Security`, `Policy`.

A diagnostic setting that only ships metrics, only covers non-audit categories, or has no destination fails as "not capturing logs."

## Implementation: GCP

The engine inspects Cloud Logging sinks (`gcp:logging:sinks` evidence) and passes a sink only when `enabled` is true. A defined-but-disabled sink fails as "not enabled."

## Evidence example

A passing evaluation contains three per-resource signals — there is no manual-evidence slot on this KSI, so results reflect the latest connector scan:

- `aws:cloudtrail` — every real CloudTrail trail is actively logging (`is_logging` true); placeholder region rows are suppressed when a multi-region trail is live (assertion `aws_cloudtrail`).
- `azure:activity_log` — every diagnostic setting routes enabled audit categories (Administrative / Security / Policy, or the `audit` / `allLogs` group) to a workspace, storage account, or Event Hub (assertion `azure_activity_log`).
- `gcp:audit_logs` — every Cloud Logging sink is enabled (assertion `gcp_audit_logs`).

Pair the automated signals with your logged-event-types inventory: a table of information resources, the event types captured for each, and the review cadence. Assessors read the two together — the list says what should be logged, the signals prove it is.

## Common gaps

1. **Trail stopped, not deleted.** CloudTrail still shows in the console but `is_logging` is false — often the residue of an incident, a cost-cutting change, or an attacker's `StopLogging` call.
2. **Single-region coverage.** With no multi-region trail actively logging, the per-region placeholder rows stay in scope and fail — surfacing every region your trail does not cover.
3. **Metrics-only diagnostic settings.** The Azure setting exists but no log category is enabled, or the enabled categories exclude Administrative/Security/Policy — activity is monitored, audit events are not.
4. **Destination-less settings and disabled sinks.** An Azure diagnostic setting with no workspace/storage/Event Hub target, or a GCP sink toggled off — configuration that produces nothing.
5. **No maintained list.** Everything green in the cloud, but no documented inventory of resources and event types, and no review record. The engine cannot attest this half — assessors will ask for the artifact.

## Notes for Boundera customers

Boundera evaluates KSI-MLA-LET continuously from your cloud connectors: `aws:cloudtrail` verifies every trail is actually logging (with multi-region placeholder suppression so a healthy org trail is not drowned in synthetic region noise), `azure:activity_log` verifies diagnostic settings capture audit categories to a real destination, and `gcp:audit_logs` verifies log sinks are enabled. Coverage is symmetric across all three providers — connect the accounts in your boundary and each trail, setting, and sink is scored per resource on every scan.

What stays with you: the logged-event-types inventory and its recurring review. [Request a demo](https://boundera.io/request-demo) to see KSI-MLA-LET evaluate your real trails, diagnostic settings, and log sinks — and flag the region or subscription where logging quietly stopped.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.MLA.indicators["KSI-MLA-LET"]`
- NIST SP 800-53 Rev 5: AC-2(4), AC-6(9), AC-17(1), AC-20(1), AU-2, AU-7(1), AU-12, SI-4(4), SI-4(5), SI-7(7)
