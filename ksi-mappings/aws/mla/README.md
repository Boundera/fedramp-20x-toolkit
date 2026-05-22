# KSI-MLA on AWS

Maps **all 5 indicators** in the FedRAMP 20x Monitoring, Logging, and Auditing family to canonical AWS evidence sources.

This page is the practitioner walkthrough. The machine-readable version is in [`mapping.yaml`](mapping.yaml).

## At a glance

| Indicator | New ID | FKA | Canonical AWS evidence |
|---|---|---|---|
| Operating SIEM Capability | `KSI-MLA-OSM` | `KSI-MLA-01` | Security Hub cross-region aggregator + OpenSearch SIEM + Object Lock on log buckets |
| Reviewing Logs | `KSI-MLA-RVL` | `KSI-MLA-02` | CloudWatch Logs Insights scheduled queries with reviewer attestation |
| Evaluating Configurations | `KSI-MLA-EVC` | `KSI-MLA-05` | AWS Config `FedRAMP-Moderate` conformance pack, organization-wide |
| Logging Event Types | `KSI-MLA-LET` | `KSI-MLA-07` | CloudTrail (management + data + insights) + VPC Flow Logs v5 + Event-Type Inventory |
| Authorizing Log Access | `KSI-MLA-ALA` | `KSI-MLA-08` | S3 + KMS + Identity Center Permission Set with `session_duration ≤ PT4H` + log-of-logs |

> Provenance: FRMR documentation **v0.9.43-beta** (2026-04-08).

## A note on KSI-MLA-ALA

This is the one indicator in MLA whose requirement text differs between Low and Moderate impact. At Low it's marked **Optional** (recommended but not required). At Moderate it's required as written. The mapping file captures both variants in a `statements:` block keyed by impact level — the validator should treat the moderate variant as the strict version and apply it whenever the system in question is operating at Moderate or higher.

## Indicator-by-indicator notes

### KSI-MLA-OSM — Operating SIEM Capability

The two words that matter: **centralized** and **tamper-resistant**.

*Centralized* doesn't mean "we have CloudTrail enabled everywhere." It means there's a single pane of glass — a place an analyst goes to see events from every region, every account, every workload. In AWS that's typically Security Hub (for findings) plus Amazon OpenSearch Service or a third-party SIEM (for raw logs). Splunk, Sumo, Datadog all count if they're actually ingesting and correlating.

*Tamper-resistant* is the part most CSPs underspec. CloudTrail log file validation must be enabled. The S3 bucket storing logs must have Object Lock in **Compliance** mode (not Governance — Governance mode lets account roots delete locked objects). The KMS key must have a policy that prevents the same account's IAM admins from deleting it.

The forensics question to ask yourself: *if an attacker compromised an account admin, could they erase the trail of how they got in?* If the answer is yes, Object Lock isn't configured correctly.

### KSI-MLA-RVL — Reviewing Logs

`Persistently` again. The intent is continuous, not periodic. The implementation is a set of CloudWatch Logs Insights queries that run on a schedule and produce an attestation trail.

The 3PAO will look for:
1. A documented list of queries with their purpose (privileged action anomalies, root account use, policy changes, failed authentications, etc.).
2. Evidence that each query actually ran on its schedule — not just that it *could* run.
3. A reviewer attestation field on every execution. "Alice triaged this on 2026-05-22 at 09:14 UTC, marked 2 of 3 findings as false positives, escalated 1."
4. A triage SLA being measured and met.

The frequent gap: queries are defined in CloudFormation but nobody scheduled them. They sit dormant until a quarterly review.

### KSI-MLA-EVC — Evaluating Configurations

This indicator covers two distinct things: runtime configuration evaluation, and pre-deployment IaC evaluation. AWS's `Operational-Best-Practices-for-FedRAMP-Moderate` conformance pack handles the runtime side beautifully — deploy it organization-wide via Config aggregator and you get a daily compliance score across all 168 (as of 2026) Moderate rules.

The IaC side is where teams cut corners. Static analysis (checkov, tfsec, cfn-lint) runs on commit but findings don't block merge. The result: drift between the IaC baseline and runtime reality. Fix: make critical findings blocking, integrate Config-driven drift detection.

### KSI-MLA-LET — Logging Event Types

The literal requirement: maintain a *list* of resources and event types, *then do so*. Two separate things — having the inventory document, and actually logging according to it.

A real Event-Type Inventory covers:
- **Management events** (the CloudTrail default). Easy.
- **Data events** (S3 object-level, Lambda invocations, DynamoDB item-level). Expensive at scale, and easy to forget when new resources spin up.
- **Insights events** (CloudTrail Insights — `ApiCallRateInsight`, `ApiErrorRateInsight`). Most CSPs leave these off because they cost money.
- **VPC Flow Logs**, preferably at format version 5 with custom fields so you can filter on things like `pkt-src-aws-service`.
- **OS / application logs** sent to CloudWatch Logs or directly to OpenSearch.

The inventory has to be versioned, reviewed quarterly, and reviewed again on every significant change. If your last review was 6 months ago, expect a finding.

### KSI-MLA-ALA — Authorizing Log Access

The defense-in-depth recipe in AWS:

1. **S3 bucket policy** on the log bucket explicitly denies any principal except a small allowlist of Identity Center Permission Sets.
2. **KMS key policy** on the encryption key requires the same allowlist for `kms:Decrypt`.
3. **Identity Center Permission Set** for log readers has `session_duration ≤ PT4H` (just-in-time).
4. **Log-of-logs**: every read of the audit logs is itself logged to a separate S3 bucket. Reading the audit logs leaves a footprint.
5. **Object Lock Compliance mode** prevents anyone — including the account root — from deleting historical logs.

At Low impact this is recommended; at Moderate it's required as written.

## What this mapping does NOT cover

- **Azure equivalents** (Sentinel, Log Analytics Workspace, Defender for Cloud). v0.2.
- **GCP equivalents** (Cloud Logging, Chronicle SIEM, Cloud Audit Logs). v0.2.
- **Self-hosted SIEM stacks** (Splunk Enterprise on EC2, Wazuh, ELK). Out of scope.
- **The other six KSI families.**

## Contributing

We accept PRs adding more AWS evidence sources to indicators in this file — for example, a CloudWatch Logs Insights query template for `KSI-MLA-RVL`, or a specific GuardDuty finding type to monitor. See [`/CONTRIBUTING.md`](../../../CONTRIBUTING.md).
