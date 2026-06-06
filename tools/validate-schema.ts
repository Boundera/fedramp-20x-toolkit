/**
 * validate-schema.ts
 *
 * Validates data/fedramp-rules/fedramp-consolidated-rules.json against
 * data/fedramp-rules/schemas/fedramp-consolidated-rules.schema.json.
 *
 * Per FedRAMP's AGENTS.md, schema validation MUST happen before any
 * automated analysis of the rules JSON. This script is step 0 of the
 * Atlas build pipeline.
 *
 * Exit codes:
 *   0 — validation passed
 *   1 — validation failed (details printed to stderr)
 *   2 — files missing or unparseable
 */

import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'data/fedramp-rules/fedramp-consolidated-rules.json');
const SCHEMA_PATH = path.join(ROOT, 'data/fedramp-rules/schemas/fedramp-consolidated-rules.schema.json');

function fail(code: number, msg: string): never {
  console.error(`[validate-schema] ${msg}`);
  process.exit(code);
}

if (!fs.existsSync(RULES_PATH)) {
  fail(2, `Rules JSON not found at ${RULES_PATH}. Did you run 'git submodule update --init --recursive'?`);
}
if (!fs.existsSync(SCHEMA_PATH)) {
  fail(2, `Schema not found at ${SCHEMA_PATH}. Submodule may be at wrong commit.`);
}

let rules: unknown;
let schema: unknown;
try {
  rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
} catch (e) {
  fail(2, `Rules JSON is not valid JSON: ${(e as Error).message}`);
}
try {
  schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
} catch (e) {
  fail(2, `Schema is not valid JSON: ${(e as Error).message}`);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema as object);
const ok = validate(rules);

if (!ok) {
  console.error(`[validate-schema] FAIL: ${validate.errors?.length ?? 0} errors`);
  for (const err of validate.errors ?? []) {
    console.error(`  at ${err.instancePath || '/'}: ${err.message}`);
    if (err.params) console.error(`    params: ${JSON.stringify(err.params)}`);
  }
  process.exit(1);
}

const info = (rules as any).info ?? {};
console.log(`[validate-schema] OK — ${info.title ?? 'rules'} v${info.version ?? '?'} (last_updated: ${info.last_updated ?? '?'})`);
process.exit(0);
