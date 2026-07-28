import fs from 'fs';

let content = fs.readFileSync('packages/shared-types/index.js', 'utf8');
content = content.replace(
  '  "mixed"',
  '  "mixed",\n  "payment_reconciliation_required"'
);
fs.writeFileSync('packages/shared-types/index.js', content);
