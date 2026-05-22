# Contributing to fedramp-20x-toolkit

Thanks for considering a contribution. This document covers what we accept, how to propose changes, and what to expect in review.

## What we accept

We actively welcome:

- **Additional AWS evidence sources** for indicators we already map (e.g., a new AWS Config managed rule that satisfies KSI-IAM-MFA)
- **Bug reports and fixes** for the `ksi-validator` CLI
- **Test cases** that cover OSCAL edge conditions, schema corner cases, or KSI structure variants
- **Documentation improvements** — typos, clarifications, better examples
- **Mappings for the same KSI families on Azure or GCP** — these become candidates for the v0.2 release

We do **not** currently accept:

- Mappings for KSI families this toolkit does not cover (AFR, CNA, CED, CMT, PIY, INR, RPL, SVC, SCR) — these are intentionally out of scope for v0.1.x
- Vendor-specific evidence sources for non-cloud-native services (e.g., self-hosted databases)
- Marketing-oriented additions

If you're unsure whether something fits, open a [GitHub Discussion](https://github.com/Boundera/fedramp-20x-toolkit/discussions) before doing the work.

## Before you start

1. Search existing [Issues](https://github.com/Boundera/fedramp-20x-toolkit/issues) and [Discussions](https://github.com/Boundera/fedramp-20x-toolkit/discussions) to avoid duplicate work.
2. For non-trivial changes, open a Discussion describing what you'd like to do and why. We'll respond within 3 business days.
3. For evidence-source additions, please verify against the FedRAMP 20x KSI specification at [fedramp.gov/docs/20x/key-security-indicators/](https://www.fedramp.gov/docs/20x/key-security-indicators/).

## Development setup

```bash
git clone https://github.com/Boundera/fedramp-20x-toolkit
cd fedramp-20x-toolkit

# Validator development
cd tools/ksi-validator
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Pull request checklist

Before opening a PR:

- [ ] Tests pass locally (`pytest` from `tools/ksi-validator/`)
- [ ] YAML files lint cleanly (`yamllint ksi-mappings/`)
- [ ] If you added or changed a mapping, update the corresponding README
- [ ] If you added a new evidence source, cite the AWS documentation URL in a code comment
- [ ] Commit messages are descriptive (we use [Conventional Commits](https://www.conventionalcommits.org/))
- [ ] PR description references the issue or discussion it addresses

## Mapping conventions

When adding or modifying a YAML mapping:

- Use snake_case for keys
- Reference AWS services by their official names (e.g., "AWS Config" not "Config", "Amazon CloudWatch" on first use)
- Cite AWS Config managed rule names by their exact identifier (e.g., `ACCESS_KEYS_ROTATED`)
- For Security Hub controls, cite both the standard (e.g., "AWS Foundational Security Best Practices") and the control ID
- Include a `last_validated` date in YYYY-MM-DD format so reviewers know when the citation was last checked

## Code style

- Python: `ruff` for linting and formatting (config in `pyproject.toml`)
- YAML: 2-space indentation; sequences indented under their key
- Markdown: 80-character line length where practical; reference-style links for repeated URLs

## Review process

- A maintainer will respond to your PR within 3 business days
- Expect 1–2 rounds of review
- For evidence-source additions, a Boundera engineer will sanity-check the citation against AWS documentation
- Once approved, a maintainer will merge with a squash commit

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions

Open a [Discussion](https://github.com/Boundera/fedramp-20x-toolkit/discussions) or email `oss@boundera.io`.
