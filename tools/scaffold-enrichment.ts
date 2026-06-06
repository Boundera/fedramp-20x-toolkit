/**
 * scaffold-enrichment.ts
 *
 * Generates a starter enrichment file + Terraform module skeleton for a
 * given KSI / FRR / FRD ID. Reads the upstream entity so frontmatter is
 * pre-filled (current upstream version, family code, etc.).
 *
 * Usage:
 *   tsx tools/scaffold-enrichment.ts ksi MLA EVC
 *   tsx tools/scaffold-enrichment.ts frr VDR CSO 123
 *   tsx tools/scaffold-enrichment.ts frd OSCAL
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'data/fedramp-rules/fedramp-consolidated-rules.json');
const RULES_DIR = path.join(ROOT, 'data/fedramp-rules');

function getUpstreamCommit(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: RULES_DIR }).toString().trim();
    return sha;
  } catch {
    return 'unknown';
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fail(msg: string): never {
  console.error(`[scaffold] ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2).map(a => a.trim());
if (args.length < 2) {
  fail(`Usage:
  tsx tools/scaffold-enrichment.ts ksi <FAMILY> <KEY>
  tsx tools/scaffold-enrichment.ts frr <PROCESS> <SUBSET> <KEY>
  tsx tools/scaffold-enrichment.ts frd <TERM>`);
}

const kind = args[0].toLowerCase();
if (!['ksi', 'frr', 'frd'].includes(kind)) fail(`Unknown kind: ${kind}`);

if (!fs.existsSync(RULES_PATH)) {
  fail(`Rules JSON missing. Run 'git submodule update --init --recursive'.`);
}
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
const commit = getUpstreamCommit();
const reviewedVersion = `${todayISO()}-${commit}`;

const reviewer = process.env.USER_EMAIL || process.env.USER || 'YOUR_EMAIL';
const authorName = process.env.USER_NAME || process.env.USER || 'YOUR_NAME';
const authorGithub = process.env.USER_GITHUB || 'YOUR_GITHUB_HANDLE';

if (kind === 'ksi') {
  const [, family, key] = args;
  if (!family || !key) fail('ksi requires <FAMILY> <KEY>, e.g. MLA EVC');
  const FAMILY = family.toUpperCase();
  const KEY = key.toUpperCase();
  const id = `KSI-${FAMILY}-${KEY}`;
  const filename = `${FAMILY.toLowerCase()}-${KEY.toLowerCase()}.md`;

  const indicator = rules.KSI?.[FAMILY]?.indicators?.[id];
  if (!indicator) fail(`KSI ${id} not found in upstream rules JSON. Check: rules.KSI.${FAMILY}.indicators["${id}"]`);

  const enrichmentPath = path.join(ROOT, 'enrichments/ksi', filename);
  const implPath = path.join(ROOT, 'implementations/aws', `ksi-${FAMILY.toLowerCase()}-${KEY.toLowerCase()}`);

  if (fs.existsSync(enrichmentPath)) fail(`${enrichmentPath} already exists.`);

  const content = `---
id: ${id}
kind: ksi
family: ${FAMILY}
last_reviewed_upstream_version: "${reviewedVersion}"
last_reviewed_by: ${reviewer}
last_reviewed_on: "${todayISO()}"
confidence: placeholder

authors:
  - name: ${authorName}
    role: TODO
    github: ${authorGithub}

implementations:
  aws:
    status: placeholder
  azure:
    status: placeholder
  gcp:
    status: placeholder

sme_reviewed: false

related_ksis: []
---

## Plain English

<TODO: 2-4 sentences explaining what this KSI means in everyday terms. Do not duplicate the official statement — describe what a CSP engineer needs to *do* to meet it.>

## Implementation: AWS

<TODO: AWS architecture, services, caveats. Reference the Terraform module at implementations/aws/ksi-${FAMILY.toLowerCase()}-${KEY.toLowerCase()}/ once you've built it.>

## Evidence example

<TODO: Annotated OSCAL JSON snippet showing what passing evidence for ${id} looks like. Highlight what the 3PAO will check first.>

## Common gaps

<TODO: 3-5 frequent 3PAO findings drawn from real engagements. Each: what went wrong, why it failed, how to detect, how to fix.>
`;

  fs.mkdirSync(path.dirname(enrichmentPath), { recursive: true });
  fs.writeFileSync(enrichmentPath, content);
  console.log(`[scaffold] Created ${path.relative(ROOT, enrichmentPath)}`);

  // Terraform skeleton
  fs.mkdirSync(implPath, { recursive: true });
  const tfMain = `# implementations/aws/ksi-${FAMILY.toLowerCase()}-${KEY.toLowerCase()}/main.tf
#
# Boundera reference implementation for ${id}.
# This module is self-contained — \`terraform plan\` should work in a fresh account.
#
# See ../README.md for what this deploys and the caveats.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# TODO: implement
`;
  const tfVars = `# implementations/aws/ksi-${FAMILY.toLowerCase()}-${KEY.toLowerCase()}/variables.tf
variable "boundary_regions" {
  description = "AWS regions inside the FedRAMP authorization boundary."
  type        = list(string)
  default     = ["us-east-1"]
}
`;
  const tfReadme = `# AWS implementation: ${id}

Boundera reference Terraform module for ${id}.

## What this deploys

<TODO>

## How to run

\`\`\`bash
terraform init
terraform plan
\`\`\`

## Caveats

<TODO>

## Evidence produced

<TODO: which AWS APIs / logs / Config rule results this module produces, and how they map to ${id}.>
`;
  fs.writeFileSync(path.join(implPath, 'main.tf'), tfMain);
  fs.writeFileSync(path.join(implPath, 'variables.tf'), tfVars);
  fs.writeFileSync(path.join(implPath, 'README.md'), tfReadme);
  console.log(`[scaffold] Created ${path.relative(ROOT, implPath)}/{main.tf,variables.tf,README.md}`);

  console.log(`\nNext steps:`);
  console.log(`  1. Edit ${path.relative(ROOT, enrichmentPath)}`);
  console.log(`  2. Build the Terraform in ${path.relative(ROOT, implPath)}/`);
  console.log(`  3. Bump confidence from 'placeholder' to 'high' when done.`);
  console.log(`  4. Run 'pnpm validate' before committing.`);
  process.exit(0);
}

if (kind === 'frr') {
  fail(`FRR scaffolder not yet implemented. PRs welcome.`);
}

if (kind === 'frd') {
  fail(`FRD scaffolder not yet implemented. PRs welcome.`);
}
