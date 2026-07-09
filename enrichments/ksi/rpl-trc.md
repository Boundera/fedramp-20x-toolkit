---
id: KSI-RPL-TRC
kind: ksi
family: RPL
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
  - KSI-RPL-ABO
  - KSI-RPL-ARP
  - KSI-RPL-RRO

oss_action_checks_this: false
---

## Plain English

Where KSI-RPL-ABO asks whether backups are configured, this KSI asks whether you have proven you can actually recover — persistently, not once before the assessment. You need to show:

1. Recovery exercises happen on a recurring cadence: restore tests, failover drills, or contingency-plan tests that exercise the path from backup to running service.
2. There is machine evidence that recovery is possible right now — restorable recovery points exist for your protected workloads, not just backup jobs that were scheduled.
3. Test outcomes are measured against your defined recovery objectives (RTO/RPO from KSI-RPL-RRO) and feed back into the recovery plan (KSI-RPL-ARP) when they miss.

The most common way CSPs fail this KSI: backups run every night, and nobody has ever restored from one. The first real restore attempt happens during an actual incident — which is exactly what "persistently tested" is meant to prevent.

## Implementation: AWS

The engine inspects AWS Backup vaults (`aws:backup:backup_vaults`): each vault passes if it holds at least one recovery point (`number_of_recovery_points` greater than zero). A vault with zero recovery points fails with "has no recovery points — no tested backups", because an empty vault means the backup plan pointing at it has never successfully produced a restorable artifact.

Treat that as the floor, not the ceiling. Recovery points prove backups complete; assessors will also want restore evidence. AWS Backup restore testing plans can run scheduled, automated restore tests against your vaults and produce restore-job records — pair those with the vault evidence so "tested" means tested.

## Implementation: Azure

The engine has no automated signal for this KSI on Azure today — do not expect Azure recovery testing to show up as automated evidence. The equivalent proof lives in Azure Backup: Recovery Services vault recovery points and restore-job history (including Azure Site Recovery test failovers). Capture those records and supply them as part of your recovery-test documentation until automated coverage lands.

## Implementation: GCP

The engine has no automated signal for this KSI on GCP today. The equivalent proof lives in Google Cloud Backup and DR: backup vault recovery points and restore-job logs. As with Azure, export those records into your recovery-test evidence manually.

## Evidence example

Passing automated evidence for KSI-RPL-TRC contains one signal:

- `aws:backup` — asserts, per AWS Backup vault, that the vault contains at least one recovery point

Scope is per resource: every discovered vault is tested individually and the score is passing vaults over total vaults. Each entry carries the vault's resource ID and its `collected_at` timestamp from the connector scan; there is no fixed staleness window on this signal, so recency tracks your scan cadence. A complete assessor package pairs this with human-produced restore-test records (restore-job IDs, test-failover reports, timed results against RTO/RPO) — the automated signal alone shows recoverability, not exercised recovery.

## Common gaps

1. **Vault exists, zero recovery points.** The exact failing condition — usually a backup plan whose selections match nothing, an IAM role the backup job can't assume, or a vault created and never wired to a plan. Every empty vault fails individually.
2. **Recovery points exist, restores never tested.** The engine's green light proves restorable artifacts exist; a 3PAO will still ask "show me the last restore you ran and how long it took." No restore-job or test-failover record means no proof the capability works end to end.
3. **No AWS Backup vaults discovered at all.** A signal with zero matching resources contributes nothing rather than failing — so an account that does backups through ad hoc snapshots shows no automated evidence for this KSI. Absence of evidence is not passing evidence to an assessor.
4. **Azure and GCP workloads with no test evidence.** Automated coverage is AWS-only today; if your boundary includes Azure or GCP, recovery-test evidence for those workloads must be produced and supplied manually, and assessors will ask for it per provider.
5. **Tests exist but never compared to objectives.** A restore that took 9 hours against a 4-hour RTO is a failed test, not a passed one. "Persistently tested" implies results are measured against the objectives in KSI-RPL-RRO and drive updates to the plan in KSI-RPL-ARP.

## Notes for Boundera customers

Boundera automates the recoverability floor for KSI-RPL-TRC: the `aws:backup` signal verifies on every scan, vault by vault, that your AWS Backup vaults hold restorable recovery points, and flags any empty vault with the exact reason. Azure and GCP have no automated signal for this indicator yet — that coverage gap is stated here rather than papered over, and cross-cloud recovery-test evidence is supplied through your documentation alongside the sibling process indicators (KSI-RPL-ARP and KSI-RPL-RRO carry your recovery plan and RTO/RPO reviews with 365-day freshness enforcement).

What still needs you: connect the AWS connector so vaults are discovered, keep backup plans producing recovery points, and run and document actual restore tests against your objectives.

[Request a demo](https://boundera.io/request-demo) to see KSI-RPL-TRC evaluate your real AWS Backup vaults and surface every vault with no recovery points before an assessor does.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.RPL.indicators["KSI-RPL-TRC"]`
- NIST SP 800-53 Rev 5: CP-2(1), CP-2(3), CP-4, CP-4(1), CP-6, CP-6(1), CP-9(1), CP-10, IR-3, IR-3(2)
