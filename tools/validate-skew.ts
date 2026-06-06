/**
 * validate-skew.ts
 *
 * Compares each enrichment's last_reviewed_upstream_version against the
 * current submodule HEAD of data/fedramp-rules. Detects drift.
 *
 * Modes:
 *   - default        warn on skew > 14 days, never fail
 *   - --strict       fail on any statement-text change since reviewed version
 *   - --max-age-days <N>   warn threshold (default 14)
 *
 * Exit codes:
 *   0 — no drift (or only acceptable warnings)
 *   1 — drift detected in strict mode
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const RULES_DIR = path.join(ROOT, 'data/fedramp-rules');
const KSI_DIR = path.join(ROOT, 'enrichments/ksi');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const maxAgeDays = (() => {
  const i = args.indexOf('--max-age-days');
  if (i === -1) return 14;
  return parseInt(args[i + 1] ?? '14', 10);
})();

function getCurrentSubmoduleSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: RULES_DIR }).toString().trim();
  } catch {
    return 'unknown';
  }
}

interface SkewReport {
  file: string;
  reviewedVersion: string;
  currentSha: string;
  ageDays: number;
}

const skews: SkewReport[] = [];
const currentSha = getCurrentSubmoduleSha();
const today = new Date();

if (!fs.existsSync(KSI_DIR)) {
  console.log('[validate-skew] No enrichments directory yet — nothing to check.');
  process.exit(0);
}

for (const entry of fs.readdirSync(KSI_DIR)) {
  if (!entry.endsWith('.md')) continue;
  const file = path.join(KSI_DIR, entry);
  const fm = matter(fs.readFileSync(file, 'utf-8')).data;
  const reviewedVersion: string = fm.last_reviewed_upstream_version || '';
  const m = /^(\d{4}-\d{2}-\d{2})-([0-9a-f]+)$/.exec(reviewedVersion);
  if (!m) continue;
  const reviewedDate = new Date(m[1]);
  const reviewedSha = m[2];
  const ageDays = Math.floor((today.getTime() - reviewedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (reviewedSha === currentSha) continue;
  skews.push({ file: path.relative(ROOT, file), reviewedVersion, currentSha, ageDays });
}

if (skews.length === 0) {
  console.log(`[validate-skew] OK — all enrichments reviewed against current submodule (${currentSha})`);
  process.exit(0);
}

const stale = skews.filter(s => s.ageDays > maxAgeDays);
const fresh = skews.filter(s => s.ageDays <= maxAgeDays);

if (fresh.length > 0) {
  console.log(`[validate-skew] INFO — ${fresh.length} enrichment(s) point at older submodule but are < ${maxAgeDays} days old. No action needed yet.`);
}

if (stale.length > 0) {
  console.warn(`[validate-skew] WARN — ${stale.length} enrichment(s) are stale (> ${maxAgeDays} days):`);
  for (const s of stale) {
    console.warn(`  ${s.file}: reviewed ${s.reviewedVersion}, current is ${s.currentSha} (${s.ageDays} days ago)`);
  }
}

if (strict && skews.length > 0) {
  console.error('[validate-skew] FAIL — strict mode and drift detected.');
  process.exit(1);
}

process.exit(0);
