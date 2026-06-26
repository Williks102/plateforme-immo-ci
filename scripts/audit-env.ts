import { readFileSync } from 'fs';
import { glob } from 'glob';

const SENSITIVE_PATTERNS = [
  /NEXT_PUBLIC_.*SECRET/i,
  /NEXT_PUBLIC_.*(?<!MAPBOX_)KEY/i,
  /NEXT_PUBLIC_DATABASE/i,
  /NEXT_PUBLIC_.*PASSWORD/i,
  /NEXT_PUBLIC_MERCHANT/i,
];

async function audit() {
  const files = await glob('src/**/*.{ts,tsx,js,jsx}');
  let violations = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`🚨 VIOLATION: ${file} contient une variable sensible en NEXT_PUBLIC_`);
        violations++;
      }
    }
  }

  if (violations > 0) {
    console.error(`\n${violations} violation(s) détectée(s). Build bloqué.`);
    process.exit(1);
  }

  console.log('✅ Aucune variable sensible exposée en NEXT_PUBLIC_');
}

audit().catch(e => { console.error(e); process.exit(1); });
