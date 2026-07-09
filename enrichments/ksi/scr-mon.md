---
id: KSI-SCR-MON
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
  - KSI-SCR-MIT

oss_action_checks_this: false
---

## Plain English

Where KSI-SCR-MIT asks whether you manage supply chain risk at all, this KSI
asks specifically whether **upstream** vulnerabilities in third-party
software reach you automatically — through an active monitoring service, not
a quarterly manual review. You need to prove:

1. **Automated dependency monitoring is on and producing alerts** for every
   code repository — Dependabot on GitHub, vulnerability scanning on GitLab.
   (There is no Bitbucket feed for this KSI today; Bitbucket-hosted code
   needs a compensating monitoring source.)
2. **Every alert is triaged to a terminal state.** Scoring is per alert: a
   Dependabot alert, GitLab vulnerability, or CrowdStrike CVE that sits open
   is a failing resource, regardless of how good the monitoring pipeline is.
3. **Monitoring extends past source repos** to the software you actually
   run: endpoint/OS packages (CrowdStrike) and container images (Qualys
   Container Security), including a package name/version inventory of what
   is inside your images.
4. **High and critical container vulnerabilities are closed out**, not left
   open in the scanner.

The most common way CSPs fail this KSI: Dependabot (or the GitLab
equivalent) is enabled, then alerts accumulate open for months — automated
detection with no remediation tracking.

## Evidence example

A passing automated evidence package for KSI-SCR-MON contains these signals,
scored per resource unless noted, evaluated against the latest connector
scan snapshot (no additional per-signal freshness window is configured for
this KSI):

- `github:dependabot_alerts` — every Dependabot alert is `dismissed` or
  `fixed`; the snapshot records repo, package name, severity, and advisory
  CVE ID, so the evidence shows exactly which upstream advisory was handled.
- `github:secret_scanning` — every secret scanning alert is in a state
  other than `open`/`active` (upstream credential exposure resolved).
- `gitlab:vulnerabilities` — every GitLab vulnerability finding is
  `dismissed` or `resolved`, with project and severity captured.
- `crowdstrike:vulnerabilities` — every endpoint vulnerability is `closed`
  or `remediated`, with CVE ID, severity, and hostname captured.
- `qualys:container_software` — the container package inventory identifies
  each package by name and version (image SHA, registry, repository, and
  tag are snapshotted). This group is any-pass: it proves the inventory
  feed is live.
- `qualys:container_vulnerabilities` — no high or critical container
  vulnerability (severity label `high`/`critical`, or Qualys numeric 4/5)
  is open. Statuses `closed`, `fixed`, `remediated`, `resolved`, `ignored`,
  `accepted`, and `not_affected` all count as handled — a documented risk
  acceptance passes; silence does not. Medium and low findings do not fail
  this signal.

## Common gaps

1. **Open Dependabot alerts.** Only `dismissed` or `fixed` pass. The
   failure message names the package and severity, so an assessor sees
   "lodash, severity=high, open" — not an abstract count.
2. **GitLab vulnerabilities detected but never triaged.** Findings that are
   neither `dismissed` nor `resolved` fail per finding; a working scanner
   with an unworked queue still fails.
3. **Secret scanning alerts left open or active.** Each one fails as an
   upstream credential exposure, with the secret type recorded.
4. **CrowdStrike CVEs open on hosts.** Endpoint findings must reach
   `closed`/`remediated`; anything else is an open upstream vulnerability
   on a running system.
5. **High/critical container vulnerabilities open in Qualys** — or a
   container inventory whose rows are missing package name/version, which
   fails the inventory assertion because the monitoring cannot say what it
   is monitoring.

## Notes for Boundera customers

Boundera evaluates KSI-SCR-MON with a `UniversalResourceCheck` over six
signals: `github:dependabot_alerts`, `github:secret_scanning`,
`gitlab:vulnerabilities`, `crowdstrike:vulnerabilities`,
`qualys:container_software`, and `qualys:container_vulnerabilities`. Every
alert and finding is scored individually, so your ConMon view shows which
specific packages, CVEs, and images are outstanding — and flips green as
each one is fixed, dismissed, or formally risk-accepted.

What still needs you: connect the GitHub and/or GitLab connector (and
CrowdStrike/Qualys if they are in your boundary), enable Dependabot or
GitLab dependency scanning on each repository, and triage alerts to a
terminal state. Note the FedRAMP statement also allows *contractual
notification requirements* as a monitoring mechanism — the engine
automates the active-monitoring path; contractual notification evidence
remains a manual artifact. [Request a demo](https://boundera.io/request-demo)
to watch KSI-SCR-MON triage your live Dependabot and container
vulnerability alerts in real time.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json`
  (`KSI.SCR.indicators["KSI-SCR-MON"]`)
- NIST SP 800-53 Rev 5: AC-20, CA-3, IR-6(3), PS-7, RA-5, SA-9, SI-5,
  SR-5, SR-6, SR-8
