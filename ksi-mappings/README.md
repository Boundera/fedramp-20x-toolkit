# ksi-mappings

Per-cloud, per-family mappings from KSI indicators to evidence sources you can collect from a live cloud environment.

## Layout

```
ksi-mappings/
├── README.md              ← you are here
└── aws/
    ├── iam/
    │   ├── mapping.yaml   ← KSI-IAM → AWS evidence
    │   └── README.md      ← practitioner walkthrough
    └── mla/
        ├── mapping.yaml   ← KSI-MLA → AWS evidence
        └── README.md
```

## Scope

This public toolkit covers **2 of 11 KSI families on AWS**: `KSI-IAM` and `KSI-MLA`. Azure and GCP are planned for v0.2.

The other nine KSI families — AFR, CNA, CED, CMT, PIY, INR, RPL, SVC, SCR — and Azure / GCP coverage live in [Boundera](https://boundera.io). See [`/docs/how-this-repo-relates-to-boundera.md`](../docs/how-this-repo-relates-to-boundera.md) for the rationale.

## Source of truth

All mappings track **FRMR v0.9.43-beta** (last updated 2026-04-08). Every `mapping.yaml` carries `frmr_version` and `last_validated` fields. When FedRAMP publishes a new release, we re-validate within 72 hours and update both fields.

Indicators use the mnemonic ID convention introduced in v0.9.0-beta (e.g., `KSI-IAM-MFA`). Each mapping also carries the indicator's prior numeric ID under `fka` ("formerly known as") so SSPs authored against earlier releases can still cross-reference.

## File schema

Each `mapping.yaml` follows this shape:

```yaml
family: IAM
family_name: Identity and Access Management
frmr_version: "0.9.43-beta"
last_validated: "2026-05-22"
cloud: aws
theme: >
  Theme statement from the FRMR document.

indicators:
  - id: KSI-IAM-MFA           # canonical mnemonic ID
    fka: KSI-IAM-01           # formerly known as (numeric ID)
    name: Enforcing Phishing-Resistant MFA
    statement: >
      Verbatim statement from the FRMR document.
    nist_800_53_controls:     # crosswalk from the FRMR document
      - ac-2
      - ia-2
      # ...
    aws_evidence:
      service: AWS IAM Identity Center
      source_type: Identity Center MFA configuration
      source_id: sso-admin:DescribeMfaDevices
      documentation_url: https://docs.aws.amazon.com/...
      summary: >
        Short description of what this evidence proves.
      evidence_shape: >       # illustrative; not normative
        instance_arn: arn:aws:sso:::instance/...
        mfa_mode: AlwaysOn
      common_gaps:
        - Bullet list of things we typically see go wrong.
```

## Validating a mapping file

```bash
yamllint ksi-mappings/aws/iam/mapping.yaml
python tools/ksi-validator/src/validate_mapping.py ksi-mappings/aws/iam/mapping.yaml
```

The validator confirms: every indicator ID in the file matches the canonical FRMR; every `nist_800_53_controls` entry is a real Rev 5 control; required keys are present.

## Contributing additional evidence sources

We accept PRs adding more AWS evidence sources to existing indicators. See [`/CONTRIBUTING.md`](../CONTRIBUTING.md). Mappings for additional KSI families are out of scope for this public toolkit — those live in the commercial product.
