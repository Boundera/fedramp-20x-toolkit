---
id: KSI-CNA-MAT
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
  - KSI-CNA-ULN
  - KSI-CNA-RVP

oss_action_checks_this: false
---

## Plain English

This KSI has two halves: keep the attack surface minimal, and make sure that if something is compromised anyway, lateral movement is contained. What you need to show:

1. **A hardened perimeter exists in every connected cloud** — WAF and DDoS protection in front of what is exposed (WAFv2/Shield on AWS, WAF policies on Azure, Cloud Armor on GCP).
2. **Threat detection is watching for what gets through** — GuardDuty on AWS, Defender for Cloud on Azure.
3. **Segmentation limits lateral movement** — Kubernetes network policies on AKS/GKE, private API endpoints on EKS, and optionally host-level containment via CrowdStrike device control and Falcon Firewall policies.

The most common way CSPs fail it: perimeter tooling exists in the primary cloud but a second connected cloud has none of it — under this KSI's provider-grouped scoring, a connected cloud with no matching evidence counts directly against you.

## Implementation: AWS

- **WAFv2** — at least one web ACL configured.
- **Shield** — at least one Shield protection active.
- **GuardDuty** — a detector enabled (account flag or detector status).
- **EKS** — clusters with private endpoint access enabled; a public API endpoint is flagged as increasing attack surface.

Independently checkable via the upstream Prowler 20x mapping: `eks_cluster_not_publicly_accessible`, `ec2_instance_public_ip`, `vpc_peering_routing_tables_with_least_privilege`.

## Implementation: Azure

- **WAF** — WAF protection active in the subscription (Application Gateway WAF or Front Door WAF).
- **Defender for Cloud** — active for the subscription.
- **AKS** — clusters must have a network policy configured; without one, pod-level segmentation cannot be enforced.

Independently checkable via the upstream Prowler 20x mapping: `aks_clusters_public_access_disabled`, `storage_default_network_access_rule_is_denied`.

## Implementation: GCP

- **Cloud Armor** — security policies present in the project (the WAF/DDoS layer).
- **GKE** — clusters with network policy enabled, for pod-level segmentation.

Independently checkable via the upstream Prowler 20x mapping: `cloudsql_instance_public_access`, `compute_instance_public_ip`.

## Evidence example

KSI-CNA-MAT uses provider-grouped scoring for the perimeter and segmentation signals: each connected cloud counts as covered when at least one of its signals passes, and the score is covered clouds over connected clouds. A connected cloud with no matching evidence at all is counted as failing ("not yet configured or not scanned"), not silently skipped. All signals are any-pass within their group.

- `aws:waf` — a WAFv2 web ACL is configured (AWS group).
- `aws:shield` — a Shield protection is active (AWS group).
- `azure:waf` — WAF protection is active in the subscription (Azure group).
- `azure:defender_secure_score` — Defender for Cloud is active (Azure group).
- `azure:aks` — an AKS cluster has a network policy configured (Azure group).
- `gcp:cloud_armor` — Cloud Armor security policies exist in the project (GCP group).
- `gcp:gke` — a GKE cluster has network policy enabled (GCP group).
- `aws:guardduty` — a GuardDuty detector is enabled.
- `aws:eks` — an EKS cluster has private endpoint access enabled.
- `crowdstrike:prevention_policies` — a CrowdStrike device control policy is enabled with at least one device class rule (cross-cloud endpoint layer).
- `crowdstrike:firewall` — a Falcon Firewall policy is enabled with at least one rule (host-level network segmentation).

GuardDuty, EKS, and the CrowdStrike signals are evaluated outside the three cloud groups and contribute their own coverage unit when evidence exists. Evidence is refreshed on every connector scan.

## Common gaps

1. **A connected cloud with zero perimeter evidence.** You connected Azure for a small workload, deployed no WAF and no Defender — that cloud counts as uncovered and drags the score down.
2. **AKS or GKE clusters without network policies.** Flat pod networking means one compromised pod can reach everything; both signals fail on exactly this condition.
3. **EKS API endpoint publicly reachable.** Private endpoint access disabled is flagged as attack surface, even when access is IP-restricted.
4. **Defender for Cloud inactive on a subscription in the boundary.** Threat detection has to cover every subscription you claimed, not just production.
5. **CrowdStrike device control policy with no device class rules.** An enabled-but-empty policy fails the condition — the engine requires at least one class rule (and at least one rule on Falcon Firewall policies).

## Notes for Boundera customers

Boundera evaluates KSI-CNA-MAT automatically across AWS, Azure, and GCP with provider-grouped scoring — `aws:waf`/`aws:shield`, `azure:waf`/`azure:defender_secure_score`/`azure:aks`, and `gcp:cloud_armor`/`gcp:gke` — plus ungrouped signals for `aws:guardduty`, `aws:eks`, and the optional CrowdStrike endpoint layer (`crowdstrike:prevention_policies`, `crowdstrike:firewall`). Connect each cloud in your boundary; connect CrowdStrike if you want the host-level containment evidence counted. [Request a demo](https://boundera.io/request-demo) to see KSI-CNA-MAT score your real per-cloud perimeter coverage and pinpoint which connected cloud is missing WAF or segmentation evidence.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CNA.indicators["KSI-CNA-MAT"]`)
- NIST SP 800-53 Rev 5: AC-17(3), AC-18(1), AC-18(3), AC-20(1), CA-9, SC-7(3), SC-7(4), SC-7(5), SC-7(8), SC-8, SC-10, SI-10, SI-11, SI-16
- Prowler 20x KSI mapping: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
