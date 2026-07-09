---
id: KSI-CNA-RNT
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
  - KSI-CNA-ULN
  - KSI-CNA-MAT
  - KSI-CNA-RVP

oss_action_checks_this: false
---

## Plain English

This KSI asks whether every network control point — security group, NSG, firewall rule — is configured to limit traffic in both directions. Four proof points:

1. **No inbound rules open to the world.** Nothing allows `0.0.0.0/0` or `::/0` (or Azure's `*`/`Internet` source) inbound.
2. **Sensitive ports are never internet-exposed.** SSH (22), RDP (3389), and the common database/cache ports (3306, 5432, 1433, 27017, 6379, 9200, 11211) must not be reachable from the world.
3. **Deny by default holds.** Default security groups carry no inbound rules, and egress is explicitly restricted — not allow-all outbound.
4. **A network firewall or IDS layer exists** — AWS Network Firewall, Azure Firewall, or GCP Cloud IDS.

The most common way CSPs fail it: outbound. Teams lock down inbound carefully and leave every security group with the default allow-all egress — which is exactly the exfiltration path the CM-7(1) leg of this KSI targets.

## Implementation: AWS

Per-security-group assertions (the engine parses both PascalCase Prowler output and snake_case normalized rules):

- **No world-open inbound** — no ingress rule with a `0.0.0.0/0` or `::/0` CIDR.
- **No sensitive-port exposure** — no world-open rule whose port range covers a sensitive port; protocol `-1` (all protocols) counts as all ports.
- **Default SG locked** — security groups named `default` must have zero inbound rules.
- **Explicit egress restriction** — fails when an egress rule allows all protocols to `0.0.0.0/0`.

Org-level (any-pass): **AWS Network Firewall** deployed.

Independently checkable via the upstream Prowler 20x mapping: `ec2_securitygroup_allow_ingress_from_internet_to_any_port`, `ec2_securitygroup_default_restrict_traffic`, `ec2_networkacl_allow_ingress_any_port`.

## Implementation: Azure

Per-NSG assertions:

- **No world-open inbound** — no `Allow`/`Inbound` rule with source `*`, `Internet`, `0.0.0.0/0`, or `::/0`.
- **No sensitive-port exposure** — no world-open rule whose destination port or port range covers a sensitive port (`*` counts as everything).
- **Explicit outbound deny** — the NSG must carry at least one explicit `Deny`/`Outbound` rule beyond the platform defaults.

Org-level (any-pass): **Azure Firewall** active in the subscription (the network-level IDS/IPS leg).

Independently checkable via the upstream Prowler 20x mapping: `network_ssh_internet_access_restricted`, `network_rdp_internet_access_restricted`.

## Implementation: GCP

Per-firewall-rule assertions:

- **No world-open ingress** — no `INGRESS` rule with `0.0.0.0/0` (or `::/0`) in its source ranges.
- **No sensitive-port exposure** — no world-open ingress rule allowing a sensitive port; `ip_protocol: all` counts as all ports.
- **Explicit egress control** — the engine looks for `EGRESS`-direction firewall rules; having any is itself evidence of deliberate egress control.

Org-level (any-pass): **Cloud IDS** endpoints present in the project.

Independently checkable via the upstream Prowler 20x mapping: `compute_firewall_ssh_access_from_the_internet_allowed`, `compute_firewall_rdp_access_from_the_internet_allowed`, `compute_network_default_in_use`.

## Evidence example

Passing evidence shows every network control point conforming. The security-group/NSG/firewall signals are per-resource — each rule set is scored on multiple assertions — while the firewall/IDS signals are any-pass:

- `aws:security_groups` — four assertions per group: no world-open inbound, no sensitive ports exposed, default groups have no inbound at all, and egress is not unrestricted.
- `azure:network_security_groups` — three assertions per NSG: no world-open inbound, no sensitive ports exposed, and at least one explicit outbound deny rule.
- `gcp:firewall_rules` — three assertions: no world-open ingress, no sensitive ports from the world, and explicit `EGRESS` rules present.
- `aws:networkfirewall` — an AWS Network Firewall is active (any-pass).
- `azure:firewall` — Azure Firewall is active in the subscription (any-pass).
- `gcp:cloud_ids` — Cloud IDS endpoints exist in the project (any-pass).

Evidence is refreshed on every connector scan; there is no manual-upload path for this KSI.

## Common gaps

1. **A rule open to `0.0.0.0/0`.** One forgotten dev-access rule fails the world-inbound assertion for that group — the engine flags the specific rule set.
2. **SSH or a database port exposed to the internet.** The failing message names the exposed ports, which makes this the easiest finding for an assessor to independently confirm.
3. **Default security groups with inbound rules.** AWS default SGs are supposed to be empty; anything inbound on them fails the deny-by-default assertion.
4. **Allow-all egress.** Security groups with unrestricted outbound, NSGs with no explicit outbound deny, GCP networks with no egress rules at all — the outbound half of "limit inbound and outbound" is the one most estates skip.
5. **No firewall/IDS layer anywhere.** None of AWS Network Firewall, Azure Firewall, or Cloud IDS deployed means the SI-8 leg has no evidence.

## Notes for Boundera customers

Boundera evaluates KSI-CNA-RNT automatically and per-resource across all three clouds: `aws:security_groups` (four assertions each), `azure:network_security_groups` (three assertions each), and `gcp:firewall_rules` (three assertions each), plus the any-pass firewall/IDS signals `aws:networkfirewall`, `azure:firewall`, and `gcp:cloud_ids`. Every failing rule set is listed with the exact exposure — including which sensitive ports are open to the world. Your setup work is connecting the cloud accounts in your boundary. [Request a demo](https://boundera.io/request-demo) to see KSI-CNA-RNT sweep your real security groups and firewall rules and surface every world-open or allow-all-egress rule it finds.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-RNT"]`)
- NIST SP 800-53 Rev 5: AC-17(3), CA-9, CM-7(1), SC-7(5), SI-8
- Prowler 20x KSI mapping: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
