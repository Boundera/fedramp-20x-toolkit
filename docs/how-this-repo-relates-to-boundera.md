# How this repo relates to Boundera

Boundera is a commercial AI copilot for FedRAMP authorization. This repository is open-source. The relationship between the two is intentional and worth being transparent about.

## Why we built this

Three reasons:

1. **Practitioner-grade public references for FedRAMP 20x are scarce.** Most public KSI commentary stops at "what is a KSI." Engineers preparing real submissions need to know which AWS Config rule satisfies which indicator, what the evidence shape looks like, and how the package validates. Putting that into the open benefits the whole community.

2. **Shared standards reduce ambiguity.** If multiple vendors converge on the same way of structuring a KSI package, 3PAOs can build tooling around a predictable input, and CSPs spend less time arguing about format and more time on actual security.

3. **We learn from contributions.** Federal engineering teams have seen edge cases we haven't. Open issues and PRs surface those.

## What's in this repo

- **Mappings for 2 of the 11 KSI families** on AWS: KSI-IAM and KSI-MLA
- **Sample OSCAL packages** showing structure
- **A validator CLI** that checks KSI package structure and conformance
- **Documentation** that's accurate and useful even if you never use Boundera

The mappings show real evidence sources with real AWS Config rule names. They're depth-on-two, not breadth-across-eleven.

## What's in the commercial product

- **Mappings for all 11 KSI families** — the 9 we don't publish here, plus deeper coverage on IAM and MLA
- **Mappings for Azure and GCP**, not just AWS
- **Automated evidence collection** — Boundera connects to your AWS/Azure/GCP/GitHub/Okta/Jira and pulls evidence directly
- **Continuous validation** — your KSI package is regenerated and re-validated on every change in your environment
- **Audit-ready documentation generation** — Boundera produces both the Word-format SSP and the OSCAL package from a single source of truth
- **3PAO-ready delivery** — packages are formatted exactly how assessors expect them
- **POA&M and ConMon support** — beyond initial authorization

## Why the split?

We picked this scope deliberately. The toolkit is genuinely useful — you could ship a v1 KSI package using it, given enough engineering time. But automating evidence collection across cloud accounts, keeping mappings synchronized with FedRAMP updates within 72 hours, and generating audit-grade documentation are the things that take a team of compliance and security engineers to maintain. That work is the product.

If the toolkit saves your team time, we're happy. If it tells you what the work looks like and you decide to buy rather than build, we're also happy.

## Will the commercial product reference this repo?

Yes. Boundera's product documentation cross-references this toolkit for users who want to understand the underlying KSI mapping methodology. We treat this repo as a public source of record.

## Will the toolkit's scope expand?

Probably, slowly. Likely additions in 2026:

- Azure equivalents for the KSI-IAM and KSI-MLA mappings
- GCP equivalents
- More OSCAL example variants
- Validator improvements based on issues and PRs

Unlikely additions:

- Mappings for the remaining 9 KSI families
- Automated evidence collection
- Documentation generation

If you want those, [request a demo](https://boundera.io/request-demo).

## Can I trust the mappings?

We treat the mappings here with the same care as our commercial mappings. They're authored by the same compliance and security engineers, reviewed against the FedRAMP 20x specification, and updated when the specification changes. Each mapping file includes a `last_validated` date.

That said: this is alpha software. The KSI specification itself is still evolving (Consolidated Rules finalize June 2026). Don't treat any single source — including this repo or the commercial product — as authoritative. Cross-reference [fedramp.gov](https://www.fedramp.gov/) and work with your 3PAO.

## Questions?

Open a [Discussion](https://github.com/Boundera/fedramp-20x-toolkit/discussions) or email `oss@boundera.io`.
