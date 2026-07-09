---
id: KSI-SVC-VRI
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
  - KSI-SVC-VCM
  - KSI-SVC-PRR
  - KSI-SVC-ACM

oss_action_checks_this: false
---

## Plain English

Can you prove, cryptographically, that your software and its records are what you think they are? Boundera's engine breaks this into three provable claims:

1. **You know what is in your software.** A software bill of materials exists per repository — GitHub Dependency Graph or GitLab dependency scanning — and container image contents are inventoried down to package name and version.
2. **Integrity deviations get detected and closed.** Dependency, code-scanning, endpoint, and container-image findings (GitHub, GitLab, CrowdStrike, Qualys) are resolved rather than left open — an open finding is an unverified change to a component you ship.
3. **Your audit records are tamper-evident.** CloudTrail log-file validation (a SHA-256 hash chain over delivered log files) is enabled and logging, with Azure diagnostics and GCP logging sinks as the platform-level equivalents on the other clouds.

SCM coverage is GitHub and GitLab; the engine has no Bitbucket SBOM or vulnerability signal for this KSI. The most common failure: repositories with no SBOM at all — Dependency Graph was never enabled, so component integrity cannot be validated for anything built from them.

## Implementation: AWS

CloudTrail is the cryptographic anchor: trails (`aws:cloudtrail:trails`) pass when `log_file_validation_enabled` is true and the trail is actively logging. Log-file validation delivers SHA-256 digest files that make any tampering with audit records detectable — this is the SC-13/SI-7 mechanism the engine verifies on AWS, scored as a single capability check (one validating trail suffices). Note: the Prowler PR's mapping for this KSI (an ACM certificate-expiration check on AWS, DNSSEC checks on GCP) does not overlap the engine's signals, so no Prowler cross-check is cited here.

## Implementation: Azure

The engine checks that diagnostic settings (`azure:monitor:diagnostics_settings`) are configured — a presence check that proves platform activity records are being captured for integrity monitoring. Be aware this is weaker than the AWS signal: it does not verify a cryptographic hash chain, and the engine does not claim it does.

## Implementation: GCP

The engine checks that logging sinks (`gcp:logging:sinks`) exist with a destination configured — again a presence check for integrity monitoring rather than a cryptographic validation, and honestly scoped as such.

## Evidence example

Passing evidence combines inventory, remediation, and log-integrity layers:

- SBOM inventory (capability checks — one repo/project with an SBOM passes the signal): `github:sbom` (Dependency Graph packages per repo), `gitlab:sbom` (dependency-scanning components per project).
- Container inventory (capability): `qualys:container_images` (images carry a scan marker — a last-scanned timestamp or SCA/static scan type) and `qualys:container_software` (packages identified by name and version per image).
- Per-resource remediation signals (every finding must be closed): `github:dependabot_alerts` and `github:code_scanning` (every alert `dismissed` or `fixed`, any severity), `gitlab:vulnerabilities` and `crowdstrike:vulnerabilities` (no open critical/high findings), `qualys:container_vulnerabilities` (no open critical/high image findings, with installed and fixed versions in the snapshot).
- Log integrity (capability): `aws:cloudtrail` (log-file validation enabled and logging), `azure:activity_log` (diagnostics configured), `gcp:audit_logs` (sink with destination).

## Common gaps

1. **No SBOM in any repository.** Dependency Graph off in GitHub, dependency scanning absent in GitLab — the component-inventory half of the KSI has no evidence.
2. **Open Dependabot or code-scanning alerts of any severity.** Unlike the scanner signals, the GitHub alert signals fail on any open alert, not just critical/high.
3. **Open critical/high findings in GitLab, CrowdStrike, or Qualys.** Each open finding is a component whose integrity deviates from a known-good state.
4. **CloudTrail logging without validation.** Trails are on but `log_file_validation_enabled` is false — the audit trail exists yet is not tamper-evident, which misses the cryptographic core of this KSI.
5. **Container images with no scan marker.** Images running in the boundary that Qualys has never scanned mean their contents were never validated.

## Notes for Boundera customers

Boundera evaluates KSI-SVC-VRI from `github:sbom`, `gitlab:sbom`, `github:dependabot_alerts`, `github:code_scanning`, `gitlab:vulnerabilities`, `crowdstrike:vulnerabilities`, `qualys:container_images`, `qualys:container_software`, `qualys:container_vulnerabilities`, `aws:cloudtrail`, `azure:activity_log`, and `gcp:audit_logs` — SBOM presence and log-file validation are proved as capabilities, while every open finding is listed per resource with its CVE and fixed version. Connect your SCM, endpoint, container-security, and cloud integrations and the evidence assembles itself on every scan. [Request a demo](https://boundera.io/request-demo) to watch KSI-SVC-VRI read your real SBOMs and show which shipped components still carry open integrity findings.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.SVC.indicators["KSI-SVC-VRI"]`)
- NIST SP 800-53 Rev 5: CM-2(2), CM-8(3), SC-13, SC-23, SI-7, SI-7(1), SR-10
- Prowler FedRAMP 20x mappings: prowler-cloud/prowler#11701 (unmerged, aligned 2026.06.24.01)
