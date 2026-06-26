import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SENSITIVE_PATTERNS = [
  /NEXT_PUBLIC_.*SECRET/i,
  /NEXT_PUBLIC_.*(?<!MAPBOX_)KEY/i,
  /NEXT_PUBLIC_DATABASE/i,
  /NEXT_PUBLIC_.*PASSWORD/i,
  /NEXT_PUBLIC_MERCHANT/i,
];

function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, exts));
    } else if (exts.some(e => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function audit() {
  const files = findFiles('src', ['.ts', '.tsx', '.js', '.jsx']);
  let violations = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`VIOLATION: ${file} contient une variable sensible en NEXT_PUBLIC_`);
        violations++;
      }
    }
  }

  if (violations > 0) {
    console.error(`\n${violations} violation(s) detectee(s). Build bloque.`);
    process.exit(1);
  }

  console.log('OK: Aucune variable sensible exposee en NEXT_PUBLIC_');
}

try {
  audit();
} catch (e) {
  console.error(e);
  process.exit(1);
}
