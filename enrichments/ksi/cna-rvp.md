---
id: KSI-CNA-RVP
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
  - KSI-CNA-OFA

oss_action_checks_this: false
---

## Plain English

This KSI is not just "do you have DDoS protection" — it is "do you persistently review whether that protection works." It is a hybrid: automated signals prove the protections exist, and a human-produced artifact proves someone reviewed their effectiveness. Three proof points:

1. **DoS and unwanted-traffic protections are actually deployed** — Shield and WAFv2 on AWS, WAF policies on Azure, Cloud Armor on GCP.
2. **A network firewall or IDS backs them up** — AWS Network Firewall, Azure Firewall, or GCP Cloud IDS.
3. **You can produce a recent review of effectiveness** — a penetration test, DDoS simulation report, WAF rule-tuning review, or equivalent — and it recurs: evidence older than 365 days fails.

The most common way CSPs fail it: the protections exist and the dashboards are green, but nobody can produce a document showing the protections were ever reviewed for effectiveness. Tooling without review is only half this KSI.

## Implementation: AWS

- **Shield** — at least one Shield protection active.
- **WAFv2** — at least one web ACL configured (the traffic-filtering layer).
- **Network Firewall** — a named Network Firewall deployment.

## Implementation: Azure

- **WAF** — WAF/DDoS protection active in the subscription (Application Gateway WAF or Front Door WAF).
- **Azure Firewall** — active in the subscription.

## Implementation: GCP

- **Cloud Armor** — security policies present in the project (the DDoS/WAF layer).
- **Cloud IDS** — endpoints active in the project.

## Evidence example

A passing evidence package has two parts.

Automated signals (all any-pass — one conforming resource satisfies each):

- `aws:shield` — a Shield protection is active.
- `aws:waf` — a WAFv2 web ACL is configured.
- `azure:waf` — WAF/DDoS protection is active in the subscription.
- `gcp:cloud_armor` — Cloud Armor DDoS/WAF protection exists in the project.
- `aws:networkfirewall` — a Network Firewall is deployed.
- `azure:firewall` — Azure Firewall is active.
- `gcp:cloud_ids` — Cloud IDS is active.

Manual evidence (always counted in the score, passing or not):

- `manual:availability_protections_review` — your uploaded effectiveness review. The engine takes the most recent upload and enforces 365-day freshness: at 366 days it flips to failing with the exact age in the reason.

Automated evidence refreshes on every connector scan; the manual review is the only part with an explicit freshness gate.

## Common gaps

1. **No review artifact at all.** The engine reports "No manual evidence uploaded" — protections deployed, effectiveness never assessed. This is the defining gap for this KSI.
2. **Stale review.** A pen test or DDoS simulation from two years ago fails the 365-day freshness check; "persistently" means a recurring cycle.
3. **A connected cloud with no protection evidence.** AWS is fully covered but the Azure subscription has neither WAF nor Azure Firewall — that signal set stays failing.
4. **WAF removed during a migration and never replaced.** The web ACL was deleted with the old load balancer; the any-pass signal quietly flips to failing at the next scan.

## Notes for Boundera customers

Boundera automates the protection-existence half of KSI-CNA-RVP across all three clouds (`aws:shield`, `aws:waf`, `azure:waf`, `gcp:cloud_armor`, `aws:networkfirewall`, `azure:firewall`, `gcp:cloud_ids`) from your cloud connectors. The review half stays with you by design: upload your effectiveness review (pen test, DDoS simulation, or tuning report) as `manual:availability_protections_review`, and the engine enforces 365-day freshness so an aging review flips the indicator before your assessor notices. [Request a demo](https://boundera.io/request-demo) to see KSI-CNA-RVP combine your live WAF and firewall evidence with your review artifact — and watch what happens when the review goes stale.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-RVP"]`)
- NIST SP 800-53 Rev 5: SC-5, SI-8, SI-8(2)
