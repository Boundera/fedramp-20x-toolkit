# KSI-IAM on AWS

Maps **all 7 indicators** in the FedRAMP 20x Identity and Access Management family to canonical AWS evidence sources.

This page is the practitioner walkthrough. The machine-readable version is in [`mapping.yaml`](mapping.yaml). If you only want to know "what AWS thing satisfies indicator X," start with the table below. If you want the *why* — keep reading.

## At a glance

| Indicator | New ID | FKA | Canonical AWS evidence |
|---|---|---|---|
| Phishing-Resistant MFA | `KSI-IAM-MFA` | `KSI-IAM-01` | Identity Center MFA mode = `AlwaysOn` with FIDO2/WebAuthn only |
| Passwordless Methods | `KSI-IAM-APM` | `KSI-IAM-02` | Identity Center primary auth = passkey; strict password policy as fallback |
| Non-User Authentication | `KSI-IAM-SNU` | `KSI-IAM-03` | AWS Config `IAM_USER_NO_POLICIES_CHECK` + Secrets Manager rotation enabled |
| Just-in-Time Authorization | `KSI-IAM-JIT` | `KSI-IAM-04` | Identity Center Permission Sets with `session_duration ≤ PT1H` for privileged roles |
| Least Privilege | `KSI-IAM-ELP` | `KSI-IAM-05` | IAM Access Analyzer (unused access) — org-wide, findings within SLA |
| Suspicious Activity Response | `KSI-IAM-SUS` | `KSI-IAM-06` | GuardDuty `IAMUser/*` findings → EventBridge → Lambda auto-remediation |
| Automated Account Management | `KSI-IAM-AAM` | `KSI-IAM-07` | Identity Center SCIM provisioning from Okta/Entra ID |

> Provenance: indicator IDs, names, and statements track FRMR documentation **v0.9.43-beta** (2026-04-08). NIST 800-53 control crosswalks pulled from the same source.

## How to read this mapping

Each indicator in `mapping.yaml` includes:

1. **`id` and `fka`** — the canonical mnemonic ID and its prior numeric ID. Cite `id` in new SSPs; `fka` is there for cross-references in older documents.
2. **`statement`** — the verbatim FRMR requirement text.
3. **`nist_800_53_controls`** — the Rev 5 control crosswalk pulled from FRMR. Useful if you're migrating from a Rev 5 SSP and want to know which existing control narratives feed into which KSI.
4. **`aws_evidence`** — one canonical evidence source per indicator. In real assessments you'll typically want 2–4 evidence sources per indicator, but one well-chosen example is enough to demonstrate the methodology.
5. **`evidence_shape`** — what the evidence object looks like once collected. Illustrative — your actual collector will produce something tailored to your environment.
6. **`common_gaps`** — the things we see go wrong most often in readiness assessments. If your environment shows any of these patterns, expect a finding.

## Indicator-by-indicator notes

### KSI-IAM-MFA — Enforcing Phishing-Resistant MFA

The word that does the work here is *phishing-resistant*. TOTP apps and SMS satisfy "MFA" but **not** phishing-resistant MFA. The bar in 2026 is FIDO2 hardware keys (YubiKey, Titan) and platform WebAuthn (Touch ID, Windows Hello). If your Identity Center MFA settings still allow TOTP, you may be MFA-compliant against legacy NIST 800-53 IA-2.1/2 but you are *not* phishing-resistant.

For federated identities flowing in via SAML or OIDC from Okta / Entra ID, the phishing-resistant guarantee has to be enforced at the IdP — Identity Center can't second-guess what factor the IdP used.

### KSI-IAM-APM — Adopting Passwordless Methods

Read this together with `KSI-IAM-MFA`. APM is about *primary authentication*; MFA is about *factor strength*. Passwordless (passkey, WebAuthn) actually subsumes the phishing-resistance requirement because the factor IS the cryptographic proof. If your primary auth is passwordless, both indicators are satisfied by the same configuration.

The "otherwise enforce strong passwords with MFA" clause is the escape hatch for legacy workloads. Don't lean on it unless you have to — and document why you couldn't go passwordless.

### KSI-IAM-SNU — Securing Non-User Authentication

This is where most CSPs accumulate technical debt. Service-to-service communication using static IAM access keys, embedded in code or rotated by a stale Lambda — every one of those is a finding waiting to happen.

The right pattern in AWS 2026:
- Workloads inside AWS use IAM roles with `sts:AssumeRole` — no static credentials at all.
- Workloads outside AWS use IAM Roles Anywhere or OIDC federation, not access keys.
- Shared secrets (DB credentials, API keys) live in Secrets Manager with automatic rotation enabled.
- The `IAM_USER_NO_POLICIES_CHECK` Config rule will catch the common antipattern; the absence of `iam:AccessKey` resources in your accounts is the stronger signal.

### KSI-IAM-JIT — Authorizing Just-in-Time

The literal bar is `just-in-time`. In practice this means: no person should hold the `AdministratorAccess` Permission Set as a permanent group assignment. They request it; an approval workflow grants it for a bounded session; the grant expires.

In AWS this looks like:
- Permission Sets configured with `session_duration: PT1H` (one hour) for privileged sets.
- Identity Center Account Assignment created on demand via a workflow (Slack approval → Lambda → `sso-admin:CreateAccountAssignment`).
- Removal scheduled via EventBridge after the session expires.
- CloudTrail records the full lifecycle for the SAR.

### KSI-IAM-ELP — Ensuring Least Privilege

`Persistently` is the key word. Least privilege isn't a one-time policy review — it's a continuous evaluation. AWS IAM Access Analyzer (the unused access flavor, GA'd in 2024) is purpose-built for this. Turn it on at the organization level, in every region you operate in, and treat findings like POA&M items.

The common mistake here is enabling Access Analyzer only in `us-east-1`. The findings are regional. Multi-region operations need multi-region analyzers.

### KSI-IAM-SUS — Responding to Suspicious Activity

This indicator specifically says `automatically disable`. Human-in-the-loop response doesn't satisfy it. The reference implementation in AWS:

1. GuardDuty detects an `IAMUser/*` or `Stealth:IAMUser/*` finding.
2. EventBridge rule pattern-matches on those finding types.
3. Lambda function:
   - Detaches all policies from the principal.
   - Deactivates active access keys.
   - Ends Identity Center sessions via `sso-admin:DeleteAccountAssignment`.
   - Pages the on-call engineer for forensic follow-up.
4. The whole pipeline completes in under 30 seconds.

The mean time-to-contain (MTTC) is a number your CSP should be tracking and reporting monthly.

### KSI-IAM-AAM — Automating Account Management

The "automation" in the indicator is what disqualifies the common "we have a Confluence page describing our offboarding process" answer. The bar is system-to-system propagation.

The reference pattern is SCIM from the authoritative IdP (Okta, Entra ID, JumpCloud) into Identity Center. HR terminates an employee → IdP marks them inactive → SCIM pushes the change → Identity Center deprovisions → CloudTrail records the deprovisioning event with a correlation ID.

The metric your 3PAO will ask for: **median lag between IdP termination and AWS deprovisioning**. Target: under 30 minutes; ideal: under 5 minutes.

## What this mapping does NOT cover

- **Azure / Entra ID native identities.** Coming in v0.2.
- **GCP IAM.** Coming in v0.2.
- **Non-cloud identity systems** (on-prem AD, self-hosted Keycloak). Out of scope for this toolkit — Boundera's commercial product handles hybrid scenarios.
- **The other six KSI families.** AFR, CNA, CED, CMT, PIY, INR, RPL, SVC, SCR — see [`/docs/how-this-repo-relates-to-boundera.md`](../../../docs/how-this-repo-relates-to-boundera.md).
- **Multiple evidence sources per indicator.** This public mapping shows one canonical source per indicator. Production assessments typically use 3–7.

## Contributing

We accept PRs adding more AWS evidence sources to indicators already in this file. See [`/CONTRIBUTING.md`](../../../CONTRIBUTING.md). Cite AWS documentation URLs in your PR and update `last_validated`.
