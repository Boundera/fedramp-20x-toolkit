/**
 * validate-enrichments.ts
 *
 * Validates every file in enrichments/{ksi,frr,frd}/ for:
 *   1. Valid YAML frontmatter
 *   2. Frontmatter matches tools/schemas/ksi-enrichment.schema.json
 *   3. Filename matches the `id` field
 *   4. The `id` exists in data/fedramp-rules/fedramp-consolidated-rules.json
 *   5. Required H2 body sections are present for the entity's kind + confidence
 *   6. No forbidden fields (statement, controls, varies_by_class, updated)
 *      — those belong in upstream JSON, never duplicated in enrichments.
 *
 * Exit codes:
 *   0 — all enrichments valid
 *   1 — one or more failures
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'data/fedramp-rules/fedramp-consolidated-rules.json');
const SCHEMA_PATH = path.join(ROOT, 'tools/schemas/ksi-enrichment.schema.json');
const KSI_DIR = path.join(ROOT, 'enrichments/ksi');
const FRR_DIR = path.join(ROOT, 'enrichments/frr');
const FRD_DIR = path.join(ROOT, 'enrichments/frd');

const REQUIRED_H2_BY_KIND_AND_CONFIDENCE: Record<string, Record<string, string[]>> = {
  ksi: {
    high:        ['Plain English', 'Evidence example', 'Common gaps'],
    medium:      ['Plain English'],
    low:         ['Plain English'],
    placeholder: [],
  },
  frr: {
    high: ['Plain English'], medium: ['Plain English'], low: ['Plain English'], placeholder: [],
  },
  frd: {
    high: ['Plain English'], medium: ['Plain English'], low: ['Plain English'], placeholder: [],
  },
};

const FORBIDDEN_FRONTMATTER_FIELDS = ['statement', 'controls', 'varies_by_class', 'updated'];

interface Failure { file: string; reason: string; }
const failures: Failure[] = [];

function loadRulesIndex(): { ksis: Set<string>; frrs: Set<string>; frds: Set<string> } {
  if (!fs.existsSync(RULES_PATH)) {
    console.error(`[validate-enrichments] Rules JSON missing. Run 'git submodule update --init --recursive'.`);
    process.exit(1);
  }
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));

  // KSI shape: rules.KSI[FAMILY].indicators[FULL_ID]
  //   e.g. rules.KSI.MLA.indicators["KSI-MLA-EVC"]
  const ksis = new Set<string>();
  for (const family of Object.keys(rules.KSI ?? {})) {
    const indicators = rules.KSI[family]?.indicators;
    if (!indicators || typeof indicators !== 'object') continue;
    for (const fullId of Object.keys(indicators)) {
      ksis.add(fullId);
    }
  }

  // FRR shape: rules.FRR[PROCESS].data[applicability][SUBSET][FULL_ID]
  //   e.g. rules.FRR.AGU.data.all.AGC["AGU-AGC-AIP"]
  const frrs = new Set<string>();
  for (const process of Object.keys(rules.FRR ?? {})) {
    const data = rules.FRR[process]?.data;
    if (!data || typeof data !== 'object') continue;
    for (const bucket of ['all', '20x', 'rev5'] as const) {
      const applicability = data[bucket];
      if (!applicability || typeof applicability !== 'object') continue;
      for (const subset of Object.keys(applicability)) {
        const subsetReqs = applicability[subset];
        if (!subsetReqs || typeof subsetReqs !== 'object') continue;
        for (const fullId of Object.keys(subsetReqs)) {
          frrs.add(fullId);
        }
      }
    }
  }

  // FRD shape: rules.FRD.data[applicability][FULL_ID]
  //   e.g. rules.FRD.data.all["FRD-ACV"]
  const frds = new Set<string>();
  const frdData = rules.FRD?.data;
  if (frdData && typeof frdData === 'object') {
    for (const bucket of ['all', '20x', 'rev5'] as const) {
      const defs = frdData[bucket];
      if (!defs || typeof defs !== 'object') continue;
      for (const fullId of Object.keys(defs)) frds.add(fullId);
    }
  }

  return { ksis, frrs, frds };
}

function extractH2Headers(body: string): string[] {
  const headers: string[] = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) headers.push(m[1].trim());
  }
  return headers;
}

function expectedFilenameForId(id: string, kind: string): string {
  if (kind === 'ksi') {
    const m = /^KSI-([A-Z]{3})-([A-Z0-9]+)$/.exec(id);
    if (!m) return '';
    return `${m[1].toLowerCase()}-${m[2].toLowerCase()}.md`;
  }
  if (kind === 'frr') return id.toLowerCase() + '.md';
  if (kind === 'frd') return id.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '.md';
  return '';
}

function validateOne(file: string, schema: object, rulesIndex: ReturnType<typeof loadRulesIndex>, ajv: Ajv2020) {
  const raw = fs.readFileSync(file, 'utf-8');
  let parsed;
  try {
    parsed = matter(raw);
  } catch (e) {
    failures.push({ file, reason: `Frontmatter not parseable: ${(e as Error).message}` });
    return;
  }
  const fm: Record<string, any> = parsed.data;
  // YAML auto-parses unquoted ISO dates into Date objects. Normalize back to
  // string so the schema (which expects type: string with format: date) passes.
  for (const key of ["last_reviewed_on"]) {
    if (fm[key] instanceof Date) fm[key] = fm[key].toISOString().slice(0, 10);
  }
  const body = parsed.content;

  // 1. Forbidden fields
  for (const forbidden of FORBIDDEN_FRONTMATTER_FIELDS) {
    if (forbidden in fm) {
      failures.push({ file, reason: `Forbidden frontmatter field '${forbidden}' — that data comes from upstream JSON.` });
    }
  }

  // 2. Schema validation
  const validate = ajv.compile(schema);
  const ok = validate(fm);
  if (!ok) {
    for (const err of validate.errors ?? []) {
      failures.push({ file, reason: `frontmatter schema: ${err.instancePath || '/'}: ${err.message}` });
    }
    return;
  }

  // 3. Filename matches id
  const expectedFilename = expectedFilenameForId(fm.id, fm.kind);
  if (expectedFilename && path.basename(file) !== expectedFilename) {
    failures.push({ file, reason: `Filename should be '${expectedFilename}' for id '${fm.id}'` });
  }

  // 4. ID exists in upstream
  const lookupSet = fm.kind === 'ksi' ? rulesIndex.ksis : fm.kind === 'frr' ? rulesIndex.frrs : rulesIndex.frds;
  if (!lookupSet.has(fm.id)) {
    failures.push({ file, reason: `id '${fm.id}' not found in upstream FedRAMP/rules data` });
  }

  // 5. Required H2 sections
  const required = REQUIRED_H2_BY_KIND_AND_CONFIDENCE[fm.kind]?.[fm.confidence] ?? [];
  const headers = extractH2Headers(body);
  for (const requiredH2 of required) {
    const found = headers.some(h => h.toLowerCase() === requiredH2.toLowerCase());
    if (!found) {
      failures.push({ file, reason: `Missing required H2 section '## ${requiredH2}'` });
    }
  }
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`[validate-enrichments] Schema missing at ${SCHEMA_PATH}`);
    process.exit(1);
  }
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const rulesIndex = loadRulesIndex();

  const dirs = [KSI_DIR, FRR_DIR, FRD_DIR];
  let count = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue;
      const filePath = path.join(dir, entry);
      validateOne(filePath, schema, rulesIndex, ajv);
      count++;
    }
  }

  if (failures.length > 0) {
    console.error(`[validate-enrichments] FAIL — ${failures.length} error(s) across ${count} file(s):`);
    for (const f of failures) {
      console.error(`  ${path.relative(ROOT, f.file)}: ${f.reason}`);
    }
    process.exit(1);
  }

  console.log(`[validate-enrichments] OK — ${count} enrichment(s) validated`);
}

main();
