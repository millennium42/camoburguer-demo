const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'CAMOBURGUER_DOCS.md');

let out = '# Documentação Central - Camoburguer\n\n';
out += 'Este documento contém toda a especificação, arquitetura, rotinas operacionais e relatórios de auditoria do sistema Camoburguer Demo.\n\n---\n\n';

for (const f of files) {
  const content = fs.readFileSync(path.join(docsDir, f), 'utf8');
  out += '## ' + f.replace('.md', '').toUpperCase().replace(/-/g, ' ') + '\n\n';
  
  // Demote existing headings by 1 level to fit under the new section heading
  const adjustedContent = content.replace(/^# /gm, '### ').replace(/^## /gm, '#### ');
  
  out += adjustedContent + '\n\n---\n\n';
}

fs.writeFileSync(path.join(docsDir, 'CAMOBURGUER_DOCS.md'), out);
console.log('Documentação consolidada com sucesso.');
