# AWS reference implementation: KSI-MLA-EVC

A self-contained Terraform module that produces evidence aligned to **KSI-MLA-EVC** (Evaluating Configurations) on AWS.

## What this deploys

Per region in `var.boundary_regions`:

- AWS Config configuration recorder + delivery channel
- 5 baseline AWS Config managed rules (S3 public-access prohibited, S3 versioning, EBS encryption, root MFA, CloudTrail on)
- An EventBridge rule routing Config compliance-change events to SNS
- An SNS topic for drift alerts (with optional email subscription via `var.alert_email`)

Shared, single-region:

- An S3 bucket with object-lock and 540-day (18-month) retention for Config evaluation evidence
- An IAM role used by the Config service

## How to run

```bash
cd implementations/aws/ksi-mla-evc
terraform init
terraform plan \
  -var="config_bucket_name=YOUR-UNIQUE-NAME" \
  -var='boundary_regions=["us-east-1","us-west-2"]' \
  -var="alert_email=ops@yourcompany.com"
```

> ⚠️ The S3 bucket name must be globally unique. The Config service is regional but the IAM role is global, so this module assumes you run it once per account, not once per region.

## What this proves (and what it doesn't)

This module produces the **infrastructure-side evidence** for KSI-MLA-EVC:

- ✅ Config recorders enabled in every declared region
- ✅ Baseline rules running and evaluating compliance
- ✅ Drift events generated and routed
- ✅ Evidence retention enforced (object-lock, 18 months)
- ✅ Alert path declared

It deliberately does **not** include:

- ❌ The remediation runbook (every CSP's runbook differs by what they consider acceptable auto-remediation — write your own per `var.boundary_regions`)
- ❌ The narrative SSP language tying this back to the KSI
- ❌ The 3PAO interview prep (humans, not Terraform)

These extensions are intentionally left as starter scaffolding — the goal is to give you a working baseline, not a copy-paste SSP.

## Evidence produced

The module exposes an `output "ksi_mla_evc_evidence"` block that's structured for direct consumption by [Boundera/fedramp-20x-ksi-action](https://github.com/Boundera/fedramp-20x-ksi-action). The action reads it from `terraform output` and tags the evidence with the KSI ID.

## Integration with the Boundera Atlas page

Authoring guidance, common 3PAO gaps, and the FedRAMP/rules source text for this KSI are at the Atlas page rendered from the enrichment in `enrichments/ksi/mla-evc.md`. Public URL: `boundera.io/fedramp-20x/ksi/mla/evc`.

## License

MIT (same as the toolkit).
