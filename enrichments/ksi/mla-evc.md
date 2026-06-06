---
id: KSI-MLA-EVC
kind: ksi
family: MLA
last_reviewed_upstream_version: "2026-06-04-c40b7d7"
last_reviewed_by: eddy@boundera.io
last_reviewed_on: "2026-06-05"
confidence: high

authors:
  - name: Eddy Agu
    role: Founder, Boundera
    github: chukyjack

implementations:
  aws:
    status: complete
    module_path: implementations/aws/ksi-mla-evc
    primary_services:
      - AWS Config
      - EventBridge
      - SNS
      - SSM Automation
    cost_signal: low
    deployment_time_estimate: 15min
    runtime_dependencies:
      - CloudTrail enabled in every in-scope region
      - S3 bucket with object-lock for ≥ 18-month retention
  azure:
    status: placeholder
  gcp:
    status: placeholder

sme_reviewed: false

related_ksis:
  - KSI-MLA-CMT
  - KSI-MLA-ALA
  - KSI-CNA-IMM

oss_action_checks_this: true
oss_action_section_anchor: "#ksi-mla-evc"
---

## Plain English

You need to prove three things, continuously, and not just on paper:

1. You have a documented configuration baseline for every in-scope resource.
2. Your system actually checks live cloud configuration against that baseline on an ongoing basis (not "we'll look at this monthly").
3. When configuration drifts from baseline, you detect it, alert a human, and remediate within a stated SLA — with an audit trail that proves all three steps happened.

The most common reason 3PAOs reject evidence for this KSI: a CSP shows a configuration document but cannot produce the runtime detection signal. Documents alone do not satisfy this — you need a running detector with evidence of triggering and remediating drift.

## Implementation: AWS

The minimum viable architecture uses four AWS services. The Terraform in `implementations/aws/ksi-mla-evc/` deploys a complete reference implementation — it is standalone, you can `terraform plan` it against your own AWS account to see what is created.

### Required services
- **AWS Config** — configuration recording and rule evaluation
- **AWS Config Rules** — the actual conformance checks (managed + custom)
- **EventBridge + SNS** — drift detection alerting
- **SSM Automation** — automated remediation runbooks

### Caveats
1. AWS Config **must be enabled in every region in your boundary**, not just primary. The most-cited gap on this KSI is "Config disabled in us-west-2 even though we said us-east-1 + us-west-2 are in scope."
2. Config rule evaluations cost approximately $0.001 per evaluation. Budget impact becomes meaningful at thousands of resources × hundreds of rules × monthly evaluations.
3. Remediation must be **provably automatic**. SSM Automation runbook execution generates audit-trail evidence; manual `kubectl apply` does not. The 3PAO will ask "show me the runbook that fired" — if the answer is a Slack thread, this KSI fails.
4. The "timely" requirement is not defined in the FRMR text. Industry norms: detect within 15 minutes, alert within 5 minutes of detection, remediate within 1 hour for high-severity. Document your SLA in the SSP; the 3PAO will hold you to it.
5. Match the baseline in your SSP to the baseline deployed. Tie the baseline document to a git commit hash referenced from the SSP narrative.

## Evidence example

The OSCAL evidence package for KSI-MLA-EVC should include:

- A `system-component` entry for each AWS Config recorder
- An `implementation` block tying the recorder back to KSI-MLA-EVC by ID
- Per-region status (active/inactive) for each recorder
- A pointer to the audit log location where Config evaluation results land
- Remediation runbook ARNs + recent execution timestamps

See `implementations/aws/ksi-mla-evc/evidence/` for an annotated sample. (Phase 2 backlog: ship the annotated sample.)

## Common gaps

Drawn from real 3PAO findings (sanitized):

1. **Config enabled in 3 of 4 in-scope regions.** Most common single finding. Always audit your boundary regions against your Config coverage.
2. **Drift events generated, no SNS subscriber.** EventBridge fires the event but nobody is listening — no alerting evidence to produce.
3. **Remediation triggered, no execution audit trail.** SSM Automation runbook ran but logs were rotated before evidence was captured. Set minimum 18-month retention with object-lock.
4. **Baseline document version 2 in SSP, version 4 deployed.** The documented baseline drifts from the deployed baseline.
5. **"Continuously" defined as "monthly" in the SSP.** "Continuously" in FedRAMP 20x means more frequent than review cadence. Industry safe definition: ≤ 24h detection latency.

## Notes for Boundera customers

The Boundera open-source [GitHub Action](https://github.com/Boundera/fedramp-20x-ksi-action) checks KSI-MLA-EVC by parsing your Terraform plan output and verifying:

- AWS Config recorder declared in every region your boundary lists
- A minimum set of managed Config rules is present
- EventBridge → SNS → SSM Automation paths declared in the IaC

For the platform implementation that automates *runtime* evidence capture (not just the IaC declaration), [request a demo](https://boundera.io/request-demo).

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` (`KSI.MLA.data.[all|20x].EVC`)
- AWS Config: https://aws.amazon.com/config/
- NIST SP 800-53 Rev 5: AC-2, CM-2, CM-6, CM-7, SI-4
