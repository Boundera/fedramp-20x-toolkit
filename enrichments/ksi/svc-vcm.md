---
id: KSI-SVC-VCM
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
  - KSI-SVC-SIN
  - KSI-SVC-VRI

oss_action_checks_this: false
---

## Plain English

This KSI covers machine-to-machine trust: when your services talk to each other, can each side prove who it is talking to and that the message arrived unmodified? (Under the 2026 rules this indicator is optional for Class B and required for Class C.) You need to prove:

1. **Session authenticity (SC-23), per resource:** every communication endpoint — bucket, load balancer, API gateway, search domain, storage account, app service — enforces authenticated, encrypted sessions (TLS/HTTPS, client certificates, node-to-node encryption).
2. **Integrity verification (SI-7(1)), at least one active mechanism:** something cryptographically or systematically verifies that records of communications have not been tampered with — CloudTrail log-file validation, Azure diagnostics, GCP logging sinks, or active alert rules.
3. **Certificate hygiene, on a cycle:** a human-reviewed TLS/certificate review refreshed at least annually covers what automation cannot attest.

The most common failure: HTTPS is available on an endpoint but not enforced — plain HTTP is still accepted, so session authenticity cannot be demonstrated for that resource.

## Implementation: AWS

Per-resource authenticity signals: S3 bucket policies must deny insecure transport (`aws:SecureTransport: false` deny statement covering S3 actions); classic ELBs must have only SSL/HTTPS listeners; ALBs/NLBs (`aws:elbv2:loadbalancersv2`) must use HTTPS/TLS listeners or HTTP-to-HTTPS redirects; API Gateway REST APIs must have client certificates enabled on their stages; OpenSearch domains must have node-to-node encryption. For integrity, CloudTrail trails with `log_file_validation_enabled` count as the AWS mechanism (one validating trail suffices).

## Implementation: Azure

Per-resource authenticity signals: storage accounts must enforce HTTPS-only traffic with minimum TLS 1.2 or newer (an unset minimum-TLS field is treated as the platform default and passes); App Services must be HTTPS-only. For integrity, a configured diagnostic setting (`azure:monitor:diagnostics_settings`) counts as the Azure mechanism.

## Implementation: GCP

Cloud Storage buckets pass the authenticity signal by default — the engine records each bucket and treats Google's always-on HTTPS enforcement as satisfying it, so this signal documents coverage rather than discriminating between buckets. For integrity, a logging sink with a destination (`gcp:logging:sinks`) counts as the GCP mechanism.

## Evidence example

Passing evidence has three layers:

- Per-resource session-authenticity signals (every resource must pass): `aws:s3_buckets` (secure-transport deny policy), `aws:elb` (SSL/HTTPS-only listeners), `aws:elbv2` (TLS listeners or HTTPS redirect), `aws:apigateway` (client certificates per stage), `aws:opensearch` (node-to-node encryption), `azure:storage_accounts` (HTTPS-only plus TLS 1.2+), `azure:app` (HTTPS-only), `gcp:storage_buckets` (HTTPS by default).
- Integrity-verification signals (each scored as a single capability check — one passing resource suffices per signal): `aws:cloudtrail` (log-file validation enabled), `azure:activity_log` (diagnostic settings configured), `gcp:audit_logs` (sink with destination), `grafana:alert_rules` (active, unpaused rules with conditions).
- `manual:tls_certificate_review` — a certificate/TLS review artifact no older than 365 days.

## Common gaps

1. **Buckets without the transport-deny policy.** The S3 signal reads the bucket policy itself; encryption settings elsewhere do not substitute for the explicit deny on insecure transport.
2. **A forgotten plain-HTTP listener.** One classic-ELB or ALB listener on HTTP without a redirect fails that load balancer even when every other listener is TLS.
3. **API Gateway stages without client certificates.** Client certs are the signal's proof that the backend authenticates the gateway — stages missing them fail per stage.
4. **TLS floor never raised.** Azure storage accounts explicitly configured below TLS 1.2, or App Services with `https_only` disabled.
5. **No integrity mechanism at all.** Trails logging without log-file validation, no diagnostics, no sinks, alert rules paused — the SI-7(1) half then has nothing to stand on.
6. **Stale certificate review.** A `manual:tls_certificate_review` older than a year flips the manual portion to failing.

## Notes for Boundera customers

Boundera evaluates KSI-SVC-VCM per endpoint: `aws:s3_buckets`, `aws:elb`, `aws:elbv2`, `aws:apigateway`, `aws:opensearch`, `azure:storage_accounts`, `azure:app`, and `gcp:storage_buckets` are each checked resource-by-resource, while `aws:cloudtrail`, `azure:activity_log`, `gcp:audit_logs`, and `grafana:alert_rules` prove the integrity-verification capability. Upload your TLS/certificate review as `manual:tls_certificate_review` and the engine enforces 365-day freshness. [Request a demo](https://boundera.io/request-demo) to watch KSI-SVC-VCM find the one load balancer listener in your boundary that still answers plain HTTP.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-VCM"]`)
- NIST SP 800-53 Rev 5: SC-23, SI-7(1)
