/**
 * list-missing.ts
 *
 * Lists every KSI in the upstream rules that doesn't have a corresponding
 * enrichment file yet. Useful for prioritizing what to write next.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'data/fedramp-rules/fedramp-consolidated-rules.json');
const KSI_DIR = path.join(ROOT, 'enrichments/ksi');

if (!fs.existsSync(RULES_PATH)) {
  console.error(`[list-missing] Rules JSON missing. Run 'git submodule update --init --recursive'.`);
  process.exit(1);
}

const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
const existing = new Set<string>();
if (fs.existsSync(KSI_DIR)) {
  for (const f of fs.readdirSync(KSI_DIR)) {
    if (f.endsWith('.md')) existing.add(f.replace(/\.md$/, '').toLowerCase());
  }
}

const missing: { id: string; name: string; family: string }[] = [];
for (const family of Object.keys(rules.KSI ?? {})) {
  const indicators = rules.KSI[family]?.indicators;
  if (!indicators || typeof indicators !== 'object') continue;
  for (const fullId of Object.keys(indicators)) {
    // KSI-MLA-EVC -> mla-evc
    const m = /^KSI-([A-Z]{3})-([A-Z0-9]+)$/.exec(fullId);
    if (!m) continue;
    const slug = `${m[1].toLowerCase()}-${m[2].toLowerCase()}`;
    if (existing.has(slug)) continue;
    missing.push({
      id: fullId,
      name: indicators[fullId]?.name ?? '',
      family,
    });
  }
}

if (missing.length === 0) {
  console.log('[list-missing] All KSIs have enrichments. 🎉');
  process.exit(0);
}

console.log(`[list-missing] ${missing.length} KSI(s) need enrichments:\n`);
const byFamily = new Map<string, typeof missing>();
for (const m of missing) {
  if (!byFamily.has(m.family)) byFamily.set(m.family, []);
  byFamily.get(m.family)!.push(m);
}
for (const [family, items] of [...byFamily.entries()].sort()) {
  console.log(`  ${family}:`);
  for (const m of items) console.log(`    ${m.id.padEnd(20)} ${m.name}`);
}
console.log(`\nScaffold one with:  pnpm scaffold ksi <FAMILY> <KEY>`);
