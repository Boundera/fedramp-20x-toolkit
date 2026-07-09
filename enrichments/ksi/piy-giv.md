---
id: KSI-PIY-GIV
kind: ksi
family: PIY
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
  - KSI-PIY-RSD
  - KSI-PIY-RES
  - KSI-PIY-RIS

oss_action_checks_this: false
---

## Plain English

This KSI is about where your inventory comes from, not whether a document
called "inventory" exists. You need to prove:

1. **An authoritative source generates the inventory automatically.** The
   list of information resources comes from a system that actually observes
   your environment — a cloud API scan, an asset-inventory service, or the
   IaC that defines your deployments — not from a hand-maintained spreadsheet.
2. **The inventory reflects your authorization boundary.** Discovery alone
   is not enough; the resources you claim as part of the system must be
   identifiable in that generated inventory, and it must be producible "when
   needed" — on demand, for an assessor, without a data-gathering scramble.
3. **Every part of the system is covered.** Each cloud you operate in needs
   its own generated inventory, and infrastructure defined as code counts as
   an authoritative source for the assets it deploys.

The most common way CSPs fail this KSI: the connector or discovery tooling
is wired up, but the generated inventory is empty or unclaimed — either
discovery returns zero resources (credentials, permissions, or region scope
are wrong) or resources are discovered and then every one is excluded from
the boundary, so the "inventory" backing the authorization package is really
a manual artifact.

## Implementation: AWS

Boundera's engine evaluates AWS with the `aws:auth_boundary` signal: it
passes when your AWS connector's automated discovery has produced at least
one resource that you have retained in your authorization boundary
(`in_boundary_count > 0`). The evidence row summarizes the boundary
inventory per AWS integration — resource count, distinct services, resource
types, and the resources themselves grouped by service.

Practical setup: connect the AWS connector with read access, run a scan so
discovery populates the inventory, then curate the boundary so the resources
that are part of your system are marked in-boundary. If the signal fails,
the failure message tells you which of the two problems you have — zero
resources discovered (fix credentials/permissions/regions) versus resources
discovered but all excluded from the boundary (fix your boundary curation).

Independently checkable via Prowler: `config_recorder_all_regions_enabled`
(AWS Config as an authoritative recording source in every region),
`ec2_instance_managed_by_ssm`, and
`organizations_account_part_of_organizations`.

## Implementation: Azure

Azure uses the identical condition through the `azure:auth_boundary`
signal — the engine's logic is provider-neutral over normalized boundary
summaries, so there is no parity gap: at least one discovered resource
retained in-boundary for your Azure integration passes, and the same two
failure modes (nothing discovered vs. everything excluded) are distinguished
in the failure message.

Connect the Azure connector with read-only access to the subscriptions in
your boundary, scan, and retain in-boundary resources.

Independently checkable via Prowler:
`defender_assessments_vm_endpoint_protection_installed` (Prowler's Azure
mapping for this KSI is thin — one check — so treat it as a supplement, not
a substitute for the boundary inventory itself).

## Implementation: GCP

GCP is evaluated by the `gcp:auth_boundary` signal with the same
`in_boundary_count > 0` condition over the GCP integration's boundary
summary. Connect the GCP connector with read-only access to the projects in
your boundary, scan, and retain in-boundary resources.

Independently checkable via Prowler: `iam_cloud_asset_inventory_enabled`
(Cloud Asset Inventory is GCP's native authoritative inventory source) and
`iam_organization_essential_contacts_configured`.

## Evidence example

A passing evaluation contains up to four independently-scored assertions —
one per connected cloud plus one SCM bucket. Clouds you have not connected
are skipped entirely (they do not count against you in the engine, but see
Common gaps):

- `aws:auth_boundary` / `azure:auth_boundary` / `gcp:auth_boundary` — one
  summary row per connected cloud integration, built from the same
  `in_boundary=True` inventory query that the Trust Center inventory view
  shows external 3PAOs. Each asserts that the cloud's automatically
  generated inventory has at least one resource retained in the
  authorization boundary. The evidence snapshot records `connector_id`,
  `in_boundary_count`, `service_count`, `resource_type_count`, `services`,
  `resources_by_service` (each resource with its type, region, and
  `last_seen_at`), and `last_discovered_at` — the newest discovery timestamp
  for that cloud. A passing message reads like: "AWS inventory: 42 resources
  across 9 services (ec2, iam, kms, rds, s3, +4 more)".
- `scm:iac` — passes when at least one connected SCM platform (GitHub,
  GitLab, or Bitbucket — each has its own IaC-detection collector) has IaC
  files in its repositories (`has_iac` is true): Terraform, CloudFormation,
  ARM/Bicep, CDK, Pulumi, or Deployment Manager. Code that defines deployed
  assets is itself an authoritative source. Snapshot records `scm`, `scope`,
  `has_iac`, `iac_types`, and `iac_repo_count`.

Note on freshness: this check applies no maximum-age gate. The evidence
carries `last_discovered_at` per cloud, so you and your assessor can see how
current the generated inventory is — keep scans recent, because the KSI
statement says "real-time".

## Common gaps

1. **Connector connected, zero resources discovered.** The scan ran but
   found nothing — typically wrong credentials, missing read permissions,
   or region/subscription/project scope that misses where the workloads
   are. The engine reports this distinctly: "connector found 0 discovered
   resources — no inventory was generated."
2. **Everything discovered, nothing claimed.** Discovery works but every
   resource was excluded from the authorization boundary, so the generated
   inventory backs nothing. The engine reports "discovered N resources but
   every one was excluded from the authorization boundary (0/N
   in-boundary)."
3. **A cloud in your boundary with no connector.** Disconnected clouds are
   skipped by the engine, so the KSI can pass on one cloud while your SSP
   names three. Your 3PAO reads the boundary description, not the
   denominator — connect every cloud your boundary includes.
4. **No IaC in any connected SCM.** If none of your GitHub, GitLab, or
   Bitbucket repositories contain Terraform, CloudFormation, ARM/Bicep,
   CDK, Pulumi, or Deployment Manager files, the `scm:iac` assertion fails —
   you lose the "code as authoritative source" leg of the evidence.
5. **Stale scans undermining "real-time".** The check itself has no
   freshness gate, but the evidence exposes `last_discovered_at` and
   per-resource `last_seen_at`. An inventory generated months ago is easy
   for an assessor to challenge against a statement that says "real-time
   ... when needed."

## Notes for Boundera customers

The engine evaluates KSI-PIY-GIV fully automatically once connectors are in
place. For each connected cloud (AWS, Azure, GCP) it synthesizes a boundary
inventory summary from your connector's discovered resources — the exact
same in-boundary query your Trust Center inventory page shows external
3PAOs, so the KSI can never drift from what assessors see — and scores
`aws:auth_boundary`, `azure:auth_boundary`, and `gcp:auth_boundary`
independently. In parallel, `scm:iac` checks your connected SCM platforms
(GitHub, GitLab, Bitbucket) for IaC that defines deployed assets.

What you still own: connecting the cloud and SCM connectors, running scans
so discovery stays current, and curating which discovered resources are
retained in your authorization boundary. The engine's failure messages tell
you which of those three is the problem.

[Request a demo](https://boundera.io/request-demo) to watch KSI-PIY-GIV
evaluate your real authorization-boundary inventory — live resource counts
per cloud, service breakdowns, and the IaC detection across your repos.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json`
  → `KSI.PIY.indicators["KSI-PIY-GIV"]`
- NIST SP 800-53 Rev 5: CM-2(2), CM-7(5), CM-8, CM-8(1), CM-12, CM-12(1),
  CP-2(8)
- Prowler KSI mappings: prowler-cloud/prowler#11701 (unmerged, aligned
  2026.06.24.01)
