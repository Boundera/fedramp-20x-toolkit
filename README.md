# fedramp-20x-toolkit

> Open-source KSI mappings, OSCAL examples, and a validator CLI for FedRAMP 20x.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FedRAMP 20x](https://img.shields.io/badge/FedRAMP-20x-0B2545.svg)](https://www.fedramp.gov/)
[![OSCAL 1.1](https://img.shields.io/badge/OSCAL-1.1-1F6FEB.svg)](https://pages.nist.gov/OSCAL/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#status)

A community resource for Cloud Service Providers preparing FedRAMP 20x submissions. Practitioner-grade mappings from AWS evidence sources to Key Security Indicators (KSIs), sample OSCAL packages, and a CLI to validate your KSI package before you submit.

This repository is maintained by [Boundera](https://boundera.io) and released under the MIT license. See [How this relates to Boundera](#how-this-relates-to-boundera) for the relationship between this toolkit and the commercial product.

---

## What's inside

```
fedramp-20x-toolkit/
├── ksi-mappings/
│   └── aws/
│       ├── iam/          KSI-IAM → AWS evidence (Identity & Access Management)
│       └── mla/          KSI-MLA → AWS evidence (Monitoring, Logging, Auditing)
├── examples/
│   ├── sample-ksi-package.oscal.json    Valid sample KSI package in OSCAL JSON
│   └── sample-ssp-snippet.oscal.json    SSP fragment referencing KSI evidence
├── tools/
│   └── ksi-validator/    Python CLI that validates an OSCAL KSI package
└── docs/
    ├── what-is-fedramp-20x.md
    └── how-this-repo-relates-to-boundera.md
```

## Quick start

Validate a KSI package against the schema and check for missing or malformed indicators:

```bash
pip install fedramp-ksi-validator
ksi-validator validate path/to/your-ksi-package.oscal.json
```

Or run from source:

```bash
git clone https://github.com/Boundera/fedramp-20x-toolkit
cd fedramp-20x-toolkit/tools/ksi-validator
pip install -e .
ksi-validator validate ../../examples/sample-ksi-package.oscal.json
```

Sample output:

```
ksi-validator 0.1.0
Validating: sample-ksi-package.oscal.json

✓ OSCAL schema valid
✓ KSI package structure valid
✓ All 11 KSI families present
✓ 60 indicators present
⚠ KSI-IAM-MFA: evidence reference missing required `source-system` field
✗ KSI-MLA-ALA: indicator not found in package

Result: FAIL (1 error, 1 warning)
```

## KSI mappings

This toolkit publishes detailed mappings for two of the eleven KSI families on AWS:

- **[KSI-IAM (Identity & Access Management)](ksi-mappings/aws/iam/)** — All 7 indicators: phishing-resistant MFA (`KSI-IAM-MFA`), passwordless methods (`KSI-IAM-APM`), non-user authentication (`KSI-IAM-SNU`), just-in-time authorization (`KSI-IAM-JIT`), least privilege (`KSI-IAM-ELP`), suspicious activity response (`KSI-IAM-SUS`), automated account management (`KSI-IAM-AAM`)
- **[KSI-MLA (Monitoring, Logging, Auditing)](ksi-mappings/aws/mla/)** — All 5 indicators: SIEM operation (`KSI-MLA-OSM`), log review (`KSI-MLA-RVL`), configuration evaluation (`KSI-MLA-EVC`), event-type logging (`KSI-MLA-LET`), log access authorization (`KSI-MLA-ALA`)

Each mapping shows, for every indicator in the family:

- The KSI requirement in plain English
- Two or three AWS evidence sources that satisfy it (real AWS Config managed rule names, real CloudWatch metric names, real Security Hub control IDs)
- A sample evidence shape so you know what valid evidence looks like
- Common gaps engineers see during readiness assessments

The remaining nine KSI families (AFR, CNA, CED, CMT, PIY, INR, RPL, SVC, SCR) are not mapped in this public toolkit. Boundera's commercial product maps all 60 indicators across AWS, Azure, and GCP automatically — see [How this relates to Boundera](#how-this-relates-to-boundera).

> **Provenance**: mappings in this repo target FRMR documentation **v0.9.43-beta** (last updated 2026-04-08), which defines 11 KSI families containing 60 indicators in total. Indicator IDs follow the mnemonic naming convention introduced in v0.9.0-beta (e.g., `KSI-IAM-MFA`, `KSI-MLA-OSM`). Older numeric IDs (`KSI-IAM-01`, etc.) are preserved on each indicator under an `fka` ("formerly known as") field for backwards compatibility with SSPs authored against earlier releases.

## OSCAL examples

The `examples/` directory contains valid OSCAL JSON documents you can use as references:

- `sample-ksi-package.oscal.json` — A full, valid KSI package in OSCAL format
- `sample-ssp-snippet.oscal.json` — An SSP fragment showing how KSI evidence is referenced from system-implementation

These are illustrative only and not based on any real system. Don't submit them.

## The validator

`tools/ksi-validator/` is a Python CLI that performs three checks:

1. OSCAL schema validation (delegates to `nist-pages-oscal` schemas)
2. KSI package structure validation (all expected families and indicators present)
3. KSI-specific semantic checks (evidence references resolvable, indicator IDs match the published KSI list)

It complements, rather than replaces, the official [NIST OSCAL CLI](https://github.com/usnistgov/oscal-cli). Use `oscal-cli` for deep OSCAL validation; use this for KSI-specific structure and content checks.

## How this relates to Boundera

Boundera is a commercial AI copilot for FedRAMP authorization. We built the mappings and examples in this repo because we believe the FedRAMP 20x community benefits from practitioner-grade public references, and because shared standards reduce ambiguity for everyone preparing 20x submissions.

What's in this repo:

- KSI mappings for two of eleven families on AWS
- Sample OSCAL packages
- A focused validator that checks structure and KSI conformance

What's not in this repo (and is in Boundera's commercial product):

- Mappings for the other nine KSI families
- Mappings for Azure and GCP
- Automated evidence collection from your cloud environments
- Live, continuously-updated KSI compliance posture
- Audit-ready Word + OSCAL package generation for 3PAOs

If you'd like to see the full mapping or a walkthrough of how automated evidence collection works, [request a demo](https://boundera.io/request-demo).

## Status

**Alpha (v0.1.x).** The mappings and validator work, but expect interface changes before v1.0. We will tag every breaking change with a SemVer major bump.

The KSI definitions implemented here are based on **FRMR v0.9.43-beta** (2026-04-08). We update mappings within 72 hours of any change to the upstream FedRAMP KSI documentation; each mapping file carries a `frmr_version` and `last_validated` field for provenance.

## Contributing

We welcome contributions, especially:

- Additional AWS evidence sources for indicators we already map
- Bug reports against the validator
- Test cases for OSCAL edge conditions
- Documentation improvements

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before opening a PR. Discussions about scope, roadmap, or "should X be in this repo" belong in [GitHub Discussions](https://github.com/Boundera/fedramp-20x-toolkit/discussions), not Issues.

## Security

If you discover a security issue in the validator or any code in this repo, please follow the disclosure process in [SECURITY.md](SECURITY.md). Do not open a public issue for security reports.

## Acknowledgments

- The [FedRAMP PMO](https://www.fedramp.gov/) for publishing the KSI specification and OSCAL templates
- [NIST](https://pages.nist.gov/OSCAL/) for the OSCAL standard
- [GSA's fedramp-automation](https://github.com/GSA/fedramp-automation) project for the foundational tooling and schemas this toolkit builds on
- The 3PAO community for feedback on early drafts

## License

Released under the [MIT License](LICENSE). The KSI definitions themselves are published by the FedRAMP PMO and are not subject to this license; see [fedramp.gov](https://www.fedramp.gov/) for canonical KSI documentation.

---

Maintained by [Boundera](https://boundera.io). Questions, ideas, or just want to say hi? Open a [Discussion](https://github.com/Boundera/fedramp-20x-toolkit/discussions).
