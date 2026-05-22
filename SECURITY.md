# Security Policy

## Supported Versions

The `fedramp-20x-toolkit` is in alpha. We provide security fixes only for the
latest published release on the `main` branch.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✓         |
| < 0.1   | ✗         |

## Reporting a Vulnerability

If you discover a security vulnerability in any code in this repository
(particularly the `ksi-validator` CLI), please **do not** open a public issue.

Instead, report it privately:

- **Preferred:** Use GitHub's [Private Vulnerability Reporting](https://github.com/Boundera/fedramp-20x-toolkit/security/advisories/new)
- **Email:** `security@boundera.io` with subject line `[fedramp-20x-toolkit] Vulnerability report`

Please include:

- A description of the issue and its potential impact
- Steps to reproduce
- The version or commit hash where the issue exists
- Any suggested remediation

## Response timeline

- **Acknowledgment:** within 2 business days
- **Initial assessment:** within 5 business days
- **Fix or mitigation plan:** within 30 days for high-severity issues; longer for low-severity
- **Coordinated disclosure:** we'll work with you on timing for public disclosure

## Scope

This policy covers vulnerabilities in:

- The `ksi-validator` CLI source code
- CI/CD workflows in this repository
- Documentation that, if exploited, could mislead users into insecure configurations

Out of scope:

- Vulnerabilities in dependencies (please report those upstream; we'll bump versions on disclosure)
- The Boundera commercial product (report via `security@boundera.io` directly)
- The FedRAMP program or KSI specification itself (report to the FedRAMP PMO)

## Recognition

We're happy to acknowledge security researchers in release notes and our
SECURITY-RESEARCHERS.md (with permission). We do not currently offer a bug
bounty for this repository.
