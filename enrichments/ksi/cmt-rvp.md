---
id: KSI-CMT-RVP
kind: ksi
family: CMT
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
  - KSI-CMT-LMC
  - KSI-CMT-RMV
  - KSI-CMT-VTD

oss_action_checks_this: false
---

## Plain English

Having a documented change management procedure is not what this KSI asks for — the other CMT indicators cover following it. This one asks whether you **review the procedure itself** and can prove the review happens on a recurring basis:

1. A recurring review of the procedure's *effectiveness* actually happens — a Change Control Board (or equivalent) that looks at how change management is performing, not just approves individual changes.
2. The review looks at real signals: change failure rate, emergency/expedited change frequency, rollbacks, unauthorized-change detections.
3. Review findings produce documented improvements to the procedure, with rationale — a paper trail showing the process evolves.

Be honest about what automation can and cannot do here: no cloud or SCM API can attest that your team reviewed a procedure. This is a **process KSI** — the passing evidence is a human-produced artifact. Automation's role is feeding the review with real change-activity data, not replacing it.

## Evidence example

Evidence a 3PAO (and Boundera's engine) will accept, refreshed at least annually:

- CCB or change-advisory meeting minutes that show the *procedure* being reviewed — agenda item, findings, decisions — not just per-change approvals
- An annual (or more frequent) change management effectiveness report or internal audit
- Documented procedure improvements with rationale ("emergency change rate exceeded threshold in Q2 → added pre-approved standard-change catalog")
- Recurring process-monitoring records (e.g., bi-weekly change-metrics review) showing cadence, attendees, and outputs

Strong packages pair the review artifact with the metrics it consumed: deployment and change counts, failure/rollback rates, and emergency-change frequency pulled from your SCM and CI history (GitHub, GitLab, or Bitbucket — the source system doesn't matter, the trend data does).

## Common gaps

1. **Procedure exists, review doesn't.** A polished change management SOP with no record that anyone has evaluated whether it works.
2. **Per-change approvals offered as procedure review.** CCB minutes that only show individual change decisions prove KSI-CMT-LMC territory, not this KSI. The reviewer needs to see the *process* on the agenda.
3. **Review with no output.** A calendar invite and attendance list, but no findings, metrics, or decisions recorded.
4. **Static procedure.** Years of "reviews" that never changed anything — assessors read an unchanged document plus perfect reviews as a paper exercise.
5. **Stale evidence.** The last documented review is older than a year. "Persistently" means an ongoing cycle, not a one-time audit.

## Notes for Boundera customers

Boundera evaluates KSI-CMT-RVP as a process check: upload your review artifact (meeting minutes, effectiveness report, or improvement log) as `change_procedure_review` evidence, and the engine enforces 365-day freshness so a stale review flips the indicator before your assessor finds it.

The change-activity data your review should consume is automated: connected SCMs (GitHub, GitLab, Bitbucket) feed the sibling indicators KSI-CMT-LMC, KSI-CMT-RMV, and KSI-CMT-VTD, giving your CCB real deployment, rollback, and pipeline metrics instead of anecdotes. [Request a demo](https://boundera.io/request-demo) to see the full CMT family evaluated together.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.CMT.indicators["KSI-CMT-RVP"]`)
- NIST SP 800-53 Rev 5: CM-3, CM-3(2), CM-3(4), CM-5, CM-7(1), CM-9
