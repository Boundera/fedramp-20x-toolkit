---
id: KSI-IAM-APM
kind: ksi
family: IAM
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
  - KSI-IAM-SNU
  - KSI-IAM-JIT
  - KSI-IAM-SUS

oss_action_checks_this: false
---

## Plain English

The 2026 consolidated rules have no standalone MFA indicator — everything the old KSI-IAM-MFA proved now lives here. So this KSI carries two burdens at once: the passwordless/strong-password posture *and* the phishing-resistant MFA enforcement behind it. You need to show:

1. **Where passwords still exist, they are strong.** On AWS that means an IAM password policy of at least 14 characters requiring uppercase, lowercase, numbers, and symbols — miss any one and the policy fails.
2. **Every interactive user has MFA.** Console-enabled AWS users must show `mfa_active` in the credential report and an enrolled MFA device; Okta users must be MFA-enrolled; Azure must enforce MFA tenant-wide.
3. **At least one factor per user is phishing-resistant.** Okta users need an ACTIVE factor from {WebAuthn, Okta FastPass, U2F, hardware token} — SMS, voice, push, and software TOTP alone do not satisfy this assertion.
4. **Enforcement is policy, not habit.** Azure Security Defaults enabled or a Conditional Access policy that is enabled and requires MFA; Okta sign-in policies with active rules.

The most common failure: "MFA is on" but every enrolled factor is phishable — the per-user phishing-resistant assertion fails across the whole directory even though enrollment looks 100%.

## Implementation: AWS

- **IAM password policy** — minimum length ≥ 14 plus all four character classes; the engine fails the policy resource itself if any requirement is off.
- **Credential report** — any user with `password_enabled=true` must have `mfa_active=true`; programmatic-only users (no console password) pass this assertion, since they are covered by KSI-IAM-SNU instead.
- **IAM users** — console-access users must have at least one MFA device enrolled; users without console access are exempt.

Independently checkable via Prowler: `iam_password_policy_minimum_length_14`, `iam_user_mfa_enabled_console_access`, `iam_root_mfa_enabled`, `iam_user_hardware_mfa_enabled`.

## Implementation: Azure

- **Security Defaults** — `isEnabled` must be true; this both fails as a per-resource finding when off and satisfies the tenant-wide-enforcement group when on.
- **Conditional Access** — a policy passes when its state is enabled *and* its grant controls include MFA. One such policy is enough (any-pass): the engine looks for at least one enforced MFA path, not MFA in every policy.

Independently checkable via Prowler: `entra_security_defaults_enabled`, `entra_privileged_user_has_mfa`, `entra_non_privileged_user_has_mfa`, `entra_conditional_access_policy_require_mfa_for_management_api`.

## Implementation: GCP

Honest gap: Google Cloud exposes no native user-MFA signal — user MFA for GCP is enforced through Google Workspace, which is not currently a Boundera connector, so the engine cannot evaluate GCP user authentication for this KSI. The Prowler PR #11701 mapping agrees: it maps zero GCP checks to KSI-IAM-APM. If GCP is in your boundary, plan on Workspace-side evidence for your assessor.

## Evidence example

The 2026 evaluation is the union of the legacy APM and MFA signal sets, de-duplicated — all connector-driven, per-resource unless noted:

- `aws:password_policy` — password policy meets ≥14-char, four-character-class strength
- `aws:credential_report` — every console-enabled user has MFA active
- `aws:iam_users` — console users have MFA device(s) enrolled
- `azure:entra_mfa` — three assertions: Security Defaults enabled (scored per resource *and* as an any-pass enforcement group) and at least one enabled Conditional Access policy requiring MFA (any-pass)
- `okta:mfa_enrollment` — three assertions per user: the enrollment flag is set, at least one factor is enrolled, and at least one ACTIVE factor is phishing-resistant (WebAuthn / FastPass / U2F / hardware token)
- `okta:signin_policies` — sign-in policies have active authentication rules

There is no manual-evidence requirement on the 2026 build of this KSI — the merged check is entirely connector-driven, so the indicator moves with your live directory on every scan.

## Common gaps

1. **Password policy one notch short.** Length 12, or symbols not required — the AWS policy assertion is all-or-nothing at the IA-5(1) thresholds.
2. **Console users without MFA.** `password_enabled=true` with `mfa_active=false` in the credential report, or a console user with an empty MFA-device list.
3. **100% enrolled, 0% phishing-resistant.** Okta directories where every factor is SMS, push, or software TOTP — enrollment assertions pass, the phishing-resistant assertion fails for every user.
4. **Azure with nothing enforcing MFA.** Security Defaults switched off (common once Conditional Access is adopted) without any enabled CA policy whose grant controls actually require MFA.
5. **Dormant Okta policy.** A sign-in policy that exists but has no ACTIVE rules — policy objects alone are not enforcement.

## Notes for Boundera customers

Because 2026 folds MFA into APM, Boundera rebuilds this indicator as one merged check: `aws:password_policy`, `aws:credential_report`, `aws:iam_users`, `azure:entra_mfa`, `okta:mfa_enrollment`, and `okta:signin_policies` — AWS and Azure covered natively, Okta covering IdP-managed users, and the GCP user-MFA gap stated openly rather than papered over. Connect the AWS, Azure, and Okta connectors and the whole set evaluates automatically; no uploads needed.

[Request a demo](https://boundera.io/request-demo) to watch KSI-IAM-APM run against your real credential report and Okta factor inventory — you will see exactly which users lack a phishing-resistant factor, not just an MFA-coverage percentage.

## References

- FRMR rule definition: `data/fedramp-rules/fedramp-consolidated-rules.json` → `KSI.IAM.indicators["KSI-IAM-APM"]`
- NIST SP 800-53 Rev 5: AC-3, IA-5(1), IA-5(2), IA-5(6), IA-6, AC-2, IA-2, IA-2(1), IA-2(2), IA-2(8), IA-5, IA-8, SC-23
- Prowler FedRAMP 20x mapping (prowler-cloud/prowler#11701, unmerged): per-provider check IDs cited above
