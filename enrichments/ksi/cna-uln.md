---
id: KSI-CNA-ULN
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
  - KSI-CNA-RNT
  - KSI-CNA-MAT

oss_action_checks_this: false
---

## Plain English

This KSI asks whether logical networking is actually enforcing traffic flow controls — port restriction, encryption in transit, flow visibility, and no public data paths. Four proof points:

1. **Network rules restrict ports.** No security group, NSG, or firewall rule allows all ports or all protocols inbound.
2. **Traffic flows are encrypted.** No plain-HTTP load balancer listeners; HTTPS-only and TLS 1.2 minimums on storage and app services; SSL required on databases; S3 policies that deny non-TLS requests.
3. **Flows are observable.** VPC flow logs are enabled — you cannot enforce what you cannot see.
4. **Storage is not a public network path.** S3 Block Public Access fully on, Azure public blob access off, GCS uniform bucket-level access.

Every assertion here is scored per resource — one wide-open rule or one HTTP listener is an individually counted failure. The most common way CSPs fail it: a load balancer still serving a plain HTTP listener that was meant to be a redirect and never got converted.

## Implementation: AWS

- **Security groups** — no inbound rule allowing all ports: protocol `-1` or a `0–65535` port range fails (the engine parses both PascalCase and snake_case rule formats).
- **ELBv2** — every listener uses an encrypted protocol; any `HTTP` listener fails the load balancer. A load balancer with no listeners passes (nothing to protect).
- **S3** — two assertions per bucket: the bucket policy contains a `Deny` statement on `aws:SecureTransport: false` (a bucket with no policy at all fails — no enforcement), and all four Block Public Access settings are enabled.
- **VPC** — flow logs enabled per VPC.

## Implementation: Azure

- **NSGs** — no `Allow`/`Inbound` rule with destination port range `*` or `0-65535`.
- **App Service** — two assertions per app: HTTPS-only enforced, and minimum TLS version at least 1.2 (read from the app's configuration).
- **Storage accounts** — three assertions per account: HTTPS-only traffic enforced, minimum TLS version at least `TLS1_2`, and public blob access not allowed.

## Implementation: GCP

- **Firewall rules** — no rule allowing all protocols or all ports. Note the engine's strictness here: an `allowed` entry with `ip_protocol: all`, or one that lists no ports at all, is treated as all-ports and fails.
- **Cloud SQL** — SSL required per instance.
- **Cloud Storage** — uniform bucket-level access per bucket (disables object-level public ACLs).

## Evidence example

Passing evidence shows every matched resource conforming — all of these signals are per-resource (no any-pass), and the score is passing resources over total evaluated resources:

- `aws:security_groups` — no all-ports inbound rules per group.
- `azure:network_security_groups` — no all-ports Allow rules per NSG.
- `gcp:firewall_rules` — protocols/ports restricted per rule.
- `aws:elbv2` — all listeners on encrypted protocols per load balancer.
- `azure:app` — HTTPS-only and TLS 1.2 minimum per App Service (two assertions).
- `azure:storage_accounts` — HTTPS-only, TLS 1.2 minimum, and no public blob access per account (three assertions).
- `gcp:cloudsql` — SSL required per instance.
- `aws:s3_buckets` — SecureTransport enforced in the bucket policy and Block Public Access fully enabled per bucket (two assertions).
- `aws:vpc` — flow logs enabled per VPC.
- `gcp:storage_buckets` — uniform bucket-level access per bucket.

Evidence is refreshed on every connector scan; there is no manual-upload path for this KSI.

## Common gaps

1. **An all-ports rule.** Protocol `-1`, port range `0–65535`, destination port `*`, or a GCP allow entry with no port list — each is a per-resource failure on the segmentation leg.
2. **A plain HTTP listener.** Load balancers still carrying an unencrypted `HTTP` listener fail even when the HTTPS listener next to it is perfect.
3. **S3 buckets without a SecureTransport policy.** The engine requires an explicit `Deny` on `aws:SecureTransport: false`; a bucket with no policy fails — TLS being *possible* is not TLS being *enforced*.
4. **VPCs without flow logs.** No flow logs means no network visibility evidence for the CA-9 leg — a frequent gap in secondary regions.
5. **Weak TLS floors.** Storage accounts or App Services accepting TLS below 1.2 fail their minimum-version assertions even with HTTPS-only turned on.

## Notes for Boundera customers

Boundera evaluates KSI-CNA-ULN per resource across all three clouds — `aws:security_groups`, `azure:network_security_groups`, and `gcp:firewall_rules` for port restriction; `aws:elbv2`, `azure:app`, `azure:storage_accounts`, `gcp:cloudsql`, and `aws:s3_buckets` for encryption in transit; `aws:vpc` for flow visibility; and `aws:s3_buckets`, `azure:storage_accounts`, and `gcp:storage_buckets` for public-access controls. Every non-conforming rule, listener, and bucket is listed individually with the reason. Your setup work is connecting the cloud accounts in your boundary. [Request a demo](https://boundera.io/request-demo) to watch KSI-CNA-ULN sweep your real load balancer listeners, TLS floors, and firewall rules and show exactly which resource breaks the flow controls.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-ULN"]`)
- NIST SP 800-53 Rev 5: AC-12, AC-17(3), CA-9, SC-4, SC-7, SC-7(7), SC-8, SC-10
