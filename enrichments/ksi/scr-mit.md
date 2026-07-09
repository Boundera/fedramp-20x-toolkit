---
id: KSI-SCR-MIT
kind: ksi
family: SCR
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
  - KSI-SCR-MON

oss_action_checks_this: false
---

## Plain English

This KSI is the "identify, review, mitigate" loop for everything you did not
write yourself. You need to prove, on an ongoing basis, that:

1. **You know what your third-party components are.** An inventory exists —
   an SBOM for every repository (GitHub or GitLab) and, if you track
   components in a CMDB, active entries for each one.
2. **You review flaws that scanners find in that supply chain.** Code
   scanning and secret scanning alerts, and dependency vulnerability
   findings, each get triaged — every alert reaches a dismissed, fixed, or
   resolved state instead of sitting open.
3. **You mitigate, not just detect.** Open vulnerabilities on endpoints
   (e.g., CrowdStrike findings) are driven to closed/remediated.
4. **The monitoring is persistent.** A continuously running cloud-native
   vulnerability monitoring service is active — AWS Security Hub, Microsoft
   Defender for Cloud, or Google Security Command Center.

The most common way CSPs fail this KSI: scanners are turned on but nobody
works the queue — the evaluation scores every individual alert, so a backlog
of open findings is a backlog of failing resources, not one abstract gap.

## Implementation: AWS

The engine's AWS assertion for this KSI is the `aws:securityhub` signal. It
inspects your Security Hub hubs (resource type `aws:securityhub:securityhubs`)
and passes only when a hub's status is `ACTIVE` **and** it has at least one
security standard or integration configured. A hub that is technically
enabled but subscribed to nothing fails with a "supply chain vulnerability
monitoring gap." This is an any-pass group: one qualifying hub in the
connected account satisfies it.

On the container supply chain side, the same posture is independently
checkable via Prowler checks such as
`ecr_registry_scan_images_on_push_enabled` and
`ecr_repositories_scan_vulnerabilities_in_latest_image` (image scanning on
your ECR registries).

## Implementation: Azure

The Azure assertion is the `azure:defender_secure_score` signal. It reads
your subscriptions' secure-score resources (`azure:security:secure_scores`)
and passes when `defender_active` is true — i.e., Microsoft Defender for
Cloud is actually turned on for the subscription, not just present. Any-pass:
one subscription with Defender active satisfies the group.

Independently checkable via Prowler checks
`defender_container_images_scan_enabled` and
`defender_container_images_resolved_vulnerabilities`.

## Implementation: GCP

The GCP assertion is the `gcp:scc` signal. It reads the Security Command
Center summary for each project (`gcp:scc:summary`) and passes when
`scc_enabled` is true. Any-pass: one project with SCC enabled satisfies the
group.

Independently checkable via Prowler checks
`artifacts_container_analysis_enabled` and `gcr_container_scanning_enabled`.

## Evidence example

A passing automated evidence package for KSI-SCR-MIT contains these signals,
scored per resource unless noted, evaluated against the latest connector
scan snapshot (no additional per-signal freshness window is configured for
this KSI):

- `github:sbom` — each GitHub repository's SBOM export contains packages;
  passing evidence records the repo and how many packages are inventoried.
- `gitlab:sbom` — each GitLab project's SBOM contains packages or
  components.
- `github:code_scanning` — every code scanning alert is `dismissed` or
  `fixed`; an open alert fails with the tool name that raised it.
- `github:secret_scanning` — every secret scanning alert is in a state
  other than `open`/`active`.
- `gitlab:vulnerabilities` — every GitLab vulnerability finding is
  `dismissed` or `resolved`.
- `crowdstrike:vulnerabilities` — every CrowdStrike vulnerability is
  `closed` or `remediated` (snapshot captures status, CVE ID, severity).
- `servicenow:cmdb` — every synced CMDB configuration item has a name and
  an operational status other than `Retired`.
- `aws:securityhub` / `azure:defender_secure_score` / `gcp:scc` — the
  continuous-monitoring assertions described above; each is any-pass, so one
  active monitoring service per cloud satisfies its group.

There is no Bitbucket signal for this KSI today — if your source code lives
in Bitbucket, the SBOM and scanning assertions have no automated feed and
you should plan manual evidence for that portion of the boundary.

## Common gaps

1. **Repositories with no SBOM.** The `github:sbom` / `gitlab:sbom` signals
   fail any repo whose SBOM export is empty or missing — "third-party
   dependencies not inventoried." Dependency graph/SBOM generation must be
   enabled per repo, not just organization-wide in theory.
2. **Open code scanning alerts.** Only `dismissed` or `fixed` pass. An alert
   that has been "looked at" but left open still fails — triage must land in
   a terminal state.
3. **Secret scanning alerts left active.** Any alert still `open` or
   `active` fails as a possible credential exposure via a dependency.
4. **Security Hub on, but empty.** The AWS signal fails a hub with no
   standards or integrations even though its status is `ACTIVE` — enabling
   the service is not the same as monitoring with it. The Azure and GCP
   equivalents fail when Defender is inactive or SCC is disabled.
5. **Retired or unnamed CMDB entries.** ServiceNow CIs that are `Retired`
   or nameless fail as components not actively tracked.

## Notes for Boundera customers

Boundera evaluates KSI-SCR-MIT with a `UniversalResourceCheck` that scores
every SBOM, scanner alert, vulnerability finding, CMDB item, and
cloud-monitoring service individually across ten signals:
`github:sbom`, `gitlab:sbom`, `github:code_scanning`,
`github:secret_scanning`, `gitlab:vulnerabilities`,
`crowdstrike:vulnerabilities`, `servicenow:cmdb`, `aws:securityhub`,
`azure:defender_secure_score`, and `gcp:scc`. The cloud-monitoring
assertions cover AWS, Azure, and GCP with equivalent logic; SCM coverage is
GitHub and GitLab (Bitbucket is not yet wired for this KSI).

What still needs you: connect the relevant connectors (GitHub/GitLab,
CrowdStrike, ServiceNow, and at least one cloud account), enable SBOM/
dependency-graph export on your repositories, and actually work the alert
queues — the engine reports triage state, it does not fix findings for you.
[Request a demo](https://boundera.io/request-demo) to watch KSI-SCR-MIT
score your real SBOMs and open scanner alerts resource-by-resource.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json`
  (`KSI.SCR.indicators["KSI-SCR-MIT"]`)
- NIST SP 800-53 Rev 5: AC-20, RA-3(1), SA-9, SA-10, SA-11, SA-15(3),
  SA-22, SI-7(1), SR-5, SR-6, CA-7(4), SC-18
- Prowler KSI mapping (prowler-cloud/prowler#11701, unmerged): AWS ECR,
  Azure Defender, and GCP container-analysis checks cited above
