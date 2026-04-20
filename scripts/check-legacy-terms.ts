/**
 * Fails when legacy wordings slip back into the web app source.
 * See apps/web/src/config/terms.ts for the approved vocabulary.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');

const LEGACY_PATTERNS: ReadonlyArray<{ term: string; suggestion: string }> = [
  { term: '租金', suggestion: '过路费' },
  { term: '业主', suggestion: '房主' },
  { term: '破产', suggestion: '钱用光了' },
  { term: '地产', suggestion: '地' },
  { term: '地皮', suggestion: '地' },
  { term: '结算', suggestion: '算钱' },
  { term: '学习格', suggestion: '学习星' },
  { term: '通用题库', suggestion: '挑战题' },
  { term: '购置', suggestion: '买下这块地' },
];

const SCAN_ROOT = join(ROOT, 'apps/web/src');

const EXCLUDE_DIR_NAMES = new Set(['__tests__', 'node_modules', 'data']);

const isExcludedFile = (absPath: string): boolean => {
  const rel = relative(ROOT, absPath);
  return (
    rel === 'apps/web/src/config/terms.ts' ||
    rel.endsWith('.d.ts') ||
    rel.includes('__tests__')
  );
};

const walk = (dir: string, acc: string[]): void => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry)) continue;
      walk(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (isExcludedFile(full)) continue;
    acc.push(full);
  }
};

type Hit = {
  file: string;
  line: number;
  column: number;
  term: string;
  suggestion: string;
  snippet: string;
};

const scan = (): Hit[] => {
  const files: string[] = [];
  walk(SCAN_ROOT, files);
  const hits: Hit[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((lineText, lineIdx) => {
      for (const { term, suggestion } of LEGACY_PATTERNS) {
        let idx = lineText.indexOf(term);
        while (idx !== -1) {
          hits.push({
            file: relative(ROOT, file),
            line: lineIdx + 1,
            column: idx + 1,
            term,
            suggestion,
            snippet: lineText.trim(),
          });
          idx = lineText.indexOf(term, idx + term.length);
        }
      }
    });
  }
  return hits;
};

const hits = scan();
if (hits.length === 0) {
  console.log('[check-legacy-terms] OK — no legacy wordings found.');
  process.exit(0);
}

console.error(`[check-legacy-terms] Found ${hits.length} legacy wording(s):`);
for (const hit of hits) {
  console.error(
    `  ${hit.file}:${hit.line}:${hit.column}  "${hit.term}" → 应改为 "${hit.suggestion}"`,
  );
  console.error(`    ${hit.snippet}`);
}
process.exit(1);
