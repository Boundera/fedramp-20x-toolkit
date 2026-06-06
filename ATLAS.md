# Atlas pipeline

The toolkit feeds [boundera.io/fedramp-20x](https://boundera.io/fedramp-20x) — Boundera's open implementation-first reference for FedRAMP 20x. This file documents the pipeline that turns the structured rules + enrichments in this repo into per-KSI web pages.

## Pieces

```
fedramp-20x-toolkit/
├── data/
│   └── fedramp-rules/         git submodule of github.com/FedRAMP/rules
│                              (the canonical 2026 Consolidated Rules JSON)
├── enrichments/
│   ├── ksi/                   one markdown per KSI: Boundera's added value
│   ├── frr/                   one markdown per FRR requirement
│   └── frd/                   one markdown per FRD term (glossary)
├── implementations/
│   └── aws/                   one Terraform module per KSI (self-contained,
│                              plan-able, deploys evidence-producing infra)
├── tools/
│   ├── schemas/               JSON schema for enrichment frontmatter
│   ├── validate-schema.ts     validates upstream rules JSON against its schema
│   ├── validate-enrichments.ts validates frontmatter, sections, ID matching
│   ├── validate-skew.ts       detects enrichments stale vs upstream
│   ├── scaffold-enrichment.ts generates a starter enrichment + Terraform skel
│   └── list-missing.ts        prints KSIs that don't have enrichments yet
└── .github/workflows/
    ├── sync-upstream.yml      nightly bump of FedRAMP/rules submodule
    └── validate.yml           runs validators on every PR
```

`ksi-mappings/` (the older AWS evidence mappings) and the Atlas pipeline coexist. They serve different audiences: `ksi-mappings/` is reference data for engineers reading the repo directly; `enrichments/` powers the rendered Atlas at boundera.io.

## Setup (once)

```bash
git clone https://github.com/Boundera/fedramp-20x-toolkit.git
cd fedramp-20x-toolkit
git submodule update --init --recursive
pnpm install
pnpm validate
```

## Writing a new enrichment

```bash
# Pick a KSI that doesn't have an enrichment yet
pnpm list:missing

# Scaffold it
USER_EMAIL=you@example.com pnpm scaffold ksi MLA CMT
# → creates enrichments/ksi/mla-cmt.md
# → creates implementations/aws/ksi-mla-cmt/main.tf etc.

# Edit the files. Bump frontmatter `confidence` from 'placeholder' to 'high' when done.

# Validate before committing
pnpm validate
```

## Upstream sync

Every night a GitHub Action checks `FedRAMP/rules` for new commits. If anything changed:

1. Submodule pin is bumped
2. Schema validation runs
3. If validation passes → a PR titled `Bump FedRAMP/rules to <sha>` is opened
4. If validation fails → an issue is opened describing the breakage

A human reviews the diff and merges the PR. The skew detector flags any enrichments whose `last_reviewed_upstream_version` references an outdated upstream commit.

## Source of truth

Per `FedRAMP/rules/AGENTS.md`, the source of truth for FedRAMP 2026 Consolidated Rules is:

- `data/fedramp-rules/fedramp-consolidated-rules.json`
- `data/fedramp-rules/schemas/fedramp-consolidated-rules.schema.json`

This toolkit never modifies those files. We pull them as a read-only submodule. All Boundera-authored content sits in `enrichments/` and `implementations/`. The Atlas web pages combine the two at build time.

## What this powers

`Boundera/fedramp-20x-toolkit` is consumed as a submodule by `chukyjack/FedRampGPT/website/data/toolkit/`. When the website builds (Docker → EC2), it reads:

- `data/fedramp-rules/fedramp-consolidated-rules.json` → canonical KSI text
- `enrichments/ksi/*.md` → Boundera's plain-English + AWS impl + common gaps
- `implementations/aws/*/main.tf` → Terraform shown alongside the page

… and generates static pages at `boundera.io/fedramp-20x/ksi/[family]/[id]`.

The rendering layer (`build-atlas.ts`, page templates, components) lives in the website repo, not here.
