# What is FedRAMP 20x?

> *Plain-English background for engineers who don't live in FedRAMP every day. For the canonical specification, see [fedramp.gov](https://www.fedramp.gov/).*

## The short version

FedRAMP 20x is the FedRAMP program's redesign for cloud authorizations. It replaces the traditional 700-page-Word-document, point-in-time assessment model with a machine-readable, continuously-validated approach built on:

- **OSCAL** (Open Security Controls Assessment Language) — a NIST family of JSON/XML/YAML formats for representing security controls and evidence. OSCAL is the wire format.
- **Key Security Indicators (KSIs)** — outcome-based requirements grouped into 11 thematic families. KSIs are what you have to demonstrate.
- **Continuous validation** — evidence is collected and assessed on an ongoing basis rather than annually.

## Why it matters

The legacy FedRAMP path costs $500k–$1.5M and takes 18–24 months. Most of that cost is the human work of writing and re-writing the System Security Plan in Word and assembling evidence in spreadsheets.

The 20x design assumes:

- Your evidence comes from your cloud environment directly (CloudTrail, Azure Monitor, etc.)
- Your KSI package is machine-readable and validatable
- Your 3PAO can run automated checks on your package before they ever look at a document
- Your authorization status is current at all times, not "as of last year's annual assessment"

## Timeline (as of May 2026)

- **Phase 1 (RFC-0006):** Original 20x KSI specification published
- **Phase 2:** Pilot submissions accepted; community feedback gathered
- **Phase 3 (current):** Consolidated Rules finalization. The full rule set will be finalized by end of FY26 Q3 (June 2026).
- **FY26 Q4 (July–September 2026):** The 20x submission pipeline opens, initially supporting Class A (Pilot), Class B (Low), and Class C (Moderate) Certifications.

## The KSI families

There are 11 KSI families in the FedRAMP 20x specification:

| Code | Family |
|------|--------|
| Code | Family | Indicators |
|------|--------|------------|
| AFR  | Authorization by FedRAMP                | 10 |
| CNA  | Cloud Native Architecture               |  8 |
| IAM  | Identity and Access Management          |  7 |
| MLA  | Monitoring, Logging, and Auditing       |  5 |
| CED  | Cybersecurity Education                 |  4 |
| CMT  | Change Management                       |  4 |
| PIY  | Policy and Inventory                    |  5 |
| INR  | Incident Response                       |  3 |
| RPL  | Recovery Planning                       |  4 |
| SVC  | Service Configuration                   |  8 |
| SCR  | Supply Chain Risk                       |  2 |
| **Total** |                                    | **60** |

Each indicator is identified by a three-letter mnemonic (e.g., `KSI-IAM-MFA` for "Enforcing Phishing-Resistant MFA," `KSI-MLA-OSM` for "Operating SIEM Capability"). Each indicator is satisfied by specific, citable evidence from your cloud environment.

Counts and IDs here track **FRMR v0.9.43-beta** (last updated 2026-04-08). Earlier releases used numeric indicator IDs (e.g., `KSI-IAM-01`); v0.9.0-beta introduced the mnemonic convention used today. Every indicator in this release carries an `fka` field holding its prior numeric ID for SSPs authored against earlier releases.

## How does this differ from traditional FedRAMP?

| | Traditional FedRAMP | FedRAMP 20x |
|---|---|---|
| Primary artifact | SSP (Word, 700+ pages) | OSCAL JSON/XML KSI package |
| Evidence model | Human narrative + screenshots | Machine-readable, sourced from telemetry |
| Assessment cadence | Annual + monthly ConMon | Continuous |
| Time to authorization | 18–24 months | Weeks (target) |
| 3PAO workflow | Manual review | Automated checks + targeted review |
| Output format | `.docx` | `.docx` + OSCAL JSON + OSCAL XML |

## What this toolkit covers

This repository helps with one specific slice of the 20x journey: validating that the KSI package you're preparing is structurally and semantically correct before you hand it to a 3PAO. It does **not** generate the package for you, collect evidence from your cloud accounts, or perform a full OSCAL validation — see [Boundera](https://boundera.io) for the full-stack version.

## Further reading

- [FedRAMP 20x program documentation](https://www.fedramp.gov/20x/)
- [FedRAMP Key Security Indicators](https://www.fedramp.gov/docs/20x/key-security-indicators/)
- [NIST OSCAL project](https://pages.nist.gov/OSCAL/)
- [GSA fedramp-automation](https://github.com/GSA/fedramp-automation)
- [RFC-0006: 20x Phase One Key Security Indicators](https://www.fedramp.gov/rfcs/0006/)
